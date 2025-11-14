import { GoogleGenerativeAI } from '@google/generative-ai'

// Request throttling to prevent excessive API calls
const requestThrottle = new Map<string, number>()
const THROTTLE_DELAY = 2000 // 2 seconds between requests for same image

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''
)

// Model selection: allow env override, but default to a single high-quality model
// You can set NEXT_PUBLIC_GEMINI_MODEL to a single model to override the default
const envModelPreference = (process.env.NEXT_PUBLIC_GEMINI_MODEL || '').trim()
const configuredModels = envModelPreference
  ? envModelPreference.split(',').map(m => m.trim()).filter(Boolean)
  : []

// Default to Gemini 2.5 Pro (no graceful degradation)
const defaultModelPreference = ['gemini-2.5-pro']

// Always use only the first configured model to avoid fallback chains
const modelPreference = configuredModels.length > 0
  ? [configuredModels[0]]
  : defaultModelPreference

type InlineImageData = {
  inlineData: {
    mimeType: string
    data: string
  }
}

const isAbortError = (error: unknown): boolean => {
  if (error instanceof Error) {
    return error.name === 'AbortError' || error.message === 'Request aborted'
  }
  if (typeof DOMException !== 'undefined' && error instanceof DOMException) {
    return error.name === 'AbortError'
  }
  return false
}

function getModelInstance(modelName: string) {
  return genAI.getGenerativeModel({ model: modelName })
}

// Helper function to execute the preferred model (no fallback chain)
async function generateContentWithFallback(prompt: string, imageData: InlineImageData, abortSignal?: AbortSignal) {
  if (abortSignal?.aborted) {
    const abortError = new Error('Request aborted')
    abortError.name = 'AbortError'
    throw abortError
  }

  let lastError: unknown = null

  for (const modelName of modelPreference) {
    if (abortSignal?.aborted) {
      const abortError = new Error('Request aborted')
      abortError.name = 'AbortError'
      throw abortError
    }

    try {
      console.log(`Using Gemini model: ${modelName}`)
      const model = getModelInstance(modelName)
      const result = await model.generateContent([prompt, imageData])
      console.log(`✅ Gemini model completed: ${modelName}`)
      return result
    } catch (error: unknown) {
      lastError = error
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`Gemini model failed: ${modelName} -> ${message}`)
      // Continue to next configured model (if any; typically none)
      continue
    }
  }

  console.error('Gemini model failed and no fallback models are configured')
  if (lastError instanceof Error) {
    throw lastError
  }
  throw new Error('All Gemini models failed')
}

export interface UrinalysisResult {
  rbc: { count: string; unit: string; morphology: string; notes: string; status: 'normal' | 'abnormal' | 'critical' }
  wbc: { count: string; unit: string; morphology: string; notes: string; status: 'normal' | 'abnormal' | 'critical' }
  epithelial_cells: { count: string; unit: string; morphology: string; notes: string; status: 'normal' | 'abnormal' | 'critical' }
  crystals: { count: string; unit: string; morphology: string; notes: string; status: 'normal' | 'abnormal' | 'critical' }
  casts: { count: string; unit: string; morphology: string; notes: string; status: 'normal' | 'abnormal' | 'critical' }
  bacteria: { count: string; unit: string; morphology: string; notes: string; status: 'normal' | 'abnormal' | 'critical' }
  yeast: { count: string; unit: string; morphology: string; notes: string; status: 'normal' | 'abnormal' | 'critical' }
  mucus: { count: string; unit: string; morphology: string; notes: string; status: 'normal' | 'abnormal' | 'critical' }
  sperm: { count: string; unit: string; morphology: string; notes: string; status: 'normal' | 'abnormal' | 'critical' }
  parasites: { count: string; unit: string; morphology: string; notes: string; status: 'normal' | 'abnormal' | 'critical' }
  overall_accuracy: number
  summary: string
}

export interface LPFSedimentDetection {
  epithelial_cells: number
  mucus_threads: number
  casts: number
  squamous_epithelial: number
  abnormal_crystals: number
  confidence: number
  analysis_notes: string
}

export interface HPFSedimentDetection {
  rbc: number
  wbc: number
  epithelial_cells: number
  crystals: number
  bacteria: number
  yeast: number
  sperm: number
  parasites: number
  confidence: number
  analysis_notes: string
}

export interface YOLOEnhancedUrinalysisResult extends UrinalysisResult {
  yolo_detections?: {
    predictions: Array<{
      x: number
      y: number
      width: number
      height: number
      confidence: number
      class: string
      class_id: number
      detection_id: string
    }>
    summary: {
      total_detections: number
      by_class: Record<string, number>
    }
  }
}

