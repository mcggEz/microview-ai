import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '')

// Get the Gemini 2.5 Flash model for image analysis
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

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
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = error => reject(error)
  })
}

// Function to detect LPF sediments using Gemini AI
export async function detectLPFSediments(imageFile: File): Promise<LPFSedimentDetection> {
  try {
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

    // Generate content with image
    const result = await model.generateContent([prompt, {
      inlineData: {
        mimeType: imageFile.type,
        data: base64Image.split(',')[1] // Remove data:image/...;base64, prefix
      }
    }])

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
    console.error('Error detecting LPF sediments with Gemini:', error)
    throw new Error('Failed to analyze LPF sediments. Please try again.')
  }
}

// Function to detect HPF sediments using Gemini AI
export async function detectHPFSediments(imageFile: File): Promise<HPFSedimentDetection> {
  try {
    // Convert image to base64
    const base64Image = await fileToBase64(imageFile)
    
    // Create the prompt for HPF sediment detection
    const prompt = `Analyze this High Power Field (HPF) urine microscopy image and count the specific sediments present. 

Look for these specific sediment types and provide accurate counts:
1. RBC (Red Blood Cells) - Small, round, biconcave cells
2. WBC (White Blood Cells) - Larger cells with distinct nuclei
3. Epithelial Cells - Round or oval cells with distinct nuclei
4. Crystals - Various crystal formations (calcium oxalate, uric acid, etc.)
5. Bacteria - Small, rod-shaped or spherical organisms
6. Yeast - Oval or round fungal cells, often with budding
7. Sperm - Spermatozoa with head and tail structures
8. Parasites - Parasitic organisms or eggs

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

Provide accurate counts for each sediment type. Use 0 if none are present. Be conservative in your counting - only count items you are reasonably confident about. Set confidence as a percentage (0-100) based on image quality and clarity.`

    // Generate content with image
    const result = await model.generateContent([prompt, {
      inlineData: {
        mimeType: imageFile.type,
        data: base64Image.split(',')[1] // Remove data:image/...;base64, prefix
      }
    }])

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
    
    return detection
  } catch (error) {
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
