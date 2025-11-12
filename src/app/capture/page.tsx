'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, StopCircle, PlayCircle, Microscope, LayoutGrid, AlertCircle } from 'lucide-react'

export default function CaptureDashboard() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsCameraOn(false)
  }, [])

  const startCamera = useCallback(async () => {
    if (isStarting || isCameraOn) return
    setIsStarting(true)
    setError(null)
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setIsCameraOn(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to access camera'
      setError(message)
    } finally {
      setIsStarting(false)
    }
  }, [isStarting, isCameraOn])

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Camera className="h-6 w-6 mr-2 text-blue-600" /> Capture Dashboard
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/report')}
              className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              <Microscope className="h-4 w-4" />
              <span>Microscopic Report</span>
            </button>
            <button
              onClick={() => router.push('/report')}
              className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              <LayoutGrid className="h-4 w-4" />
              <span>Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Quick Nav (Report) */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-3">Microscopic Report</h2>
            <p className="text-sm text-gray-600 mb-4">Review, validate, and manage test results.</p>
            <button
              onClick={() => router.push('/report')}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Microscope className="h-4 w-4" /> Go to Report
            </button>
          </div>
        </div>

        {/* Center Camera Panel */}
        <div className="lg:col-span-1 order-first lg:order-none">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-gray-900">Live Camera</span>
              </div>
              <div className="flex items-center gap-2">
                {!isCameraOn ? (
                  <button
                    onClick={startCamera}
                    disabled={isStarting}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
                  >
                    <PlayCircle className="h-4 w-4" /> Start Camera
                  </button>
                ) : (
                  <button
                    onClick={stopCamera}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    <StopCircle className="h-4 w-4" /> Stop Camera
                  </button>
                )}
              </div>
            </div>
            <div className="relative aspect-video bg-black">
              <video
                ref={videoRef}
                className="w-full h-full object-contain bg-black"
                playsInline
                muted
                autoPlay
              />
              {!isCameraOn && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Camera className="h-10 w-10 text-white/70 mx-auto mb-2" />
                    <p className="text-white/80">Camera is off. Click Start Camera.</p>
                  </div>
                </div>
              )}
            </div>
            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> {error}
              </div>
            )}
          </div>
        </div>

        {/* Right Quick Nav (Management) */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-3">Report</h2>
            <p className="text-sm text-gray-600 mb-4">Review, validate, and manage test results.</p>
            <button
              onClick={() => router.push('/report')}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black"
            >
              <LayoutGrid className="h-4 w-4" /> Go to Report
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


