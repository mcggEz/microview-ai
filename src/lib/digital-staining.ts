/**
 * Digital Staining and Segmentation for Urinalysis Images
 * JavaScript implementation of the Python digital staining algorithm
 */

import { isOpenCVReady } from './opencv-loader'
import type { CVMat, CVMatVector } from '@/types/opencv'

export interface SegmentationResult {
  originalImage: CVMat | null
  segmentedImage: CVMat | null
  contours: CVMatVector | null
  contourCount: number
  success: boolean
  error?: string
}

export interface DigitalStainingOptions {
  threshold?: number // Binary threshold value (default: 100)
  kernelSize?: number // Morphological kernel size (default: 5)
  iterations?: number // Number of morphological iterations (default: 2)
  minArea?: number // Minimum contour area to filter (default: 50)
}

/**
 * Applies digital staining and segmentation to a microscope image
 * This is the JavaScript equivalent of the Python apply_digital_stain function
 */
export function applyDigitalStain(
  imageData: ImageData | HTMLCanvasElement | HTMLImageElement,
  options: DigitalStainingOptions = {}
): SegmentationResult {
  const {
    threshold = 100,
    kernelSize = 5,
    iterations = 2,
    minArea = 50
  } = options

  // Check if OpenCV is ready
  if (!isOpenCVReady() || !window.cv) {
    return {
      originalImage: null,
      segmentedImage: null,
      contours: null,
      contourCount: 0,
      success: false,
      error: 'OpenCV is not ready'
    }
  }

  try {
    let src: CVMat | null = null

    // Convert different input types to OpenCV Mat
    if (imageData instanceof ImageData) {
      src = window.cv.matFromImageData(imageData)
    } else if (imageData instanceof HTMLCanvasElement) {
      const ctx = imageData.getContext('2d')
      if (!ctx) {
        throw new Error('Could not get canvas context')
      }
      const imgData = ctx.getImageData(0, 0, imageData.width, imageData.height)
      src = window.cv.matFromImageData(imgData)
    } else if (imageData instanceof HTMLImageElement) {
      src = window.cv.imread(imageData)
    } else {
      throw new Error('Unsupported image data type')
    }

    if (!src || (typeof src.empty === 'function' && src.empty())) {
      throw new Error('Failed to load image')
    }

    // 1. Convert to grayscale
    const gray = new window.cv.Mat()
    window.cv.cvtColor(src, gray, window.cv.COLOR_RGBA2GRAY)

    // 2. Apply binary threshold (digital stain step)
    const thresh = new window.cv.Mat()
    window.cv.threshold(gray, thresh, threshold, 255, window.cv.THRESH_BINARY)

    // 3. Create morphological kernel
    const kernel = window.cv.getStructuringElement(
      window.cv.MORPH_RECT,
      new window.cv.Size(kernelSize, kernelSize)
    ) as CVMat

    // 4. Apply morphological operations
    // Opening: removes small noise
    const opening = new window.cv.Mat()
    window.cv.morphologyEx(thresh, opening, window.cv.MORPH_OPEN, kernel, new window.cv.Point(-1, -1), iterations)

    // Closing: fills small holes
    const closing = new window.cv.Mat()
    window.cv.morphologyEx(opening, closing, window.cv.MORPH_CLOSE, kernel, new window.cv.Point(-1, -1), iterations)

    // 5. Find contours
    const contours = new window.cv.MatVector()
    const hierarchy = new window.cv.Mat()
    window.cv.findContours(closing, contours, hierarchy, window.cv.RETR_EXTERNAL, window.cv.CHAIN_APPROX_SIMPLE)

    // 6. Filter contours by area and create segmented image (filled sediments mask)
    // Use 4-channel image with alpha so background stays transparent
    const segmentedImage = window.cv.Mat.zeros
      ? (window.cv.Mat.zeros(src.rows, src.cols, window.cv.CV_8UC4) as CVMat)
      : (new window.cv.Mat() as CVMat)
    let validContourCount = 0

    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i)
      const area = window.cv.contourArea(contour)
      
      if (area > minArea) {
        // First pass: very light translucent fill so camera stays visible
        window.cv.drawContours(
          segmentedImage,
          contours,
          i,
          new window.cv.Scalar(0, 255, 0, 60),
          -1
        )
        // Second pass: thin bright outline for definition
        window.cv.drawContours(
          segmentedImage,
          contours,
          i,
          new window.cv.Scalar(0, 255, 0, 220),
          2
        )
        validContourCount++
      }
    }

    // Cleanup intermediate matrices
    gray.delete()
    thresh.delete()
    opening.delete()
    closing.delete()
    kernel.delete()
    hierarchy.delete()

    console.log(`Found ${validContourCount} potential sediments in the image.`)

    return {
      originalImage: src,
      segmentedImage,
      contours,
      contourCount: validContourCount,
      success: true
    }

  } catch (error) {
    console.error('Error in digital staining:', error)
    return {
      originalImage: null,
      segmentedImage: null,
      contours: null,
      contourCount: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Converts OpenCV Mat to ImageData for canvas display
 */
export function matToImageData(mat: CVMat | null): ImageData | null {
  if (!isOpenCVReady() || !window.cv || !mat) {
    return null
  }

  try {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    canvas.width = mat.cols
    canvas.height = mat.rows

    window.cv.imshow(canvas, mat)
    return ctx.getImageData(0, 0, canvas.width, canvas.height)
  } catch (error) {
    console.error('Error converting Mat to ImageData:', error)
    return null
  }
}

/**
 * Converts OpenCV Mat to base64 image string
 */
export function matToBase64(mat: CVMat | null, format: string = 'image/png'): string | null {
  if (!isOpenCVReady() || !window.cv || !mat) {
    return null
  }

  try {
    const canvas = document.createElement('canvas')
    canvas.width = mat.cols
    canvas.height = mat.rows

    window.cv.imshow(canvas, mat)
    return canvas.toDataURL(format)
  } catch (error) {
    console.error('Error converting Mat to base64:', error)
    return null
  }
}

/**
 * Creates a dummy test image similar to the Python example
 */
export function createDummyTestImage(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 600
  canvas.height = 400
  const ctx = canvas.getContext('2d')
  
  if (!ctx) {
    throw new Error('Could not get canvas context')
  }

  // Fill with black background
  ctx.fillStyle = 'black'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Draw white shapes (simulating sediments)
  ctx.fillStyle = 'white'
  
  // Big circle
  ctx.beginPath()
  ctx.arc(200, 200, 50, 0, 2 * Math.PI)
  ctx.fill()
  
  // Smaller circle
  ctx.beginPath()
  ctx.arc(400, 250, 30, 0, 2 * Math.PI)
  ctx.fill()
  
  // Rectangle
  ctx.fillRect(100, 100, 50, 50)

  return canvas
}

/**
 * Cleanup function to free OpenCV Mat memory
 */
export function cleanupSegmentationResult(result: SegmentationResult): void {
  if (result.originalImage) {
    result.originalImage.delete()
  }
  if (result.segmentedImage) {
    result.segmentedImage.delete()
  }
  if (result.contours) {
    result.contours.delete()
  }
}
