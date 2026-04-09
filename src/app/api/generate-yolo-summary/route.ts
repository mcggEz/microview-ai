import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { GoogleGenerativeAI } from '@google/generative-ai'

function getFallbackGeminiKeys(request: NextRequest): string[] {
  const envKey = (process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '').trim()
  let headerKeys: string[] = []
  
  try {
    const headerRaw = request.headers.get('x-gemini-api-keys') || '[]'
    const parsed = JSON.parse(headerRaw)
    if (Array.isArray(parsed)) {
      headerKeys = parsed.filter((v) => typeof v === 'string').map((v) => v.trim()).filter(Boolean)
    }
  } catch (e) {
    // ignore
  }

  return [envKey, ...headerKeys].filter(Boolean)
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request)
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { yoloSummary, powerMode } = await request.json()

    if (!yoloSummary) {
      return NextResponse.json({ error: 'Missing yoloSummary' }, { status: 400 })
    }

    const geminiKeys = getFallbackGeminiKeys(request)
    if (geminiKeys.length === 0) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 })
    }

    const apiKey = geminiKeys[0]
    const client = new GoogleGenerativeAI(apiKey)
    const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' }) // fast text only

    const summaryText = Object.entries(yoloSummary.by_class || {})
      .map(([cls, count]) => `${count} ${cls}`)
      .join(', ') || 'No significant elements detected'

    const prompt = `You are a medical laboratory technologist. You are given the output of an AI object detector (YOLO) from a microscopic urinalysis image (${powerMode} field).
The detector found: ${summaryText}. Total detections: ${yoloSummary.total_detections}.

Write a SINGLE, highly concise professional medical note (max 2 sentences) summarizing these findings for the report's "analysis_notes" section. Do not add any disclaimers or extra formatting. Just the medical note text.`

    const result = await model.generateContent(prompt)
    const geminiNote = result.response.text().trim()

    return NextResponse.json({ success: true, note: geminiNote })
  } catch (error) {
    console.error('Error generating YOLO summary:', error)
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 })
  }
}
