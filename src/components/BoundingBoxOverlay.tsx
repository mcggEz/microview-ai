'use client'

import { useEffect, useRef } from 'react'

interface Detection {
  x: number
  y: number
  width: number
  height: number
  confidence: number
  class: string
  class_id: number
  detection_id: string
}

interface BoundingBoxOverlayProps {
  imageRef: React.RefObject<HTMLImageElement | null>
  detections: Detection[]
  highlightedDetectionId: string | null
  showBoundingBoxes: boolean
}

export default function BoundingBoxOverlay({
  imageRef,
  detections,
  highlightedDetectionId,
  showBoundingBoxes,
}: BoundingBoxOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!imageRef.current || !canvasRef.current || !showBoundingBoxes) {
      // Clear canvas if not showing
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
        }
      }
      return
    }

    const drawBoundingBoxes = () => {
      if (!imageRef.current || !canvasRef.current) return

      const img = imageRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')

      if (!ctx) return

    // Get container dimensions
    const containerRect = img.getBoundingClientRect()
    
    // Get image natural dimensions
    const imgNaturalWidth = img.naturalWidth
    const imgNaturalHeight = img.naturalHeight

    // Calculate actual displayed image size (accounting for object-contain)
    const containerAspect = containerRect.width / containerRect.height
    const imageAspect = imgNaturalWidth / imgNaturalHeight
    
    let displayedWidth: number
    let displayedHeight: number
    let offsetX: number
    let offsetY: number

    if (imageAspect > containerAspect) {
      // Image is wider - fit to width
      displayedWidth = containerRect.width
      displayedHeight = containerRect.width / imageAspect
      offsetX = 0
      offsetY = (containerRect.height - displayedHeight) / 2
    } else {
      // Image is taller - fit to height
      displayedWidth = containerRect.height * imageAspect
      displayedHeight = containerRect.height
      offsetX = (containerRect.width - displayedWidth) / 2
      offsetY = 0
    }

    // Set canvas size to match container
    if (canvas.width !== containerRect.width || canvas.height !== containerRect.height) {
      canvas.width = containerRect.width
      canvas.height = containerRect.height
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Calculate scale factors based on displayed image size
    const scaleX = displayedWidth / imgNaturalWidth
    const scaleY = displayedHeight / imgNaturalHeight

    // Class colors
    const colors: Record<string, string> = {
      cast: '#00FF00', // Green
      cryst: '#FFFF00', // Yellow
      epith: '#FF00FF', // Magenta
      epithn: '#0000FF', // Blue
      eryth: '#00FFFF', // Cyan
      leuko: '#FFA500', // Orange
      mycete: '#FF00FF', // Magenta
    }

    // Draw bounding boxes
    detections.forEach((detection) => {
      const isHighlighted = detection.detection_id === highlightedDetectionId
      const color = colors[detection.class] || '#FFFFFF'
      
      // Scale coordinates to displayed image size, then add offset
      const x = detection.x * scaleX + offsetX
      const y = detection.y * scaleY + offsetY
      const width = detection.width * scaleX
      const height = detection.height * scaleY

      // Draw bounding box
      ctx.strokeStyle = isHighlighted ? '#FF0000' : color // Red if highlighted
      ctx.lineWidth = isHighlighted ? 4 : 2
      ctx.strokeRect(x, y, width, height)

      // Draw label if highlighted
      if (isHighlighted) {
        const label = `${detection.class} ${(detection.confidence * 100).toFixed(1)}%`
        ctx.font = '14px Arial'
        ctx.fillStyle = '#FF0000'
        ctx.fillText(label, x, Math.max(y - 5, 15))
      }
    })
    }

    // Draw initially
    drawBoundingBoxes()

    // Redraw on window resize
    const handleResize = () => {
      drawBoundingBoxes()
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [imageRef, detections, highlightedDetectionId, showBoundingBoxes])

  if (!showBoundingBoxes || detections.length === 0) {
    return null
  }

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full pointer-events-none z-10"
      style={{ objectFit: 'contain' }}
    />
  )
}

