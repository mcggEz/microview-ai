import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

// Get the Gemini Pro Vision model for image analysis
const model = genAI.getGenerativeModel({ model: 'gemini-pro-vision' })

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

export async function analyzeUrinalysisImage(imageFile: File): Promise<UrinalysisResult> {
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

Please analyze the image carefully and provide accurate counts, morphology descriptions, and clinical significance. Set status as 'normal', 'abnormal', or 'critical' based on clinical relevance. Provide an overall accuracy percentage based on image quality and clarity.`

    // Generate content with image
    const result = await model.generateContent([prompt, {
      inlineData: {
        mimeType: imageFile.type,
        data: base64Image.split(',')[1] // Remove data:image/...;base64, prefix
      }
    }])

    const response = await result.response
    const text = response.text()
    
    // Parse JSON response
    const analysis = JSON.parse(text) as UrinalysisResult
    
    return analysis
  } catch (error) {
    console.error('Error analyzing image with Gemini:', error)
    throw new Error('Failed to analyze image. Please try again.')
  }
}

// Helper function to convert file to base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = error => reject(error)
  })
}

// Function to get confidence level description
export function getConfidenceLevel(accuracy: number): string {
  if (accuracy >= 95) return 'Very High'
  if (accuracy >= 90) return 'High'
  if (accuracy >= 80) return 'Moderate'
  if (accuracy >= 70) return 'Low'
  return 'Very Low'
}