export async function analyzeUrinalysisImage(imageFile: File, abortSignal?: AbortSignal): Promise<UrinalysisResult> {
  try {
    // Convert image to base64
    const base64Image = await fileToBase64(imageFile)
    
    // Create the prompt for urinalysis analysis
    const prompt = `You are acting as a board-certified medical laboratory technologist. Examine the supplied urine microscopy image thoroughly before responding.

1. Perform a systematic scan of the entire field of view: start in the upper left quadrant and inspect each area sequentially, moving left-to-right and top-to-bottom to ensure no region is skipped.
2. Count every discrete structure that matches the sediment types listed below. Treat overlapping or clustered elements as separate counts when their borders are distinguishable.
3. Evaluate morphology, provide concise clinical notes, and classify status as "normal", "abnormal", or "critical" based strictly on laboratory relevance. Avoid speculation; if a structure is not present, set count to "0" and describe as "None observed".
4. Return the final answer as VALID JSON only, exactly matching the schema shown. Do not include commentary outside the JSON block.

Use this JSON template (replace the example values with your findings):
{
  "rbc": {"count": "0-2", "unit": "/HPF", "morphology": "Normal", "notes": "No significant findings", "status": "normal"},
  "wbc": {"count": "0-5", "unit": "/HPF", "morphology": "Normal", "notes": "Within normal limits", "status": "normal"},
  "epithelial_cells": {"count": "0-3", "unit": "/HPF", "morphology": "Normal", "notes": "Squamous epithelial cells present", "status": "normal"},
  "crystals": {"count": "0", "unit": "/HPF", "morphology": "None", "notes": "No crystals observed", "status": "normal"},
  "casts": {"count": "0", "unit": "/LPF", "morphology": "None", "notes": "No casts present", "status": "normal"},
  "bacteria": {"count": "0", "unit": "/HPF", "morphology": "None", "notes": "No bacteria observed", "status": "normal"},
  "yeast": {"count": "0", "unit": "/HPF", "morphology": "None", "notes": "No yeast cells", "status": "normal"},
  "mucus": {"count": "0", "unit": "/LPF", "morphology": "None", "notes": "No mucus threads", "status": "normal"},
  "sperm": {"count": "0", "unit": "/HPF", "morphology": "None", "notes": "No spermatozoa", "status": "normal"},
  "parasites": {"count": "0", "unit": "/HPF", "morphology": "None", "notes": "No parasites", "status": "normal"},
  "overall_accuracy": 95,
  "summary": "Normal urinalysis findings with no significant abnormalities detected."
}

Guidance for recognition (use as visual references only):
- RBC: small, round, biconcave cells, typically 6–8 μm
- WBC: larger cells (10–15 μm) with prominent nuclei
- Epithelial Cells: round or oval cells with nuclei; various sizes
- Crystals: distinct crystal formations (e.g., calcium oxalate, uric acid) – count each crystal separately
- Bacteria: tiny rod-shaped or spherical organisms (1–3 μm)
- Yeast: oval or round fungal cells, often budding
- Sperm: spermatozoa with head and tail structures
- Parasites: parasitic organisms or eggs
- Mucus: long, thin, translucent strands
- Casts: cylindrical structures (hyaline, granular, cellular)
- Squamous Epithelial: large, flat cells with irregular borders
- Abnormal Crystals: unusual crystal forms (non-calcium oxalate standard)

Ensure all numeric values remain strings as shown in the template.`

    // Generate content with image using fallback mechanism
    const result = await generateContentWithFallback(prompt, {
      inlineData: {
        mimeType: imageFile.type,
        data: base64Image.split(',')[1] // Remove data:image/...;base64, prefix
      }
    }, abortSignal)

    const response = await result.response
    const text = response.text()
    
    // Extract JSON from response - handle various formats
    let jsonText = text.trim()
    
    // Remove markdown code blocks
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }
    
    // Look for JSON object in the text (handle cases where AI adds explanatory text)
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      jsonText = jsonMatch[0]
    }
    
    // Parse JSON response
    const analysis = JSON.parse(jsonText) as UrinalysisResult
    
    return analysis
  } catch (error) {
    console.error('Error analyzing image with Gemini:', error)
    throw new Error('Failed to analyze image. Please try again.')
  }
}

// Helper function to convert file to base64
function fileToBase64(file: File): Promise<string> {
  // Works in both browser and server (Node) runtimes
  if (typeof window === 'undefined') {
    // Node.js environment
    return new Promise(async (resolve, reject) => {
      try {
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const base64 = buffer.toString('base64')
        resolve(`data:${file.type};base64,${base64}`)
      } catch (err) {
        reject(err)
      }
    })
  } else {
    // Browser environment
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }
}

