import { NextRequest, NextResponse } from 'next/server'
import { analyzeUrinalysisImage } from '@/lib/gemini'
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

    console.log('Analyzing image with Gemini API...')
    console.log('File name:', imageFile.name)
    console.log('File size:', imageFile.size, 'bytes')
    console.log('File type:', imageFile.type)

    // Analyze the image using Gemini API
    const analysis = await analyzeUrinalysisImage(imageFile)

    console.log('Analysis completed successfully')
    console.log('Overall accuracy:', analysis.overall_accuracy)

    return NextResponse.json({
      success: true,
      analysis,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in image analysis API:', error)
    
    // Handle specific Gemini API errors
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'Gemini API key not configured properly' },
          { status: 500 }
        )
      }
      
      if (error.message.includes('quota')) {
        return NextResponse.json(
          { error: 'Gemini API quota exceeded. Please try again later.' },
          { status: 429 }
        )
      }
      
      if (error.message.includes('invalid')) {
        return NextResponse.json(
          { error: 'Invalid image format or corrupted file' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to analyze image. Please try again.' },
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
