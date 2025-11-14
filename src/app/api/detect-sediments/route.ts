import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

// Hugging Face Space API URL
const HF_SPACE_URL = process.env.HF_SPACE_URL || 
  'https://mcggEz-microview-ai-yolov11.hf.space/api/predict'

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

    // Check if using FastAPI endpoint (simpler format)
    const useFastAPI = HF_SPACE_URL.includes('/api/predict') && !HF_SPACE_URL.includes('gradio')
    
    if (useFastAPI) {
      // FastAPI endpoint - simpler format
      const formDataToSend = new FormData()
      formDataToSend.append('image', imageFile)
      formDataToSend.append('conf', confThreshold)

      const response = await fetch(HF_SPACE_URL, {
        method: 'POST',
        body: formDataToSend,
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('HF API error:', errorText)
        throw new Error(`Hugging Face API error: ${response.statusText}`)
      }

      const result = await response.json()
      
      return NextResponse.json({
        success: true,
        predictions: result.predictions || [],
        summary: result.summary || { total_detections: 0, by_class: {} },
        timestamp: new Date().toISOString()
      })
    } else {
      // Gradio endpoint - original format
      // Convert image to base64 data URL
      const arrayBuffer = await imageFile.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const base64Image = buffer.toString('base64')
      const imageDataUrl = `data:${imageFile.type};base64,${base64Image}`

      console.log('Calling Hugging Face Space API...')
      console.log('Image size:', imageFile.size, 'bytes')
      console.log('Confidence threshold:', confThreshold)

      // Call Hugging Face Space API
      const response = await fetch(HF_SPACE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: [
            imageDataUrl,           // Image as data URL
            parseFloat(confThreshold) // Confidence threshold
          ]
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('HF API error:', errorText)
        throw new Error(`Hugging Face API error: ${response.statusText}`)
      }

      const result = await response.json()
      
      // Gradio API returns data in nested format
      // result.data[0] = annotated image (we ignore this for API)
      // result.data[1] = JSON string with predictions
      // result.data[2] = summary statistics
      
      const jsonOutput = result.data[1]       // JSON string
      const summary = result.data[2] || {}     // Summary statistics
      
      // Parse the JSON string
      const predictions = JSON.parse(jsonOutput)

      if (!predictions.success) {
        throw new Error(predictions.error || 'Detection failed')
      }

      console.log('Detection successful:', predictions.summary?.total_detections || 0, 'detections')

      return NextResponse.json({
        success: true,
        predictions: predictions.predictions,
        summary: summary,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Error calling Hugging Face API:', error)
    return NextResponse.json(
      { 
        error: 'Failed to detect sediments. Please try again.',
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