// Function to detect LPF sediments using Gemini AI
export async function detectLPFSediments(imageFile: File, abortSignal?: AbortSignal): Promise<LPFSedimentDetection> {
  try {
    // Create a unique key for this image to prevent duplicate requests
    const imageKey = `lpf-${imageFile.name}-${imageFile.size}-${imageFile.lastModified}`
    const lastRequestTime = requestThrottle.get(imageKey)
    const now = Date.now()
    
    // Check if we're making requests too frequently
    if (lastRequestTime && (now - lastRequestTime) < THROTTLE_DELAY) {
      console.log(`⏳ Throttling LPF request - too soon after last request (${now - lastRequestTime}ms ago)`)
      throw new Error('Request throttled - please wait before trying again')
    }
    
    // Update throttle timestamp
    requestThrottle.set(imageKey, now)
    
    // Convert image to base64
    const base64Image = await fileToBase64(imageFile)
    
    // Create the prompt for LPF sediment detection
    const prompt = `Analyze this Low Power Field (LPF) urine microscopy image and count the specific sediments present. 

Look for these specific sediment types and provide accurate counts:
1. Epithelial Cells - Round or oval cells with distinct nuclei
2. Mucus Threads - Long, thin, translucent strands
3. Casts - Cylindrical structures (hyaline, granular, cellular casts)
4. Squamous Epithelial - Large, flat cells with irregular borders
5. Abnormal Crystals - Unusual crystal formations (not normal calcium oxalate)

IMPORTANT: Return ONLY the JSON object below, no additional text or explanations:

{
  "epithelial_cells": 0,
  "mucus_threads": 0,
  "casts": 0,
  "squamous_epithelial": 0,
  "abnormal_crystals": 0,
  "confidence": 85,
  "analysis_notes": "Brief description of what was observed"
}

Provide accurate counts for each sediment type. Use 0 if none are present. Be conservative in your counting - only count items you are reasonably confident about. Set confidence as a percentage (0-100) based on image quality and clarity.`

    // Generate content with image using fallback mechanism
    const result = await generateContentWithFallback(prompt, {
      inlineData: {
        mimeType: imageFile.type,
        data: base64Image.split(',')[1] // Remove data:image/...;base64, prefix
      }
    }, abortSignal)

    const response = await result.response
    const text = response.text()
    
    // Extract JSON from response
    let jsonText = text.trim()
    
    // Remove markdown code blocks
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }
    
    // Look for JSON object in the text
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      jsonText = jsonMatch[0]
    }
    
    // Parse JSON response
    const detection = JSON.parse(jsonText) as LPFSedimentDetection
    
    return detection
  } catch (error) {
    if (isAbortError(error)) {
      console.log('🛑 LPF analysis cancelled')
      throw error
    }
    console.error('Error detecting LPF sediments with Gemini:', error)
    throw new Error('Failed to analyze LPF sediments. Please try again.')
  }
}

