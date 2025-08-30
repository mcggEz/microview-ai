import { NextRequest, NextResponse } from 'next/server'
import { analyzeUrinalysisImage } from '@/lib/gemini'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('image') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      )
    }

    // Analyze the image using Gemini
    const analysis = await analyzeUrinalysisImage(file)
    
    return NextResponse.json({ 
      success: true, 
      analysis,
      message: 'Image analyzed successfully'
    })

  } catch (error) {
    console.error('Error in analyze-image API:', error)
    return NextResponse.json(
      { 
        error: 'Failed to analyze image',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
