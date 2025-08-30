'use client'

import { useState } from 'react'
import { X, Upload, Camera, Loader2, CheckCircle, AlertCircle, Brain } from 'lucide-react'
import { UrinalysisResult, getConfidenceLevel } from '@/lib/gemini'

interface ImageAnalysisModalProps {
  isOpen: boolean
  onClose: () => void
  onAnalysisComplete: (result: UrinalysisResult) => void
}

export default function ImageAnalysisModal({ isOpen, onClose, onAnalysisComplete }: ImageAnalysisModalProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<UrinalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    setError(null)
    setAnalysis(null)
    
    // Create preview URL
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleCameraCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const analyzeImage = async () => {
    if (!selectedFile) return

    setIsAnalyzing(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('image', selectedFile)

      const response = await fetch('/api/analyze-image', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze image')
      }

      setAnalysis(data.analysis)
      onAnalysisComplete(data.analysis)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleClose = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setAnalysis(null)
    setError(null)
    onClose()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'text-green-600 bg-green-100'
      case 'abnormal': return 'text-orange-600 bg-orange-100'
      case 'critical': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Brain className="h-5 w-5 mr-2 text-blue-600" />
            AI Image Analysis
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {!selectedFile ? (
            // File Selection Section
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-gray-600 mb-4">
                  Upload or capture a urine microscopy image for AI analysis
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                  <input
                    id="upload-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <label htmlFor="upload-input" className="cursor-pointer">
                    <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-medium text-gray-900">Upload Image</p>
                    <p className="text-sm text-gray-500 mt-1">Select from your device</p>
                  </label>
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-400 transition-colors">
                  <input
                    id="camera-input"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleCameraCapture}
                  />
                  <label htmlFor="camera-input" className="cursor-pointer">
                    <Camera className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-medium text-gray-900">Capture Image</p>
                    <p className="text-sm text-gray-500 mt-1">Use camera</p>
                  </label>
                </div>
              </div>
            </div>
          ) : (
            // Analysis Section
            <div className="space-y-6">
              {/* Image Preview */}
              <div className="text-center">
                <img
                  src={previewUrl!}
                  alt="Selected image"
                  className="max-w-full max-h-64 mx-auto rounded-lg border"
                />
                <p className="text-sm text-gray-500 mt-2">{selectedFile.name}</p>
              </div>

              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                    <p className="text-red-800">{error}</p>
                  </div>
                </div>
              )}

              {/* Analysis Results */}
              {analysis && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-blue-900">Analysis Complete</h3>
                        <p className="text-sm text-blue-700">
                          Confidence: {getConfidenceLevel(analysis.overall_accuracy)} ({analysis.overall_accuracy}%)
                        </p>
                      </div>
                      <CheckCircle className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Summary</h4>
                    <p className="text-sm text-gray-700">{analysis.summary}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(analysis).map(([key, value]) => {
                      if (key === 'overall_accuracy' || key === 'summary') return null
                      
                      return (
                        <div key={key} className="bg-white border rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 capitalize mb-2">
                            {key.replace('_', ' ')}
                          </h4>
                          <div className="space-y-1 text-sm">
                            <p><span className="font-medium">Count:</span> {value.count} {value.unit}</p>
                            <p><span className="font-medium">Morphology:</span> {value.morphology}</p>
                            <p><span className="font-medium">Notes:</span> {value.notes}</p>
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(value.status)}`}>
                              {value.status}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setSelectedFile(null)
                    setPreviewUrl(null)
                    setAnalysis(null)
                    setError(null)
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Choose Different Image
                </button>
                
                {!analysis && !isAnalyzing && (
                  <button
                    onClick={analyzeImage}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                  >
                    <Brain className="h-4 w-4 mr-2" />
                    Analyze Image
                  </button>
                )}

                {isAnalyzing && (
                  <button disabled className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
