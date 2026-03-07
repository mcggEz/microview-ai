import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Hugging Face Space API URL
const HF_SPACE_URL = process.env.HF_SPACE_URL || 
  'https://mcggEz-microview-ai-yolov11.hf.space/api/predict'

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''
)

// Basic in-memory rate limiting / backoff for Gemini calls.
// This is per-server-process, which is enough to stop "spam" from the UI.
let lastGeminiCallAt = 0
let geminiBackoffUntil = 0
const MIN_GEMINI_INTERVAL_MS = 2000 // at most ~1 request every 2s per server instance

function isGeminiThrottled() {
  const now = Date.now()

  if (geminiBackoffUntil && now < geminiBackoffUntil) {
    const waitSeconds = Math.ceil((geminiBackoffUntil - now) / 1000)
    return { throttled: true, waitSeconds }
  }

  const sinceLast = now - lastGeminiCallAt
  if (sinceLast < MIN_GEMINI_INTERVAL_MS) {
    const waitMs = MIN_GEMINI_INTERVAL_MS - sinceLast
    const waitSeconds = Math.ceil(waitMs / 1000)
    geminiBackoffUntil = now + waitMs
    return { throttled: true, waitSeconds }
  }

  return { throttled: false, waitSeconds: 0 }
}

function updateBackoffFromGeminiError(error: unknown) {
  const anyErr = error as any
  if (!anyErr || typeof anyErr !== 'object') return
  if (anyErr.status !== 429) return

  // Default to a conservative backoff if we can't parse details
  let retrySeconds = 60

  try {
    const details = anyErr.errorDetails as any[] | undefined
    if (Array.isArray(details)) {
      const retryInfo = details.find(d => typeof d === 'object' && d['@type']?.includes('RetryInfo'))
      const retryDelay = retryInfo?.retryDelay as string | undefined // e.g. "16s"
      if (retryDelay) {
        const match = retryDelay.match(/(\d+)(\.\d+)?s/)
        if (match) {
          retrySeconds = Math.max(1, Math.round(parseFloat(match[1] + (match[2] || ''))))
        }
      }
    }
  } catch {
    // Ignore parsing issues and keep default retrySeconds
  }

  geminiBackoffUntil = Date.now() + retrySeconds * 1000
  return retrySeconds
}

// Helper to convert File to base64
async function fileToBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  return `data:${file.type};base64,${buffer.toString('base64')}`
}

export async function POST(request: NextRequest) {
  // Require authentication
  try {
    await requireAuth(request)
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const imageFile = formData.get('image') as File
    const confThreshold = formData.get('conf') as string || '0.25'

    if (!imageFile) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!imageFile.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an image.' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (imageFile.size > maxSize) {
      return NextResponse.json(
        { error: 'File size too large. Maximum size is 10MB.' },
        { status: 400 }
      )
    }

    console.log('🔬 Starting YOLO + Gemini analysis pipeline...')
    console.log('📤 Step 1: Sending image to YOLO detection (Hugging Face)')

    // Step 1: Send image to YOLO detection (Hugging Face)
    const yoloFormData = new FormData()
    yoloFormData.append('image', imageFile)
    yoloFormData.append('conf', confThreshold)

    const yoloResponse = await fetch(HF_SPACE_URL, {
      method: 'POST',
      body: yoloFormData,
    })

    if (!yoloResponse.ok) {
      const errorText = await yoloResponse.text()
      console.error('YOLO API error:', errorText)
      throw new Error(`YOLO detection failed: ${yoloResponse.statusText}`)
    }

    const yoloResult = await yoloResponse.json()
    console.log('✅ YOLO detection complete:', yoloResult.summary?.total_detections || 0, 'detections')

    // Step 2: Send image + YOLO results to Gemini for enhanced analysis
    console.log('📤 Step 2: Sending image + YOLO results to Gemini for analysis')

    // Format YOLO results for the prompt
    const yoloSummary = yoloResult.summary || { total_detections: 0, by_class: {} }
    const yoloPredictions = yoloResult.predictions || []
    
    // Create a detailed description of YOLO detections
    const yoloDetectionsText = `
YOLO MODEL DETECTIONS (Machine Learning Object Detection Results):
Total Detections: ${yoloSummary.total_detections}

Detections by Class:
${Object.entries(yoloSummary.by_class).map(([className, count]) => 
  `- ${className}: ${count} detected`
).join('\n')}

Detailed Detection Coordinates:
${yoloPredictions.slice(0, 20).map((pred: any, idx: number) => 
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

    // Simple rate limiting / backoff before calling Gemini
    const throttle = isGeminiThrottled()
    if (throttle.throttled) {
      return NextResponse.json(
        {
          error: 'Gemini is temporarily rate-limited. Please wait before trying again.',
          retryAfterSeconds: throttle.waitSeconds
        },
        { status: 429 }
      )
    }

    // Convert image to base64 for Gemini
    const base64Image = await fileToBase64(imageFile)
    
    // Call Gemini API
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' })
    lastGeminiCallAt = Date.now()
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: imageFile.type,
          data: base64Image.split(',')[1] // Remove data:image/...;base64, prefix
        }
      }
    ])

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
    const analysis = JSON.parse(jsonText)
    console.log('✅ Gemini analysis complete')

    // Return combined result
    return NextResponse.json({
      success: true,
      analysis,
      yolo_detections: {
        predictions: yoloResult.predictions || [],
        summary: yoloResult.summary || { total_detections: 0, by_class: {} }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in YOLO + Gemini pipeline:', error)

    // If this is a Gemini quota / 429 error, update backoff and surface 429
    const anyErr = error as any
    if (anyErr && typeof anyErr === 'object' && anyErr.status === 429) {
      const retrySeconds = updateBackoffFromGeminiError(anyErr) ?? 60
      return NextResponse.json(
        {
          error: 'Gemini quota exceeded. Please wait before trying again.',
          retryAfterSeconds: retrySeconds,
          details: anyErr.statusText || (error instanceof Error ? error.message : 'Too Many Requests')
        },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Failed to analyze image. Please try again.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

