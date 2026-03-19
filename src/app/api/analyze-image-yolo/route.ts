import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Hugging Face Space API URL
const HF_SPACE_URL = process.env.HF_SPACE_URL ||
  'https://mcggEz-microview-ai-yolov11.hf.space/api/predict'

function getFallbackGeminiKeys(request: NextRequest): string[] {
  const envKey = (process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '').trim()
  const headerRaw = request.headers.get('x-gemini-api-keys') || ''

  let headerKeys: string[] = []
  try {
    const parsed = JSON.parse(headerRaw)
    if (Array.isArray(parsed)) {
      headerKeys = parsed.filter((v) => typeof v === 'string').map((v) => v.trim()).filter(Boolean)
    }
  } catch {
    // ignore
  }

  const all = [envKey, ...headerKeys].filter(Boolean)
  return all.filter((k, i) => all.indexOf(k) === i)
}

function getGeminiModel(request: NextRequest): string {
  const modelHeader = request.headers.get('x-gemini-model') || ''
  return modelHeader.trim() || 'gemini-2.0-flash'
}

function isInvalidKeyError(error: unknown): boolean {
  const anyErr = error as any
  const status = anyErr?.status
  const msg = (anyErr?.message || '').toString().toLowerCase()
  return status === 401 || status === 403 || msg.includes('api key') || msg.includes('permission denied') || msg.includes('unauthorized')
}

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

    // Keep the YOLO context very compact to reduce token usage for Gemini
    const yoloDetectionsText = `
YOLO MODEL SUMMARY (for context only, do not re-count blindly):
Total detections: ${yoloSummary.total_detections}
Detections by class (name: count):
${Object.entries(yoloSummary.by_class)
        .map(([className, count]) => `${className}: ${count}`)
        .join(', ')}
`

    // Create the enhanced prompt that incorporates YOLO results
    const prompt = `You are acting as a board-certified Senior Medical Laboratory Scientist. Your task is to perform an ADVANCED CLASSIFICATION and VALIDATION of a urine microscopy image.

### ANALYTICAL CONTEXT
The YOLO detection model has provided a preliminary baseline (Stage 1). You are the Stage 2 "Final Arbiter."
${yoloDetectionsText}

### CORE MISSION: STRENGTHEN THE ANALYSIS
1. **RE-CLASSIFY & REFINE**: YOLO is prone to misidentifying debris as RBCs or Bubbles as Crystals. Your primary objective is to RE-CLASSIFY every artifact found. Do not simply trust the YOLO counts; improve them with your superior visual reasoning.
2. **VERIFY DETECTIONS**: Treat the provided YOLO summary as "suspected" cases. Cross-reference them with the visual evidence. If you see high-probability sediments that YOLO missed, you MUST add them.
3. **HIGH-PRECISION COUNTING**: Perform a methodical scan (raster pattern). Count with clinical precision. If a cluster is detected by YOLO as "1", but you see "3" distinct overlapping cells, update the count to "3".
4. **MORPHOLOGICAL VALIDATION**: For every sediment type (RBC, WBC, Casts, etc.), look for specific structural markers:
   - *RBCs*: Look for biconcave shadows or "ghost cells."
   - *WBCs*: Look for granular cytoplasm and lobated nuclei.
   - *Casts*: Look for distinct cylindrical borders; distinguish from simple mucus strands.
5. **FINAL VERDICT**: If your findings contradict the YOLO model, YOUR analysis takes precedence. Provide the clinical rationale in the "notes" field for any significant changes you made.

### OUTPUT REQUIREMENTS
- Return valid JSON only. Exactly match the schema.
- Classify status as "normal", "abnormal", or "critical".
- Ensure counts are returned as strings (e.g. "0-2", "5", ">20").

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
- Note: YOLO may not detect all sediment types (bacteria, mucus, sperm, parasites), so you must still examine the entire image.`

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

    // Call Gemini API (env key first, then client-provided fallback keys)
    const geminiKeys = getFallbackGeminiKeys(request)
    const selectedModel = getGeminiModel(request)

    if (geminiKeys.length === 0) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      )
    }

    lastGeminiCallAt = Date.now()

    let lastError: unknown = null
    let result: any = null

    geminiKeys.forEach((k, idx) => {
      console.log(`[Gemini] Candidate API key #${idx + 1}: ${k.slice(0, 8)}...`)
    })

    for (let i = 0; i < geminiKeys.length; i++) {
      const apiKey = geminiKeys[i]
      try {
        console.log(`[Gemini] Using API key #${i + 1} with model "${selectedModel}"`)
        const client = new GoogleGenerativeAI(apiKey)
        const model = client.getGenerativeModel({ model: selectedModel })
        result = await model.generateContent([
          prompt,
          {
            inlineData: {
              mimeType: imageFile.type,
              data: base64Image.split(',')[1] // Remove data:image/...;base64, prefix
            }
          }
        ])
        break
      } catch (err) {
        lastError = err
        // Rotate keys for "invalid/unauthorized key" OR "quota exceeded" style errors.
        if (isInvalidKeyError(err) || (err as any).status === 429) continue
        throw err
      }
    }

    if (!result) {
      throw (lastError instanceof Error ? lastError : new Error('Gemini failed for all provided API keys'))
    }

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

