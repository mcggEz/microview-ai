'use client'

import { useState, useRef, useEffect } from 'react'
import { Camera, X, RotateCcw, Check } from 'lucide-react'

interface CameraCaptureModalProps {
  isOpen: boolean
  onClose: () => void
  onCapture: (imageData: string) => void
}

export default function CameraCaptureModal({
  isOpen,
  onClose,
  onCapture
}: CameraCaptureModalProps) {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    // Cleanup function to restore scrolling when component unmounts
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && !stream) {
      startCamera()
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [isOpen])

  const startCamera = async () => {
    try {
      setError(null)
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera if available
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (err) {
      console.error('Error accessing camera:', err)
      setError('Unable to access camera. Please check permissions and try again.')
    }
  }

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')

      if (context) {
        // Set canvas size to match video dimensions
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight

        // Draw the video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height)

        // Convert to base64
        const imageData = canvas.toDataURL('image/jpeg', 0.8)
        setCapturedImage(imageData)
      }
    }
  }

  const retakePhoto = () => {
    setCapturedImage(null)
  }

  const confirmCapture = () => {
    if (capturedImage) {
      onCapture(capturedImage)
      onClose()
    }
  }

  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setCapturedImage(null)
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" onClick={handleClose}></div>
        
        <div className="relative transform overflow-hidden rounded-lg bg-white shadow-xl transition-all w-full max-w-md mt-4">
          {/* Header */}
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Camera className="h-5 w-5 mr-2" />
                Capture Image
              </h3>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            {error ? (
              <div className="text-center py-8">
                <div className="text-red-500 mb-4">
                  <Camera className="h-12 w-12 mx-auto mb-2" />
                  <p className="text-sm">{error}</p>
                </div>
                <button
                  onClick={startCamera}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : capturedImage ? (
              <div className="space-y-4">
                <div className="relative">
                  <img
                    src={capturedImage}
                    alt="Captured"
                    className="w-full h-64 object-cover rounded-lg border border-gray-200"
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={retakePhoto}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Retake</span>
                  </button>
                  <button
                    onClick={confirmCapture}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Check className="h-4 w-4" />
                    <span>Use Photo</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative bg-gray-100 rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-64 object-cover"
                  />
                  {stream && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="border-2 border-white border-dashed rounded-lg p-4">
                        <p className="text-white text-sm font-medium">Position sample in frame</p>
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={captureImage}
                  disabled={!stream}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  <Camera className="h-5 w-5" />
                  <span>Capture Photo</span>
                </button>
              </div>
            )}
          </div>

          {/* Hidden canvas for capturing */}
          <canvas ref={canvasRef} className="hidden" />
        </div>
      </div>
    </div>
  )
}
