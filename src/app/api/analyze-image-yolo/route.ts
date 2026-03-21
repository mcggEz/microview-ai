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

    // Step 2: Send image + YOLO results to Gemini for a Master Audit
    console.log('📤 Step 2: Sending image + YOLO results to Gemini for a Master Audit')
    // Format YOLO results for the prompt with explicit identification for auditing
    const yoloSummary = yoloResult.summary || { total_detections: 0, by_class: {} }
    const originalPredictions = yoloResult.predictions || []

    const yoloDetectionsText = `
### STAGE 1: YOLO DETECTOR RESULTS (Preliminary baseline)
Total detections: ${yoloSummary.total_detections}
Initial Detection List (ID | Suspected Class | Location):
${originalPredictions.slice(0, 50).map((p: any) => `- ${p.detection_id} | ${p.class} | [y:${p.y}, x:${p.x}, w:${p.width}, h:${p.height}]`).join('\n')}
`

    // Create the enhanced prompt that incorporates YOLO results
    const prompt = `You are acting as a board-certified Senior Medical Laboratory Scientist. 
Your task is to perform an ADVANCED MICROSCOPIC AUDIT of a urine sediment image.

### ANALYTICAL CONTEXT
The Stage 1 (YOLO) detector has provided a "suspect list". You are the Stage 2 "Final Arbiter."
${yoloDetectionsText}

### VISUAL SIGNATURES (Your reference guide)
1. **RBC (Red Blood Cells)**: Small (7-8µm), perfectly circular, yellow-hinted, with a distinct smooth border and central pallor (bright center). They look like "ghost cells" or "doughnuts". 
2. **WBC (White Blood Cells)**: Larger (10-15µm), granular cytoplasm, often with visible lobated nuclei. Look for "grainy" textures.
3. **YEAST**: Smaller than RBCs, often oval/egg-shaped, and MUST show "budding" (look like a small '8' or 'snowman').
4. **CASTS**: Long, cylindrical structures with parallel sides. Distinguish from "mucus" by their solid, definite borders.
5. **BUBBLES / DEBRIS**: Thick black borders (oil bubbles) or jagged irregular shapes (artifacts). Do NOT count these.

### CORE MISSION: CRAFT THE MASTER DETECTIONS LIST
1. **AUDIT YOLO**: For every YOLO ID (eryth, leuko, epith, mycete), check the location:
   - If it's a valid artifact, KEEP it (and fix the class to standard terminology).
   - If it's debris/bubbles, EXCLUDE it from your list.
2. **DISCOVER MISSING ITEMS**: Perform a thorough pixel-scan. If you see high-probability sediments that YOLO missed, you MUST ADD them with accurate [x, y, w, h] coordinates.
3. **FINAL VERDICT**: Your counts and the final detections list MUST match perfectly.

### OUTPUT REQUIREMENTS
- Return JSON only. Exactly match the schema.
- **IMPORTANT**: Return a SINGLE consolidated "detections" array. Use standard names for "class" (rbc, wbc, epithelial_cells, crystals, casts, yeast, bacteria, sperm, parasites).

Use this mapping for YOLO terms:
- "eryth" -> rbc
- "leuko" -> wbc
- "mycete" -> yeast
- "epith" / "epithn" -> epithelial_cells
- "cryst" -> crystals

JSON Template:
{
  "rbc": {"count": "0", "unit": "/HPF", "morphology": "Normal", "status": "normal"},
  "wbc": {"count": "0", "unit": "/HPF", "morphology": "Normal", "status": "normal"},
  "epithelial_cells": {"count": "0", "unit": "/HPF", "morphology": "Normal", "status": "normal"},
  "yeast": {"count": "0", "unit": "/HPF", "morphology": "None", "status": "normal"},
  "detections": [
    {"detection_id": "original_id", "x": 100, "y": 150, "width": 40, "height": 40, "confidence": 0.95, "class": "rbc"},
    {"detection_id": "gemini_new_1", "x": 300, "y": 200, "width": 30, "height": 30, "confidence": 0.99, "class": "wbc"}
  ],
  "overall_accuracy": 95,
  "summary": "Explain significant findings or corrections here."
}`

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

    // Return combined result, using Gemini's audited detections if available
    return NextResponse.json({
      success: true,
      analysis,
      yolo_detections: {
        predictions: analysis.detections || yoloResult.predictions || [],
        summary: analysis.detections 
          ? {
              total_detections: analysis.detections.length,
              by_class: analysis.detections.reduce((acc: Record<string, number>, d: any) => {
                acc[d.class] = (acc[d.class] || 0) + 1;
                return acc;
              }, {})
            }
          : (yoloResult.summary || { total_detections: 0, by_class: {} })
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

