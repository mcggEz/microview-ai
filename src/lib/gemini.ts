import { GoogleGenerativeAI } from '@google/generative-ai'

// Request throttling to prevent excessive API calls
const requestThrottle = new Map<string, number>()
const THROTTLE_DELAY = 2000 // 2 seconds between requests for same image

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''
)

// Model selection: allow env override, then try a strongest-to-fastest fallback list
// You can set NEXT_PUBLIC_GEMINI_MODEL to a single model or comma-separated list to control order
const envModelPreference = (process.env.NEXT_PUBLIC_GEMINI_MODEL || '').trim()
const configuredModels = envModelPreference
  ? envModelPreference.split(',').map(m => m.trim()).filter(Boolean)
  : []

// Default preference order (attempt in sequence until one succeeds)
const defaultModelPreference = [
  'gemini-2.5-pro',
  'gemini-2.0-pro',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
]

const modelPreference = configuredModels.length > 0 ? configuredModels : defaultModelPreference

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

// Helper function to try models in order until one works (handles overloads and general failures)
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
      console.log(`Trying model: ${modelName} ...`)
      const model = getModelInstance(modelName)
      const result = await model.generateContent([prompt, imageData])
      console.log(`✅ Model succeeded: ${modelName}`)
      return result
    } catch (error: unknown) {
      lastError = error
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`Model failed: ${modelName} -> ${message}`)
      // Continue to next model on any failure
      continue
    }
  }

  console.error('All configured Gemini models failed in fallback chain')
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

export async function analyzeUrinalysisImage(imageFile: File, abortSignal?: AbortSignal): Promise<UrinalysisResult> {
  try {
    // Convert image to base64
    const base64Image = await fileToBase64(imageFile)
    
    // Create the prompt for urinalysis analysis
    const prompt = `Analyze this urine microscopy image and provide detailed findings. Return the results in the following JSON format:

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

Please analyze the image carefully and provide accurate counts, morphology descriptions, and clinical significance. Set status as 'normal', 'abnormal', or 'critical' based on clinical relevance. Provide an overall accuracy percentage based on image quality and clarity.
FOr more context these are the descriptions of the sediment types:
- RBC: Red Blood Cells - Small, round, biconcave cells, typically 6-8 μm
- WBC: White Blood Cells - Larger cells (10-15 μm) with distinct nuclei
- Epithelial Cells: Round or oval cells with distinct nuclei, various sizes
- Crystals: Distinct crystal formations (calcium oxalate, uric acid, etc.) - COUNT EACH CRYSTAL SEPARATELY
- Bacteria: Small, rod-shaped or spherical organisms, typically 1-3 μm
- Yeast: Oval or round fungal cells, often with budding
- Sperm: Spermatozoa with distinct head and tail structures
- Parasites: Parasitic organisms or eggs
- Mucus: Mucus threads - Long, thin, translucent strands
- Casts: Cylindrical structures (hyaline, granular, cellular casts)
- Squamous Epithelial: Large, flat cells with irregular borders
- Abnormal Crystals: Unusual crystal formations (not normal calcium oxalate)  

`

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
  if (typeof window !== 'undefined' && typeof FileReader !== 'undefined') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = error => reject(error)
    })
  }

  // Node.js/Edge runtime path
  return new Promise(async (resolve, reject) => {
    try {
      // Use arrayBuffer() available on Blob/File, then convert via Buffer
      const arrayBuffer = await file.arrayBuffer()
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const buf = Buffer.from(arrayBuffer)
      const mime = file.type || 'application/octet-stream'
      const base64 = buf.toString('base64')
      resolve(`data:${mime};base64,${base64}`)
    } catch (err) {
      reject(err)
    }
  })
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
    const detection = JSON.parse(jsonText) as LPFSedimentDetection
    
    return detection
  } catch (error) {
    if (abortSignal?.aborted || isAbortError(error)) {
      const abortError = new Error('Request aborted')
      abortError.name = 'AbortError'
      throw abortError
    }
    console.error('Error detecting LPF sediments with Gemini:', error)
    throw new Error('Failed to analyze LPF sediments. Please try again.')
  }
}

// Function to detect HPF sediments using Gemini AI with improved accuracy
export async function detectHPFSediments(imageFile: File, abortSignal?: AbortSignal): Promise<HPFSedimentDetection> {
  try {
    // Create a unique key for this image to prevent duplicate requests
    const imageKey = `${imageFile.name}-${imageFile.size}-${imageFile.lastModified}`
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
    console.log('🔬 Starting HPF analysis with Gemini API...')
    
    // Check if request was aborted
    if (abortSignal?.aborted) {
      const abortError = new Error('Request aborted')
      abortError.name = 'AbortError'
      throw abortError
    }
    
    try {
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
      const detection = JSON.parse(jsonText) as HPFSedimentDetection
      
      console.log('✅ HPF analysis completed successfully:', detection)
      
      // Validate the response
      if (typeof detection.crystals === 'number' && detection.crystals >= 0) {
        return detection
      } else {
        throw new Error('Invalid response format from Gemini API')
      }
      
    } catch (attemptError) {
      // Check if request was aborted
      if (abortSignal?.aborted || isAbortError(attemptError)) {
        const abortError = new Error('Request aborted')
        abortError.name = 'AbortError'
        throw abortError
      }
      
      console.error('HPF analysis failed:', attemptError)
      throw attemptError
    }
    
  } catch (error) {
    if (abortSignal?.aborted || isAbortError(error)) {
      const abortError = new Error('Request aborted')
      abortError.name = 'AbortError'
      throw abortError
    }
    console.error('Error detecting HPF sediments with Gemini:', error)
    throw new Error('Failed to analyze HPF sediments. Please try again.')
  }
}

// Function to get confidence level description
export function getConfidenceLevel(accuracy: number): string {
  if (accuracy >= 95) return 'Very High'
  if (accuracy >= 90) return 'High'
  if (accuracy >= 80) return 'Moderate'
  if (accuracy >= 70) return 'Low'
  return 'Very Low'
}