// Function to detect HPF sediments using Gemini AI with improved accuracy
export async function detectHPFSediments(imageFile: File, abortSignal?: AbortSignal): Promise<HPFSedimentDetection> {
  try {
    // Create a unique key for this image to prevent duplicate requests
    const imageKey = `hpf-${imageFile.name}-${imageFile.size}-${imageFile.lastModified}`
    const lastRequestTime = requestThrottle.get(imageKey)
    const now = Date.now()
    
    // Check if we're making requests too frequently
    if (lastRequestTime && (now - lastRequestTime) < THROTTLE_DELAY) {
      console.log(`⏳ Throttling HPF request - too soon after last request (${now - lastRequestTime}ms ago)`)
      throw new Error('Request throttled - please wait before trying again')
    }
    
    // Update throttle timestamp
    requestThrottle.set(imageKey, now)
    
    // Convert image to base64
    const base64Image = await fileToBase64(imageFile)
    
    // Create the prompt for HPF sediment detection
    const prompt = `You are a medical laboratory technician analyzing a High Power Field (HPF) urine microscopy image. Your task is to count specific sediments with extreme accuracy.

CRITICAL COUNTING RULES:
1. Count each sediment individually - do not double count
2. Only count complete, clearly visible sediments
3. Do not count partial, overlapping, or ambiguous items
4. For crystals: count each distinct crystal formation separately
5. Be extremely conservative - if unsure, don't count it

SEDIMENT TYPES TO COUNT:
1. RBC (Red Blood Cells) - Small, round, biconcave cells, typically 6-8 μm
2. WBC (White Blood Cells) - Larger cells (10-15 μm) with distinct nuclei
3. Epithelial Cells - Round or oval cells with distinct nuclei, various sizes
4. Crystals - Distinct crystal formations (calcium oxalate, uric acid, etc.) - COUNT EACH CRYSTAL SEPARATELY
5. Bacteria - Small, rod-shaped or spherical organisms, typically 1-3 μm
6. Yeast - Oval or round fungal cells, often with budding
7. Sperm - Spermatozoa with distinct head and tail structures
8. Parasites - Parasitic organisms or eggs

COUNTING METHODOLOGY:
- Scan the entire image systematically
- Count each sediment type individually
- For crystals: look for distinct crystal boundaries and count each one
- Avoid counting artifacts, debris, or unclear objects
- If sediments are touching but clearly separate, count them separately

IMPORTANT: Return ONLY the JSON object below, no additional text or explanations:

{
  "rbc": 0,
  "wbc": 0,
  "epithelial_cells": 0,
  "crystals": 0,
  "bacteria": 0,
  "yeast": 0,
  "sperm": 0,
  "parasites": 0,
  "confidence": 85,
  "analysis_notes": "Brief description of what was observed"
}

Provide accurate counts for each sediment type. Use 0 if none are present. Be extremely conservative in your counting - only count items you are 100% confident about. Set confidence as a percentage (0-100) based on image quality and clarity.`

    // Single attempt with better error handling (removed multiple attempts to reduce API calls)
    const result = await generateContentWithFallback(prompt, {
      inlineData: {
        mimeType: imageFile.type,
        data: base64Image.split(',')[1] // Remove data:image/...;base64, prefix
      }
    }, abortSignal)

    const response = await result.response
    const text = response.text()
    
    // Extract JSON from response
    let jsonText = text.trim()
    
    // Remove markdown code blocks
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }
    
    // Look for JSON object in the text
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      jsonText = jsonMatch[0]
    }
    
    // Parse JSON response
    const detection = JSON.parse(jsonText) as HPFSedimentDetection
    
    return detection
  } catch (error) {
    if (isAbortError(error)) {
      console.log('🛑 HPF analysis cancelled')
      throw error
    }
    console.error('Error detecting HPF sediments with Gemini:', error)
    throw new Error('Failed to analyze HPF sediments. Please try again.')
  }
}

