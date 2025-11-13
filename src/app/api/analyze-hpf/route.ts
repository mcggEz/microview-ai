import { NextRequest, NextResponse } from 'next/server'
import { detectHPFSediments } from '@/lib/gemini'
import { requireAuth } from '@/lib/auth'

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

    if (!imageFile) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 })
    }

    if (!imageFile.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    const detection = await detectHPFSediments(imageFile)

    return NextResponse.json({ success: true, detection })
  } catch (error) {
    console.error('HPF analysis error:', error)
    return NextResponse.json({ error: 'Failed to analyze HPF' }, { status: 500 })
  }
}

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


