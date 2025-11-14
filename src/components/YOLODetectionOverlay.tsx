'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

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

interface DetectionResult {
  success: boolean
  predictions: Detection[]
  summary: {
    total_detections: number
    by_class: Record<string, number>
  }
}

interface YOLODetectionOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement | null>
  isActive: boolean
  confThreshold: number
  detectionInterval: number
  showOverlay: boolean
  showBoundingBox: boolean
  showCrystalName: boolean
}

export default function YOLODetectionOverlay({
  videoRef,
  isActive,
  confThreshold,
  detectionInterval,
  showOverlay,
  showBoundingBox,
  showCrystalName,
}: YOLODetectionOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number | undefined>(undefined)
  const lastDetectionTime = useRef<number>(0)
  const [isDetecting, setIsDetecting] = useState(false)
  const [detections, setDetections] = useState<DetectionResult | null>(null)
  const lastFrameTime = useRef<number>(0)
  const targetFPS = 30
  const frameInterval = 1000 / targetFPS

  // Detect sediments in current frame
  const detectFrame = useCallback(async () => {
    if (!videoRef.current || isDetecting || !isActive) return

    const video = videoRef.current
    if (video.readyState !== video.HAVE_ENOUGH_DATA) return

    const now = Date.now()
    if (now - lastDetectionTime.current < detectionInterval) {
      return // Skip if too soon (throttled detection)
    }

    setIsDetecting(true)
    lastDetectionTime.current = now

    try {
      // Use temporary canvas for API call
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = video.videoWidth
      tempCanvas.height = video.videoHeight
      const tempCtx = tempCanvas.getContext('2d')
      
      if (!tempCtx) {
        setIsDetecting(false)
        return
      }

      // Draw current video frame to temporary canvas
      tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height)

      // Convert to blob for API
      tempCanvas.toBlob(async (blob) => {
        if (!blob) {
          setIsDetecting(false)
          return
        }

        // Create FormData
        const formData = new FormData()
        const file = new File([blob], 'frame.jpg', { type: 'image/jpeg' })
        formData.append('image', file)
        formData.append('conf', confThreshold.toString())

        // Call API
        const response = await fetch('/api/detect-sediments', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error('Detection failed')
        }

        const data: DetectionResult = await response.json()
        setDetections(data)

        setIsDetecting(false)
      }, 'image/jpeg', 0.8)
    } catch (err) {
      console.error('Detection error:', err)
      setIsDetecting(false)
    }
  }, [confThreshold, detectionInterval, isDetecting, isActive, videoRef])

  // Draw bounding boxes on canvas
  const drawBoundingBoxes = useCallback(
    (
      predictions: Detection[],
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number
    ) => {
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

      predictions.forEach((pred) => {
        const color = colors[pred.class] || '#FFFFFF'

        // Draw bounding box if enabled
        if (showBoundingBox) {
          ctx.strokeStyle = color
          ctx.lineWidth = 2
          ctx.strokeRect(pred.x, pred.y, pred.width, pred.height)
        }

        // Draw label if enabled
        if (showCrystalName) {
          const label = `${pred.class} ${(pred.confidence * 100).toFixed(1)}%`
          ctx.font = '14px Arial'
          const textMetrics = ctx.measureText(label)
          const labelHeight = 20
          const labelY = Math.max(pred.y, labelHeight)

          ctx.fillStyle = color
          ctx.fillRect(pred.x, labelY - labelHeight, textMetrics.width + 10, labelHeight)

          // Draw label text
          ctx.fillStyle = '#000000'
          ctx.fillText(label, pred.x + 5, labelY - 5)
        }
      })
    },
    [showBoundingBox, showCrystalName]
  )

  // Animation loop - draw overlay on top of video
  useEffect(() => {
    if (!isActive || !showOverlay) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      // Clear canvas when overlay is disabled
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
        }
      }
      return
    }

    let lastFrameTime = Date.now()

    const animate = () => {
      const now = Date.now()
      const elapsed = now - lastFrameTime

      // Throttle overlay rendering to 30 FPS
      if (elapsed >= frameInterval) {
        lastFrameTime = now

        // Update canvas size to match video and clear it
        if (videoRef.current && canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d')
          if (ctx && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            // Set canvas size to match video
            if (
              canvasRef.current.width !== videoRef.current.videoWidth ||
              canvasRef.current.height !== videoRef.current.videoHeight
            ) {
              canvasRef.current.width = videoRef.current.videoWidth
              canvasRef.current.height = videoRef.current.videoHeight
            }
            
            // Clear canvas (transparent overlay - video shows through)
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
            
            // Draw bounding boxes if we have detections
            if (detections && detections.predictions.length > 0) {
              drawBoundingBoxes(
                detections.predictions,
                ctx,
                canvasRef.current.width,
                canvasRef.current.height
              )
            }
          }
        }
      }

      // Try to detect (separate throttling - will skip if too soon)
      detectFrame()

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isActive, showOverlay, detectFrame, detections, drawBoundingBoxes, videoRef])

  if (!showOverlay) {
    return null
  }

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full pointer-events-none z-10"
      style={{ objectFit: 'cover' }}
    />
  )
}