// Function to analyze urinalysis image with YOLO detection results
export async function analyzeUrinalysisImageWithYOLO(
  imageFile: File,
  yoloResults: {
    predictions: Array<{
      x: number
      y: number
      width: number
      height: number
      confidence: number
      class: string
      class_id: number
      detection_id: string
    }>
    summary: {
      total_detections: number
      by_class: Record<string, number>
    }
  },
  abortSignal?: AbortSignal
): Promise<YOLOEnhancedUrinalysisResult> {
  try {
    // Convert image to base64
    const base64Image = await fileToBase64(imageFile)
    
    // Format YOLO results for the prompt
    const yoloSummary = yoloResults.summary
    const yoloPredictions = yoloResults.predictions
    
    // Create a detailed description of YOLO detections
    const yoloDetectionsText = `
YOLO MODEL DETECTIONS (Machine Learning Object Detection Results):
Total Detections: ${yoloSummary.total_detections}

Detections by Class:
${Object.entries(yoloSummary.by_class).map(([className, count]) => 
  `- ${className}: ${count} detected`
).join('\n')}

Detailed Detection Coordinates:
${yoloPredictions.slice(0, 20).map((pred, idx) => 
  `${idx + 1}. ${pred.class} (confidence: ${(pred.confidence * 100).toFixed(1)}%) at position (x: ${pred.x.toFixed(0)}, y: ${pred.y.toFixed(0)}, width: ${pred.width.toFixed(0)}, height: ${pred.height.toFixed(0)})`
).join('\n')}
${yoloPredictions.length > 20 ? `\n... and ${yoloPredictions.length - 20} more detections` : ''}
`

    // Create the enhanced prompt that incorporates YOLO results
    const prompt = `You are acting as a board-certified medical laboratory technologist. Examine the supplied urine microscopy image thoroughly before responding.

${yoloDetectionsText}

INSTRUCTIONS:
1. The YOLO model has already detected and located specific sediment types in the image. Use these detections as a starting point for your analysis.
2. Verify each YOLO detection by examining the corresponding region in the image. Confirm or correct the YOLO model's findings.
3. Perform a systematic scan of the entire field of view: start in the upper left quadrant and inspect each area sequentially, moving left-to-right and top-to-bottom to ensure no region is skipped.
4. Count every discrete structure that matches the sediment types listed below. Treat overlapping or clustered elements as separate counts when their borders are distinguishable.
5. If the YOLO model detected items that you cannot confirm in the image, you may adjust the counts accordingly. However, if you see items the YOLO model missed, include them in your counts.
6. Evaluate morphology, provide concise clinical notes, and classify status as "normal", "abnormal", or "critical" based strictly on laboratory relevance.
7. Return the final answer as VALID JSON only, exactly matching the schema shown. Do not include commentary outside the JSON block.

Use this JSON template (replace the example values with your findings):
{
  "rbc": {"count": "0-2", "unit": "/HPF", "morphology": "Normal", "notes": "No significant findings", "status": "normal"},
  "wbc": {"count": "0-5", "unit": "/HPF", "morphology": "Normal", "notes": "Within normal limits", "status": "normal"},
  "epithelial_cells": {"count": "0-3", "unit": "/HPF", "morphology": "Normal", "notes": "Squamous epithelial cells present", "status": "normal"},
  "crystals": {"count": "0", "unit": "/HPF", "morphology": "None", "notes": "No crystals observed", "status": "normal"},
  "casts": {"count": "0", "unit": "/LPF", "morphology": "None", "notes": "No casts present", "status": "normal"},
  "bacteria": {"count": "0", "unit": "/HPF", "morphology": "None", "notes": "No bacteria observed", "status": "normal"},
  "yeast": {"count": "0", "unit": "/HPF", "morphology": "None", "notes": "No yeast cells", "status": "normal"},
  "mucus": {"count": "0", "unit": "/LPF", "morphology": "None", "notes": "No mucus threads", "status": "normal"},
  "sperm": {"count": "0", "unit": "/HPF", "morphology": "None", "notes": "No spermatozoa", "status": "normal"},
  "parasites": {"count": "0", "unit": "/HPF", "morphology": "None", "notes": "No parasites", "status": "normal"},
  "overall_accuracy": 95,
  "summary": "Normal urinalysis findings with no significant abnormalities detected."
}

CLASS MAPPING FROM YOLO TO STANDARD TERMINOLOGY:
- YOLO "eryth" → JSON "rbc" (Red Blood Cells)
- YOLO "leuko" → JSON "wbc" (White Blood Cells)
- YOLO "epith" or "epithn" → JSON "epithelial_cells"
- YOLO "cryst" → JSON "crystals"
- YOLO "cast" → JSON "casts"
- YOLO "mycete" → JSON "yeast"
- Note: YOLO may not detect all sediment types (bacteria, mucus, sperm, parasites), so you must still examine the entire image.

Guidance for recognition (use as visual references only):
- RBC: small, round, biconcave cells, typically 6–8 μm
- WBC: larger cells (10–15 μm) with prominent nuclei
- Epithelial Cells: round or oval cells with nuclei; various sizes
- Crystals: distinct crystal formations (e.g., calcium oxalate, uric acid) – count each crystal separately
- Bacteria: tiny rod-shaped or spherical organisms (1–3 μm)
- Yeast: oval or round fungal cells, often budding
- Sperm: spermatozoa with head and tail structures
- Parasites: parasitic organisms or eggs
- Mucus: long, thin, translucent strands
- Casts: cylindrical structures (hyaline, granular, cellular)
- Squamous Epithelial: large, flat cells with irregular borders
- Abnormal Crystals: unusual crystal forms (non-calcium oxalate standard)

Ensure all numeric values remain strings as shown in the template.`

    // Generate content with image using fallback mechanism
    const result = await generateContentWithFallback(
      prompt,
      {
        inlineData: {
          mimeType: imageFile.type,
          data: base64Image.split(',')[1] // Remove data:image/...;base64, prefix
        }
      },
      abortSignal
    )

    const response = await result.response
    const text = response.text()
    
    // Extract JSON from response - handle various formats
    let jsonText = text.trim()
    
    // Remove markdown code blocks
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }
    
    // Look for JSON object in the text (handle cases where AI adds explanatory text)
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      jsonText = jsonMatch[0]
    }
    
    // Parse JSON response
    const analysis = JSON.parse(jsonText) as UrinalysisResult
    
    // Return enhanced result with YOLO detections
    return {
      ...analysis,
      yolo_detections: yoloResults
    }
  } catch (error) {
    console.error('Error analyzing image with Gemini (YOLO-enhanced):', error)
    throw new Error('Failed to analyze image. Please try again.')
  }
}
