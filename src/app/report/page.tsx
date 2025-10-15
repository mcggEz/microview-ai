'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useMemo, useRef, Suspense } from 'react'

// OpenCV.js type declaration
declare global {
  interface Window {
    cv: any
  }
}
import { useRouter } from 'next/navigation'
import { useDashboard } from '@/hooks/useDashboard'
import { updatePatient, updateTest, testDatabaseConnection, deleteTest, deleteImageFromTest, deleteImageFromStorage, addImageToTest, uploadImageToStorage, uploadBase64Image, getImageAnalysisByIndex, upsertImageAnalysis, deleteImageAnalysisByTest, deleteImageAnalysisByImage } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { loadOpenCV, isOpenCVReady } from '@/lib/opencv-loader'
import { applyDigitalStain, matToImageData, cleanupSegmentationResult, type SegmentationResult } from '@/lib/digital-staining'
import type { LPFSedimentDetection, HPFSedimentDetection } from '@/lib/gemini'
import { Calendar, Download, Microscope, Edit, CheckCircle, Save, X, Plus, Camera, Trash2, ChevronDown, Upload, ChevronLeft, ChevronRight, Search, ArrowLeft, Menu, RefreshCw } from 'lucide-react'
import ImageModal from '@/components/ImageModal'
import ConfirmationModal from '@/components/ConfirmationModal'
import CameraCaptureModal from '@/components/CameraCaptureModal'
import Notification from '@/components/Notification'
import Image from 'next/image'
import { UrineTest } from '@/types/database'

interface MicroscopicFindings {
  item: string
  count: string
  unit: string
  morphology: string
  notes: string
  status: 'normal' | 'abnormal' | 'critical'
  accuracy: number
  isEditing: boolean
}

export default function Report() {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState('')
  const [modalImage, setModalImage] = useState<{ src: string; alt: string; title: string } | null>(null)
  const [imageErrors, setImageErrors] = useState<{ [key: string]: boolean }>({})
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    patientName: '',
    patientAge: '',
    patientGender: 'male' as 'male' | 'female' | 'other',
    collectionTime: '',
    technician: ''
  })
  const [saving, setSaving] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null) // Used in handleImageCapture - keeping for future use
  const [capturedImages, setCapturedImages] = useState<string[]>([]) // Store multiple captured images
  const [focusMode, setFocusMode] = useState<'field' | 'report'>('field') // Focus mode for UI
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showNotification, setShowNotification] = useState(false)
  const [notificationMessage, setNotificationMessage] = useState('')
  const [notificationType, setNotificationType] = useState<'success' | 'error' | 'warning' | 'info'>('success')
  
  const [searchQuery, setSearchQuery] = useState('')

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showHeader, setShowHeader] = useState(true)
  const [liveStreamActive, setLiveStreamActive] = useState(false)
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [scopeMask, setScopeMask] = useState(true)
  const [overlayEnabled, setOverlayEnabled] = useState(false)
  const [objectCount, setObjectCount] = useState(0)
  
  const [isAddingTestImage, setIsAddingTestImage] = useState(false)
  
  const [opencvReady, setOpencvReady] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [powerMode, setPowerMode] = useState<'high' | 'low'>('low')
  const [highPowerImages, setHighPowerImages] = useState<string[]>([])
  const [lowPowerImages, setLowPowerImages] = useState<string[]>([])
  const [currentLPFIndex, setCurrentLPFIndex] = useState(0)
  const [currentHPFIndex, setCurrentHPFIndex] = useState(0)
  const [dateParam, setDateParam] = useState<string | null>(null)
  
  // AI Generated values state for Strasinger table
  const [aiGeneratedValues, setAiGeneratedValues] = useState({
    epithelialCells: '0-5',
    crystalsNormal: '0-2',
    bacteria: '0-10',
    mucusThreads: '0-1',
    casts: '0-2',
    rbcs: '0-2',
    wbcs: '0-2',
    squamousEpithelial: 'Rare',
    transitionalEpithelial: 'Rare',
    renalTubular: '0-1',
    ovalFatBodies: '0',
    abnormalCrystals: '0'
  })

  // Text-only Urinalysis Summary (after Strasinger)
  const [urinalysisText, setUrinalysisText] = useState({
    color: '',
    transparency: '',
    specificGravity: '',
    ph: '',
    protein: '',
    glucose: '',
    rbc: '',
    pusCells: '',
    epithelialCells: '',
    bacteria: '',
    remarks: ''
  })

  const updateUrinalysisText = (key: keyof typeof urinalysisText, value: string) => {
    setUrinalysisText(prev => ({ ...prev, [key]: value }))
  }

  // LPF Sediment Detection state - per image
  const [lpfSedimentDetection, setLpfSedimentDetection] = useState<LPFSedimentDetection | null>(null)
  const [isAnalyzingLPF, setIsAnalyzingLPF] = useState<{ [imageIndex: number]: boolean }>({})

  // HPF Sediment Detection state - per image
  const [hpfSedimentDetection, setHpfSedimentDetection] = useState<HPFSedimentDetection | null>(null)
  const [isAnalyzingHPF, setIsAnalyzingHPF] = useState<{ [imageIndex: number]: boolean }>({})
  
  
  // State to prevent analysis during image deletion
  const [isDeletingImage, setIsDeletingImage] = useState(false)
  
  // AbortController for canceling ongoing Gemini requests
  const [lpfAbortController, setLpfAbortController] = useState<AbortController | null>(null)
  const [hpfAbortController, setHpfAbortController] = useState<AbortController | null>(null)

  // Helper function to create dropdown options based on sediment type
  const getDropdownOptions = (type: string) => {
    const options = {
      epithelialCells: ['0', '0-5', '5-20', '20-100', '>100'],
      crystalsNormal: ['0', '0-2', '2-5', '5-20', '>20'],
      bacteria: ['0', '0-10', '10-50', '50-200', '>200'],
      mucusThreads: ['0', '0-1', '1-3', '3-10', '>10'],
      casts: ['0', '0-2', '2-5', '5-10', '>10'],
      rbcs: ['0', '0-2', '2-5', '5-10', '10-25', '25-50', '50-100', '>100'],
      wbcs: ['0', '0-2', '2-5', '5-10', '10-25', '25-50', '50-100', '>100'],
      squamousEpithelial: ['None', 'Rare', 'Few', 'Moderate', 'Many'],
      transitionalEpithelial: ['None', 'Rare', 'Few', 'Moderate', 'Many'],
      renalTubular: ['0', '0-1', '1-3', '3-5', '>5'],
      ovalFatBodies: ['0', '0-1', '1-3', '3-5', '>5'],
      abnormalCrystals: ['0', '0-1', '1-3', '3-5', '>5']
    }
    return options[type as keyof typeof options] || ['0']
  }

  // Helper function to update AI generated value
  const updateAiValue = async (key: string, value: string) => {
    setAiGeneratedValues(prev => ({
      ...prev,
      [key]: value
    }))
    
    // Save to database if we have a selected test
    if (selectedTest) {
      try {
        const fieldMapping: { [key: string]: string } = {
          epithelialCells: 'ai_epithelial_cells_count',
          crystalsNormal: 'ai_crystals_normal_count',
          bacteria: 'ai_bacteria_count',
          mucusThreads: 'ai_mucus_threads_count',
          casts: 'ai_casts_count',
          rbcs: 'ai_rbcs_count',
          wbcs: 'ai_wbcs_count',
          squamousEpithelial: 'ai_squamous_epithelial_cells_count',
          transitionalEpithelial: 'ai_transitional_epithelial_cells_count',
          renalTubular: 'ai_renal_tubular_epithelial_cells_count',
          ovalFatBodies: 'ai_oval_fat_bodies_count',
          abnormalCrystals: 'ai_abnormal_crystals_casts_count'
        }
        
        const dbField = fieldMapping[key]
        if (dbField) {
          const { error } = await supabase
            .from('urine_tests')
            .update({ [dbField]: value })
            .eq('id', selectedTest.id)
          
          if (error) {
            console.error('Error saving AI value:', error)
            setNotificationMessage('Failed to save AI value')
            setNotificationType('error')
            setShowNotification(true)
          } else {
            console.log(`Saved AI value: ${key} = ${value}`)
          }
        }
      } catch (error) {
        console.error('Error updating AI value:', error)
        setNotificationMessage('Failed to save AI value')
        setNotificationType('error')
        setShowNotification(true)
      }
    }
  }

  // Function to analyze LPF image for sediments - ONLY for current image
  const analyzeLPFImage = async (imageUrl: string, imageIndex: number) => {
    if (!imageUrl || !selectedTest) return

    console.log(`🔬 Starting LPF analysis for image ${imageIndex + 1} (URL: ${imageUrl.substring(0, 50)}...)`)
    
    // Cancel any existing LPF request
    if (lpfAbortController) {
      console.log('🛑 Canceling previous LPF request')
      lpfAbortController.abort()
    }
    
    // Create new AbortController for this request
    const abortController = new AbortController()
    setLpfAbortController(abortController)
    
    setIsAnalyzingLPF(prev => ({ ...prev, [imageIndex]: true }))
    try {
      // Convert image URL to File object
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const file = new File([blob], 'lpf-image.jpg', { type: 'image/jpeg' })

      console.log(`📤 Sending LPF image ${imageIndex + 1} to server API...`)
      const form = new FormData()
      form.append('image', file)
      const res = await fetch('/api/analyze-lpf', { method: 'POST', body: form, signal: abortController.signal })
      if (!res.ok) throw new Error('LPF API failed')
      const { detection } = await res.json() as { success: boolean; detection: LPFSedimentDetection }
      console.log(`✅ LPF analysis complete for image ${imageIndex + 1}:`, detection)
      console.log('📝 New LPF Analysis text:', detection.analysis_notes)
      setLpfSedimentDetection(detection)

      // Save to individual image analysis table
      try {
        await upsertImageAnalysis({
          test_id: selectedTest.id,
          power_mode: 'LPF',
          image_index: imageIndex,
          image_url: imageUrl,
          lpf_epithelial_cells: detection.epithelial_cells,
          lpf_mucus_threads: detection.mucus_threads,
          lpf_casts: detection.casts,
          lpf_squamous_epithelial: detection.squamous_epithelial,
          lpf_abnormal_crystals: detection.abnormal_crystals,
          confidence: detection.confidence,
          analysis_notes: detection.analysis_notes,
          analyzed_at: new Date().toISOString()
        })
        console.log('LPF AI analysis saved to individual image analysis table')
        setNotificationMessage('LPF image analyzed and saved successfully')
        setNotificationType('success')
        setShowNotification(true)
      } catch (dbError) {
        console.warn('Database save failed, but analysis completed:', dbError)
        setNotificationMessage('Analysis completed (database issue - check console for details)')
        setNotificationType('warning')
        setShowNotification(true)
      }

      console.log('LPF Sediment Detection:', detection)
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('🛑 LPF analysis cancelled for image', imageIndex + 1)
        return // Don't show error for cancelled requests
      }
      console.error('Error analyzing LPF image:', error)
      setNotificationMessage('Failed to analyze LPF image')
      setNotificationType('error')
      setShowNotification(true)
    } finally {
      setIsAnalyzingLPF(prev => ({ ...prev, [imageIndex]: false }))
      setLpfAbortController(null) // Clear the abort controller
    }
  }

  // Function to analyze HPF image for sediments - ONLY for current image
  const analyzeHPFImage = async (imageUrl: string, imageIndex: number) => {
    if (!imageUrl || !selectedTest) return

    console.log(`🔬 Starting HPF analysis for image ${imageIndex + 1} (URL: ${imageUrl.substring(0, 50)}...)`)
    
    // Cancel any existing HPF request
    if (hpfAbortController) {
      console.log('🛑 Canceling previous HPF request')
      hpfAbortController.abort()
    }
    
    // Create new AbortController for this request
    const abortController = new AbortController()
    setHpfAbortController(abortController)
    
    setIsAnalyzingHPF(prev => ({ ...prev, [imageIndex]: true }))
    try {
      // Convert image URL to File object
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const file = new File([blob], 'hpf-image.jpg', { type: 'image/jpeg' })

      console.log(`📤 Sending HPF image ${imageIndex + 1} to server API...`)
      const form = new FormData()
      form.append('image', file)
      const res = await fetch('/api/analyze-hpf', { method: 'POST', body: form, signal: abortController.signal })
      if (!res.ok) throw new Error('HPF API failed')
      const { detection } = await res.json() as { success: boolean; detection: HPFSedimentDetection }
      console.log(`✅ HPF analysis complete for image ${imageIndex + 1}:`, detection)
      console.log('📝 New HPF Analysis text:', detection.analysis_notes)
      setHpfSedimentDetection(detection)

      // Save to individual image analysis table
      try {
        await upsertImageAnalysis({
          test_id: selectedTest.id,
          power_mode: 'HPF',
          image_index: imageIndex,
          image_url: imageUrl,
          hpf_rbc: detection.rbc,
          hpf_wbc: detection.wbc,
          hpf_epithelial_cells: detection.epithelial_cells,
          hpf_crystals: detection.crystals,
          hpf_bacteria: detection.bacteria,
          hpf_yeast: detection.yeast,
          hpf_sperm: detection.sperm,
          hpf_parasites: detection.parasites,
          confidence: detection.confidence,
          analysis_notes: detection.analysis_notes,
          analyzed_at: new Date().toISOString()
        })
        console.log('HPF AI analysis saved to individual image analysis table')
        setNotificationMessage('HPF image analyzed and saved successfully')
        setNotificationType('success')
        setShowNotification(true)
      } catch (dbError) {
        console.warn('Database save failed, but analysis completed:', dbError)
        setNotificationMessage('Analysis completed (database issue - check console for details)')
        setNotificationType('warning')
        setShowNotification(true)
      }

      console.log('HPF Sediment Detection:', detection)
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('🛑 HPF analysis cancelled for image', imageIndex + 1)
        return // Don't show error for cancelled requests
      }
      console.error('Error analyzing HPF image:', error)
      setNotificationMessage('Failed to analyze HPF image')
      setNotificationType('error')
      setShowNotification(true)
    } finally {
      setIsAnalyzingHPF(prev => ({ ...prev, [imageIndex]: false }))
      setHpfAbortController(null) // Clear the abort controller
    }
  }

  const {
    patients,
    selectedPatient,
    tests,
    selectedTest,
    loading,
    error,
    // selectPatient, // Unused but kept for potential future use
    setSelectedTest,
    setSelectedPatient,
    clearError,
    preloadByDate,
    addPatientWithTest
  } = useDashboard()

  // Function to generate shareable URL for current test
  const getShareableUrl = () => {
    if (selectedTest && typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('test', selectedTest.id)
      if (dateParam) {
        url.searchParams.set('date', dateParam)
      }
      return url.toString()
    }
    return window.location.href
  }

  useEffect(() => {
    if (dateParam) {
      console.log('Report page: Loading data for date:', dateParam)
      setSelectedDate(dateParam)
      preloadByDate(dateParam)
    } else {
      // Set default to current date if no date param
      const today = new Date().toISOString().split('T')[0]
      setSelectedDate(today)
      preloadByDate(today)
    }
  }, [dateParam, preloadByDate])

  // Initialize date parameter from URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search)
      setDateParam(sp.get('date'))
    }
  }, [])


  // Update URL when test is selected
  useEffect(() => {
    if (selectedTest && typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('test', selectedTest.id)
      // Keep the date parameter if it exists
      if (dateParam) {
        url.searchParams.set('date', dateParam)
      }
      // Update URL without page reload
      window.history.replaceState({}, '', url.toString())
    }
  }, [selectedTest, dateParam])

  // Select test from URL parameter when tests are loaded
  useEffect(() => {
    if (tests.length > 0 && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const testIdFromUrl = urlParams.get('test')
      
      if (testIdFromUrl) {
        // Find the test with the ID from URL
        const testFromUrl = tests.find(test => test.id === testIdFromUrl)
        if (testFromUrl && testFromUrl.id !== selectedTest?.id) {
          console.log('Selecting test from URL:', testFromUrl.test_code)
          setSelectedTest(testFromUrl)
          
          // Also set the patient for this test
          const testPatient = patients.find(p => p.id === testFromUrl.patient_id)
          if (testPatient) {
            setSelectedPatient(testPatient)
          }
        }
      }
    }
  }, [tests, patients, selectedTest])


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'text-green-600 bg-green-100'
      case 'abnormal': return 'text-orange-600 bg-orange-100'
      case 'critical': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy === 0) return 'text-gray-500 bg-gray-100'
    if (accuracy >= 95) return 'text-green-600 bg-green-100'
    if (accuracy >= 90) return 'text-yellow-600 bg-yellow-100'
    if (accuracy >= 80) return 'text-orange-600 bg-orange-100'
    return 'text-red-600 bg-red-100'
  }

  const [dummy, setDummy] = useState(0) // Used to trigger re-renders - keeping for future use
  const toggleEdit = () => setDummy(prev => prev + 1)


  // Search and filter tests by date and search query
  const filteredTests = useMemo(() => {
    let filtered = tests

    // Filter by date first
    if (selectedDate) {
      filtered = filtered.filter(test => {
        const testDate = test.analysis_date?.split('T')[0] || test.created_at?.split('T')[0]
        return testDate === selectedDate
      })
    }

    // Then filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(test => {
        const patient = patients.find(p => p.id === test.patient_id)
        return (
          patient?.name.toLowerCase().includes(query) ||
          patient?.patient_id.toLowerCase().includes(query) ||
          test.test_code.toLowerCase().includes(query)
        )
      })
    }

    return filtered
  }, [tests, patients, searchQuery, selectedDate])

  // Initialize edit data when patient/test changes
  useEffect(() => {
    if (selectedPatient && selectedTest) {
      setEditData({
        patientName: selectedPatient.name,
        patientAge: selectedPatient.age.toString(),
        patientGender: selectedPatient.gender,
        collectionTime: selectedTest.collection_time || '',
        technician: selectedTest.technician || ''
      })
    }
  }, [selectedPatient, selectedTest])

  // Auto-start camera on component mount
  useEffect(() => {
    startLiveCamera()
    return () => {
      // Cleanup on unmount
      try {
        mediaStream?.getTracks().forEach(t => t.stop())
      } catch {}
    }
  }, [])

  // Start live camera
  const startLiveCamera = async () => {
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setNotificationMessage('Camera not supported in this environment.')
        setNotificationType('error')
        setShowNotification(true)
        return
      }
      let stream: MediaStream | null = null
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        })
      } catch (e) {
        // Fallback to any camera
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      }
      setMediaStream(stream)
      if (videoRef.current) {
        const elem = videoRef.current
        // @ts-ignore - srcObject is supported in browsers
        elem.srcObject = stream
        elem.onloadedmetadata = async () => {
          try { await elem.play() } catch {}
        }
      }
      setLiveStreamActive(true)
    } catch (err) {
      console.error('Failed to start camera:', err)
      setNotificationMessage('Failed to start camera. Please check permissions.')
      setNotificationType('error')
      setShowNotification(true)
    }
  }

  // Capture image from camera
  const captureImage = async () => {
    if (!videoRef.current || !mediaStream || !selectedTest) {
      setNotificationMessage('Please select a test first')
      setNotificationType('error')
      setShowNotification(true)
      return
    }
    
    // Check image limit based on current power mode
    const currentImageCount = powerMode === 'high' ? highPowerImages.length : lowPowerImages.length
    if (currentImageCount >= 10) {
      setNotificationMessage(`Maximum of 10 ${powerMode === 'high' ? 'HPF' : 'LPF'} images reached. Please delete some images before adding more.`)
      setNotificationType('error')
      setShowNotification(true)
      return
    }
    
    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      ctx.drawImage(videoRef.current, 0, 0)
      
      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob)
        }, 'image/jpeg', 0.8)
      })
      
      // Create a File object from the blob
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const powerType = powerMode === 'high' ? 'hpf' : 'lpf'
      const filename = `${powerType}-${selectedTest.test_code}-${timestamp}.jpg`
      const file = new File([blob], filename, { type: 'image/jpeg' })
      
      // Upload to Supabase storage
      const imageUrl = await uploadImageToStorage(file, selectedTest.id, 'microscopic')
      
      if (imageUrl) {
        console.log(`📸 Capturing new ${powerType.toUpperCase()} image...`)
        
        // Add image to test record with correct power type
        await addImageToTest(selectedTest.id, imageUrl, powerType)
        
        // Clear existing analysis data for new image
        if (powerMode === 'high') {
          setHpfSedimentDetection(null)
          setIsAnalyzingHPF({})
        } else {
          setLpfSedimentDetection(null)
          setIsAnalyzingLPF({})
        }
        
        // Update local state based on power mode
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8)
        if (powerMode === 'high') {
          setHighPowerImages(prev => {
            const newImages = [...prev, imageDataUrl]
            setCurrentHPFIndex(newImages.length - 1)
            console.log(`📸 HPF image captured, new index: ${newImages.length - 1}`)
            return newImages
          })
        } else {
          setLowPowerImages(prev => {
            const newImages = [...prev, imageDataUrl]
            setCurrentLPFIndex(newImages.length - 1)
            console.log(`📸 LPF image captured, new index: ${newImages.length - 1}`)
            return newImages
          })
        }
        
        // Check if we've reached 10 LPF images and auto-switch to HPF
        if (powerMode === 'low' && lowPowerImages.length + 1 >= 10) {
          setPowerMode('high')
          setNotificationMessage(`✅ Captured LPF image ${lowPowerImages.length + 1}/10. Automatically switched to HPF mode for detailed analysis.`)
          setNotificationType('success')
        } else {
          setNotificationMessage(`Image captured and saved successfully! (${currentImageCount + 1}/10 ${powerMode === 'high' ? 'HPF' : 'LPF'})`)
          setNotificationType('success')
        }
        setShowNotification(true)
        
        // Refresh test data
        if (dateParam) {
          await preloadByDate(dateParam)
        }
      } else {
        throw new Error('Failed to upload image')
      }
    } catch (error) {
      console.error('Error capturing image:', error)
      setNotificationMessage('Failed to capture and save image')
      setNotificationType('error')
      setShowNotification(true)
    }
  }

  // Remove captured image
  const removeCapturedImage = async (index: number, powerType: 'high' | 'low') => {
    if (!selectedTest) return
    
    console.log(`🗑️ Deleting ${powerType.toUpperCase()} image at index ${index}`)
    
    // Cancel any ongoing analysis requests
    if (powerType === 'low' && lpfAbortController) {
      console.log('🛑 Canceling ongoing LPF analysis request')
      lpfAbortController.abort()
      setLpfAbortController(null)
    } else if (powerType === 'high' && hpfAbortController) {
      console.log('🛑 Canceling ongoing HPF analysis request')
      hpfAbortController.abort()
      setHpfAbortController(null)
    }
    
    setIsDeletingImage(true)
    try {
      // Get the correct image array based on power type
      const imageArray = powerType === 'high' ? highPowerImages : lowPowerImages
      const imageUrl = imageArray[index]
      
      if (imageUrl) {
        // Remove from Supabase storage
        await deleteImageFromStorage(imageUrl)
        
        // Remove from test record with correct power type
        const dbPowerType = powerType === 'high' ? 'hpf' : 'lpf'
        await deleteImageFromTest(selectedTest.id, imageUrl, dbPowerType)
        
        // Update local state based on power type
        if (powerType === 'high') {
          const newImages = highPowerImages.filter((_, i) => i !== index)
          setHighPowerImages(newImages)
          
          // Adjust current index if needed
          if (currentHPFIndex >= newImages.length && newImages.length > 0) {
            setCurrentHPFIndex(newImages.length - 1)
          } else if (newImages.length === 0) {
            setCurrentHPFIndex(0)
          }
        } else {
          const newImages = lowPowerImages.filter((_, i) => i !== index)
          setLowPowerImages(newImages)
          
          // Adjust current index if needed
          if (currentLPFIndex >= newImages.length && newImages.length > 0) {
            setCurrentLPFIndex(newImages.length - 1)
          } else if (newImages.length === 0) {
            setCurrentLPFIndex(0)
          }
        }
        
        // Delete individual image analysis for this specific image
        try {
          await deleteImageAnalysisByImage(selectedTest.id, powerType === 'high' ? 'HPF' : 'LPF', index)
        } catch (error) {
          console.warn('Error deleting individual image analysis:', error)
        }

        // Clear AI analysis data if this was the last image
        const remainingImages = powerType === 'high' ? highPowerImages.filter((_, i) => i !== index) : lowPowerImages.filter((_, i) => i !== index)
        if (remainingImages.length === 0) {
          // Clear local state when no images remain
          if (powerType === 'low') {
            setLpfSedimentDetection(null)
          } else {
            setHpfSedimentDetection(null)
          }
        }
        // Note: useEffect hooks will automatically handle analysis for remaining images
        
        // Refresh test data
        if (dateParam) {
          await preloadByDate(dateParam)
        }
        
        setNotificationMessage('Image deleted successfully!')
        setNotificationType('success')
        setShowNotification(true)
      }
    } catch (error) {
      console.error('Error removing image:', error)
      setNotificationMessage('Failed to delete image')
      setNotificationType('error')
      setShowNotification(true)
    } finally {
      setIsDeletingImage(false)
    }
  }

  // Function to handle LPF image upload
  const handleLPFImageUpload = async (file: File) => {
    if (!selectedTest) return

    try {
      console.log('📤 Uploading new LPF image...')
      
      // Upload image to Supabase storage
      const imagePath = await uploadImageToStorage(file, selectedTest.id, 'lpf')
      
      // Add image to test record
      const updatedTest = await addImageToTest(selectedTest.id, imagePath, 'lpf')
      
      // Clear existing analysis data for new image
      setLpfSedimentDetection(null)
      setIsAnalyzingLPF({})
      
      // Update local state
      setLowPowerImages(prev => {
        const newImages = [...prev, imagePath]
        // Set current index to the new image (last in array)
        setCurrentLPFIndex(newImages.length - 1)
        console.log(`📸 LPF image added, new index: ${newImages.length - 1}`)
        return newImages
      })

      setNotificationMessage('LPF image uploaded successfully!')
      setNotificationType('success')
      setShowNotification(true)

      // Refresh test data
      if (dateParam) {
        await preloadByDate(dateParam)
      }
    } catch (error) {
      console.error('Error uploading LPF image:', error)
      setNotificationMessage('Failed to upload LPF image')
      setNotificationType('error')
      setShowNotification(true)
    }
  }

  // Function to handle HPF image upload
  const handleHPFImageUpload = async (file: File) => {
    if (!selectedTest) return

    try {
      console.log('📤 Uploading new HPF image...')
      
      // Upload image to Supabase storage
      const imagePath = await uploadImageToStorage(file, selectedTest.id, 'hpf')
      
      // Add image to test record
      const updatedTest = await addImageToTest(selectedTest.id, imagePath, 'hpf')
      
      // Clear existing analysis data for new image
      setHpfSedimentDetection(null)
      setIsAnalyzingHPF({})
      
      // Update local state
      setHighPowerImages(prev => {
        const newImages = [...prev, imagePath]
        // Set current index to the new image (last in array)
        setCurrentHPFIndex(newImages.length - 1)
        console.log(`📸 HPF image added, new index: ${newImages.length - 1}`)
        return newImages
      })

      setNotificationMessage('HPF image uploaded successfully!')
      setNotificationType('success')
      setShowNotification(true)

      // Refresh test data
      if (dateParam) {
        await preloadByDate(dateParam)
      }
    } catch (error) {
      console.error('Error uploading HPF image:', error)
      setNotificationMessage('Failed to upload HPF image')
      setNotificationType('error')
      setShowNotification(true)
    }
  }

  // Helper function to format sediment count display
  const formatSedimentCount = (count: number | undefined, isAnalyzing: boolean): string => {
    if (isAnalyzing) return ''
    if (count === undefined || count === null) return 'None'
    if (count === 0) return 'None'
    return count.toString()
  }

  // Function to recount AI analysis for current specific image
  const recountImage = async (powerMode: 'low' | 'high') => {
    if (!selectedTest) return

    try {
      // Clear existing AI analysis data for the current specific image only
      if (powerMode === 'low' && lowPowerImages.length > 0) {
        await deleteImageAnalysisByImage(selectedTest.id, 'LPF', currentLPFIndex)
        setLpfSedimentDetection(null)
        // Re-analyze the current LPF image
        analyzeLPFImage(lowPowerImages[currentLPFIndex], currentLPFIndex)
      } else if (powerMode === 'high' && highPowerImages.length > 0) {
        await deleteImageAnalysisByImage(selectedTest.id, 'HPF', currentHPFIndex)
        setHpfSedimentDetection(null)
        // Re-analyze the current HPF image
        analyzeHPFImage(highPowerImages[currentHPFIndex], currentHPFIndex)
      }

      setNotificationMessage(`${powerMode.toUpperCase()} image recounted successfully`)
      setNotificationType('success')
      setShowNotification(true)
    } catch (error) {
      console.error('Error recounting image:', error)
      setNotificationMessage('Failed to recount image')
      setNotificationType('error')
      setShowNotification(true)
    }
  }


  // Function to save individual LPF count to database
  const saveLPFCountToDatabase = async (field: keyof LPFSedimentDetection, value: number) => {
    if (!selectedTest || !lpfSedimentDetection) return

    try {
      const imageIndex = currentLPFIndex
      const imageUrl = lowPowerImages[currentLPFIndex]
      
      // Update LPF detection with new value
      const updatedDetection = { 
        ...lpfSedimentDetection, 
        [field]: value
      } as LPFSedimentDetection
      
      // Save to database
      await upsertImageAnalysis({
        test_id: selectedTest.id,
        power_mode: 'LPF',
        image_index: imageIndex,
        image_url: imageUrl,
        lpf_epithelial_cells: updatedDetection.epithelial_cells,
        lpf_mucus_threads: updatedDetection.mucus_threads,
        lpf_casts: updatedDetection.casts,
        lpf_squamous_epithelial: updatedDetection.squamous_epithelial,
        lpf_abnormal_crystals: updatedDetection.abnormal_crystals,
        confidence: updatedDetection.confidence,
        analysis_notes: (updatedDetection.analysis_notes || '') + ' (Manually corrected)',
        analyzed_at: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error saving LPF count to database:', error)
    }
  }

  // Function to save individual HPF count to database
  const saveHPFCountToDatabase = async (field: keyof HPFSedimentDetection, value: number) => {
    if (!selectedTest || !hpfSedimentDetection) return

    try {
      const imageIndex = currentHPFIndex
      const imageUrl = highPowerImages[currentHPFIndex]
      
      // Update HPF detection with new value
      const updatedDetection = { 
        ...hpfSedimentDetection, 
        [field]: value
      } as HPFSedimentDetection
      
      // Save to database
      await upsertImageAnalysis({
        test_id: selectedTest.id,
        power_mode: 'HPF',
        image_index: imageIndex,
        image_url: imageUrl,
        hpf_rbc: updatedDetection.rbc,
        hpf_wbc: updatedDetection.wbc,
        hpf_epithelial_cells: updatedDetection.epithelial_cells,
        hpf_crystals: updatedDetection.crystals,
        hpf_bacteria: updatedDetection.bacteria,
        hpf_yeast: updatedDetection.yeast,
        hpf_sperm: updatedDetection.sperm,
        hpf_parasites: updatedDetection.parasites,
        confidence: updatedDetection.confidence,
        analysis_notes: (updatedDetection.analysis_notes || '') + ' (Manually corrected)',
        analyzed_at: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error saving HPF count to database:', error)
    }
  }


  // Digital staining and segmentation function using the new algorithm
  const performSegmentation = (videoElement: HTMLVideoElement, canvas: HTMLCanvasElement) => {
    if (!opencvReady || !window.cv || !isOpenCVReady()) return

    try {
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Set canvas size to match the displayed video size to ensure perfect overlay alignment
      // Using clientWidth/Height accounts for CSS scaling (object-fit) and window resizes
      const displayWidth = videoElement.clientWidth || videoElement.videoWidth
      const displayHeight = videoElement.clientHeight || videoElement.videoHeight
      canvas.width = displayWidth
      canvas.height = displayHeight

      // Draw current video frame to canvas
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)

      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      
      // Apply digital staining algorithm
      const result: SegmentationResult = applyDigitalStain(imageData, {
        threshold: 80, // Lower threshold increases sensitivity
        kernelSize: 3,  // Smaller kernel preserves fine details
        iterations: 1,  // Fewer morph passes to keep small objects
        minArea: 30     // Smaller minimum area to detect tiny shapes
      })

      if (!result.success) {
        console.error('Digital staining failed:', result.error)
        return
      }

      // Update object count
      setObjectCount(result.contourCount)

      // Clear canvas (keep it transparent)
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Set composite operation to overlay contours on video
      ctx.globalCompositeOperation = 'source-over'

      // Convert segmented image to ImageData and draw it
      const segmentedImageData = matToImageData(result.segmentedImage)
      if (segmentedImageData) {
        // Create a temporary canvas to process the segmented image
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = canvas.width
        tempCanvas.height = canvas.height
        const tempCtx = tempCanvas.getContext('2d')
        
        if (tempCtx) {
          tempCtx.putImageData(segmentedImageData, 0, 0)
          
          // Draw the segmented mask with low opacity so camera remains clear
          ctx.globalAlpha = 0.35
          ctx.drawImage(tempCanvas, 0, 0)
          ctx.globalAlpha = 1.0
        }
      }

      // Note: We deliberately avoid drawing any text on the canvas.
      // The UI badge already shows: Outlines: N

      // Cleanup OpenCV matrices
      cleanupSegmentationResult(result)

    } catch (error) {
      console.error('Digital staining segmentation error:', error)
    }
  }

  // Ensure video element attaches to stream even if created later
  useEffect(() => {
    if (!mediaStream || !videoRef.current) return
    const elem = videoRef.current
    try {
      // @ts-ignore
      elem.srcObject = mediaStream
      const play = async () => {
        try { await elem.play() } catch {}
      }
      if (elem.readyState >= 2) {
        play()
      } else {
        elem.onloadedmetadata = play
      }
    } catch {}
  }, [mediaStream, videoRef])



  // Auto-start camera on mount (once)
  const cameraStartedRef = useRef(false)
  useEffect(() => {
    if (cameraStartedRef.current) return
    cameraStartedRef.current = true
    startLiveCamera()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      try {
        mediaStream?.getTracks().forEach(t => t.stop())
      } catch {}
    }
  }, [mediaStream])

  // Load OpenCV.js using the utility
  useEffect(() => {
    let isMounted = true
    
    const initializeOpenCV = async () => {
      try {
        await loadOpenCV()
        if (isMounted) {
            setOpencvReady(true)
          }
      } catch (error) {
        console.error('Failed to load OpenCV:', error)
        if (isMounted) {
          setOpencvReady(false)
        }
      }
    }
    
    initializeOpenCV()
    
    return () => {
      isMounted = false
    }
  }, [])

  // Real-time segmentation loop
  useEffect(() => {
    if (!overlayEnabled || !opencvReady || !liveStreamActive || !videoRef.current || !canvasRef.current) {
      return
    }

    let animationId: number
    const video = videoRef.current
    const canvas = canvasRef.current

    const segmentLoop = () => {
      if (video.readyState >= 2) { // HAVE_CURRENT_DATA
        performSegmentation(video, canvas)
      }
      animationId = requestAnimationFrame(segmentLoop)
    }

    segmentLoop()

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
    }
  }, [overlayEnabled, opencvReady, liveStreamActive, performSegmentation])

  // Sync captured images with test's HPF and LPF images
  useEffect(() => {
    if (selectedTest && !isAddingTestImage) {
      // Sync HPF images from database
      setHighPowerImages(selectedTest.hpf_images || [])
      // Sync LPF images from database
      setLowPowerImages(selectedTest.lpf_images || [])
    } else if (!selectedTest) {
      setHighPowerImages([])
      setLowPowerImages([])
    }
    // Reset current indices when test changes
    setCurrentHPFIndex(0)
    setCurrentLPFIndex(0)
  }, [selectedTest, isAddingTestImage])

  // Ensure indices are valid when image arrays change
  useEffect(() => {
    if (lowPowerImages.length > 0 && currentLPFIndex >= lowPowerImages.length) {
      setCurrentLPFIndex(lowPowerImages.length - 1)
    } else if (lowPowerImages.length === 0) {
      setCurrentLPFIndex(0)
    }
  }, [lowPowerImages.length, currentLPFIndex])

  useEffect(() => {
    if (highPowerImages.length > 0 && currentHPFIndex >= highPowerImages.length) {
      setCurrentHPFIndex(highPowerImages.length - 1)
    } else if (highPowerImages.length === 0) {
      setCurrentHPFIndex(0)
    }
  }, [highPowerImages.length, currentHPFIndex])

  // Load AI generated values from database when test is selected
  useEffect(() => {
    if (selectedTest) {
      setAiGeneratedValues({
        epithelialCells: selectedTest.ai_epithelial_cells_count || '0-5',
        crystalsNormal: selectedTest.ai_crystals_normal_count || '0-2',
        bacteria: selectedTest.ai_bacteria_count || '0-10',
        mucusThreads: selectedTest.ai_mucus_threads_count || '0-1',
        casts: selectedTest.ai_casts_count || '0-2',
        rbcs: selectedTest.ai_rbcs_count || '0-2',
        wbcs: selectedTest.ai_wbcs_count || '0-2',
        squamousEpithelial: selectedTest.ai_squamous_epithelial_cells_count || 'Rare',
        transitionalEpithelial: selectedTest.ai_transitional_epithelial_cells_count || 'Rare',
        renalTubular: selectedTest.ai_renal_tubular_epithelial_cells_count || '0-1',
        ovalFatBodies: selectedTest.ai_oval_fat_bodies_count || '0',
        abnormalCrystals: selectedTest.ai_abnormal_crystals_casts_count || '0'
      })
    }
  }, [selectedTest])

  // Auto-analyze LPF images when they change - ONLY for currently displayed image
  useEffect(() => {
    if (lowPowerImages.length > 0 && currentLPFIndex < lowPowerImages.length && selectedTest && !isDeletingImage) {
      console.log(`🔄 LPF Image changed - checking image ${currentLPFIndex + 1}/${lowPowerImages.length}`)
      
      // Clear previous analysis data immediately when switching images
      setLpfSedimentDetection(null)
      
      // Clear loading state for previous image
      setIsAnalyzingLPF(prev => ({ ...prev, [currentLPFIndex]: false }))
      
      // Check for existing analysis for this specific image
      const checkExistingAnalysis = async () => {
        try {
          console.log(`📊 Checking database for existing LPF analysis: test=${selectedTest.id}, index=${currentLPFIndex}`)
          const existingAnalysis = await getImageAnalysisByIndex(selectedTest.id, 'LPF', currentLPFIndex)
          
          if (existingAnalysis) {
            console.log('✅ Found existing LPF analysis in database - loading from cache')
            console.log('📝 LPF Analysis text:', existingAnalysis.analysis_notes)
            setLpfSedimentDetection({
              epithelial_cells: typeof existingAnalysis.lpf_epithelial_cells === 'number' ? existingAnalysis.lpf_epithelial_cells : 0,
              mucus_threads: typeof existingAnalysis.lpf_mucus_threads === 'number' ? existingAnalysis.lpf_mucus_threads : 0,
              casts: typeof existingAnalysis.lpf_casts === 'number' ? existingAnalysis.lpf_casts : 0,
              squamous_epithelial: typeof existingAnalysis.lpf_squamous_epithelial === 'number' ? existingAnalysis.lpf_squamous_epithelial : 0,
              abnormal_crystals: typeof existingAnalysis.lpf_abnormal_crystals === 'number' ? existingAnalysis.lpf_abnormal_crystals : 0,
              confidence: existingAnalysis.confidence || 0,
              analysis_notes: existingAnalysis.analysis_notes || ''
            })
          } else {
            console.log('❌ No existing LPF analysis found - calling Gemini API for current image only')
            // Only call API if no database data exists for this specific image
            analyzeLPFImage(lowPowerImages[currentLPFIndex], currentLPFIndex)
          }
        } catch (error) {
          console.error('Error checking existing LPF analysis:', error)
          console.log('⚠️ Database check failed - calling Gemini API as fallback')
          // Fallback to API call if database check fails
          analyzeLPFImage(lowPowerImages[currentLPFIndex], currentLPFIndex)
        }
      }
      
      checkExistingAnalysis()
    } else {
      console.log('🔄 LPF images cleared or no current image - clearing detection state')
      setLpfSedimentDetection(null)
      setIsAnalyzingLPF({})
    }
  }, [lowPowerImages, currentLPFIndex, selectedTest, isDeletingImage])

  // Auto-analyze HPF images when they change - ONLY for currently displayed image
  useEffect(() => {
    if (highPowerImages.length > 0 && currentHPFIndex < highPowerImages.length && selectedTest && !isDeletingImage) {
      console.log(`🔄 HPF Image changed - checking image ${currentHPFIndex + 1}/${highPowerImages.length}`)
      
      // Clear previous analysis data immediately when switching images
      setHpfSedimentDetection(null)
      
      // Clear loading state for previous image
      setIsAnalyzingHPF(prev => ({ ...prev, [currentHPFIndex]: false }))
      
      // Check for existing analysis for this specific image
      const checkExistingAnalysis = async () => {
        try {
          console.log(`📊 Checking database for existing HPF analysis: test=${selectedTest.id}, index=${currentHPFIndex}`)
          const existingAnalysis = await getImageAnalysisByIndex(selectedTest.id, 'HPF', currentHPFIndex)
          
          if (existingAnalysis) {
            console.log('✅ Found existing HPF analysis in database - loading from cache')
            console.log('📝 HPF Analysis text:', existingAnalysis.analysis_notes)
            setHpfSedimentDetection({
              rbc: typeof existingAnalysis.hpf_rbc === 'number' ? existingAnalysis.hpf_rbc : 0,
              wbc: typeof existingAnalysis.hpf_wbc === 'number' ? existingAnalysis.hpf_wbc : 0,
              epithelial_cells: typeof existingAnalysis.hpf_epithelial_cells === 'number' ? existingAnalysis.hpf_epithelial_cells : 0,
              crystals: typeof existingAnalysis.hpf_crystals === 'number' ? existingAnalysis.hpf_crystals : 0,
              bacteria: typeof existingAnalysis.hpf_bacteria === 'number' ? existingAnalysis.hpf_bacteria : 0,
              yeast: typeof existingAnalysis.hpf_yeast === 'number' ? existingAnalysis.hpf_yeast : 0,
              sperm: typeof existingAnalysis.hpf_sperm === 'number' ? existingAnalysis.hpf_sperm : 0,
              parasites: typeof existingAnalysis.hpf_parasites === 'number' ? existingAnalysis.hpf_parasites : 0,
              confidence: existingAnalysis.confidence || 0,
              analysis_notes: existingAnalysis.analysis_notes || ''
            })
          } else {
            console.log('❌ No existing HPF analysis found - calling Gemini API for current image only')
            // Only call API if no database data exists for this specific image
            analyzeHPFImage(highPowerImages[currentHPFIndex], currentHPFIndex)
          }
        } catch (error) {
          console.error('Error checking existing HPF analysis:', error)
          console.log('⚠️ Database check failed - calling Gemini API as fallback')
          // Fallback to API call if database check fails
          analyzeHPFImage(highPowerImages[currentHPFIndex], currentHPFIndex)
        }
      }
      
      checkExistingAnalysis()
    } else {
      console.log('🔄 HPF images cleared or no current image - clearing detection state')
      setHpfSedimentDetection(null)
      setIsAnalyzingHPF({})
    }
  }, [highPowerImages, currentHPFIndex, selectedTest, isDeletingImage])


  // Ensure camera stream is attached to video element when test changes
  useEffect(() => {
    if (mediaStream && videoRef.current && liveStreamActive) {
      const videoElement = videoRef.current
      // @ts-ignore - srcObject is supported in browsers
      if (videoElement.srcObject !== mediaStream) {
        videoElement.srcObject = mediaStream
        videoElement.onloadedmetadata = async () => {
          try { 
            await videoElement.play() 
          } catch (err) {
            console.error('Failed to play video:', err)
          }
        }
      }
    }
  }, [selectedTest, mediaStream, liveStreamActive])



  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel editing - reset to original data
      if (selectedPatient && selectedTest) {
        setEditData({
          patientName: selectedPatient.name,
          patientAge: selectedPatient.age.toString(),
          patientGender: selectedPatient.gender,
          collectionTime: selectedTest.collection_time || '',
          technician: selectedTest.technician || ''
        })
      }
    } else {
      // Start editing - populate with current data
      if (selectedPatient && selectedTest) {
        setEditData({
          patientName: selectedPatient.name,
          patientAge: selectedPatient.age.toString(),
          patientGender: selectedPatient.gender,
          collectionTime: selectedTest.collection_time || '',
          technician: selectedTest.technician || ''
        })
      }
    }
    setIsEditing(!isEditing)
  }

  const handleSave = async () => {
    if (!selectedPatient) return
    
    setSaving(true)
    try {
      // Update patient data
      await updatePatient(selectedPatient.id, {
        name: editData.patientName,
        age: parseInt(editData.patientAge),
        gender: editData.patientGender
      })

      // Update test data if available
      if (selectedTest) {
        await updateTest(selectedTest.id, {
          collection_time: editData.collectionTime,
          technician: editData.technician
        })
      }

      // Refresh data
      await preloadByDate(dateParam || new Date().toISOString().split('T')[0])
      setIsEditing(false)
      setNotificationMessage('Changes saved successfully!')
      setNotificationType('success')
      setShowNotification(true)
    } catch (error) {
      console.error('Failed to save changes:', error)
      setNotificationMessage('Failed to save changes. Please try again.')
      setNotificationType('error')
      setShowNotification(true)
    } finally {
      setSaving(false)
    }
  }

  const handleNewPatient = async () => {
    try {
      // Generate test code using current time format: YYYYMMDD-XX-XX
      const now = new Date()
      const dateStr = (dateParam || new Date().toISOString().split('T')[0]).replace(/-/g, '')
      const hour = now.getHours().toString().padStart(2, '0')
      const minute = now.getMinutes().toString().padStart(2, '0')
      const testCode = `${dateStr}-${hour}-${minute}`
      
      // Create minimal patient data with valid values
      const patientData = {
        name: 'Unknown Patient',
        age: '0',
        gender: 'other',
        patient_id: `PAT-${Date.now()}`
      }
      
      // Create patient with test for the current date
      const result = await addPatientWithTest(patientData, dateParam || new Date().toISOString().split('T')[0])
      
      if (result.test && result.patient) {
        setNotificationMessage(`✅ Success! New test "${result.test.test_code}" created successfully.`)
        setNotificationType('success')
        setShowNotification(true)
        
        // Refresh data to show the new test
        if (dateParam) {
          await preloadByDate(dateParam)
        }
      }
    } catch (error) {
      console.error('Error creating new test:', error)
      setNotificationMessage('Failed to create new test')
      setNotificationType('error')
      setShowNotification(true)
    }
  }

  // const handleImageAnalysis = () => {
  //   setShowImageAnalysisModal(true)
  // }

  const handleCameraCapture = () => {
    // Camera is always active now, just capture image
    captureImage()
  }


  // Utility to encode file to Base64
  const encodeFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        if (reader.result && typeof reader.result === 'string') {
          resolve(reader.result.split(',')[1])
        } else {
          reject(new Error('Failed to read file as base64'))
        }
      }
      reader.onerror = (err) => reject(err)
    })
  }

  // Function to perform image cropping and classification


  const handleImageCapture = async (imageData: string) => {
    if (!selectedTest) {
      setNotificationMessage('No test selected. Please select a test first.')
      setNotificationType('error')
      setShowNotification(true)
      return
    }

    // Check if we've reached the maximum number of images (10)
    const currentImageCount = selectedTest.microscopic_images?.length || 0
    if (currentImageCount >= 10) {
      setNotificationMessage('Maximum of 10 images reached. Please delete some images before adding more.')
      setNotificationType('error')
      setShowNotification(true)
      return
    }

    try {
      setNotificationMessage('Uploading image...')
      setNotificationType('info')
      setShowNotification(true)

      // Upload the captured image to Supabase Storage
      const imageUrl = await uploadBase64Image(imageData, selectedTest.id, 'microscopic')
      
      // Add the image URL to the test record
      await addImageToTest(selectedTest.id, imageUrl, 'microscopic')
      
      setNotificationMessage(`Image captured and saved successfully! (${currentImageCount + 1}/10)`)
        setNotificationType('success')
      
      // Refresh the data to show the new image
      if (dateParam) {
        await preloadByDate(dateParam)
      }
      
      setShowNotification(true)
    } catch (error) {
      console.error('Error saving captured image:', error)
      setNotificationMessage('Failed to save image. Please try again.')
      setNotificationType('error')
      setShowNotification(true)
    } finally {
    }
  }

  

  const handleDeleteTest = async () => {
    if (!selectedTest) return
    setShowDeleteConfirm(true)
  }

  const handleValidateTest = async () => {
    if (!selectedTest) return
    try {
      await updateTest(selectedTest.id, { status: 'reviewed' as any })
      
      // Update the selectedTest state to reflect the new status
      setSelectedTest(prev => prev ? { ...prev, status: 'reviewed' } : null)
      
      if (dateParam) {
        await preloadByDate(dateParam)
      }
      setNotificationMessage('Test validated successfully!')
      setNotificationType('success')
      setShowNotification(true)
    } catch (error) {
      console.error('Error validating test:', error)
      setNotificationMessage('Failed to validate test. Please try again.')
      setNotificationType('error')
      setShowNotification(true)
    }
  }

  const confirmDeleteTest = async () => {
    if (!selectedTest) return
    
    try {
      await deleteTest(selectedTest.id)
      console.log('Test deleted successfully')
      
      // Refresh the data for the current date
      if (dateParam) {
        await preloadByDate(dateParam)
      }
      
      // Clear selected test and patient
      setSelectedTest(null)
      setSelectedPatient(null)
      
      setNotificationMessage('Test deleted successfully!')
      setNotificationType('success')
      setShowNotification(true)
    } catch (error) {
      console.error('Error deleting test:', error)
      setNotificationMessage('Failed to delete test. Please try again.')
      setNotificationType('error')
      setShowNotification(true)
    }
  }


  const handlePatientCreated = async (patientData: { name: string; age: string; gender: string; patient_id: string }) => {
    try {
      // Test database connection first
      const isConnected = await testDatabaseConnection()
      if (!isConnected) {
        console.error('Database connection failed')
        return
      }
      
      // Create patient with test for the current date
      const result = await addPatientWithTest(patientData, dateParam || new Date().toISOString().split('T')[0])
      
      if (result.test && result.patient) {
        setNotificationMessage(`✅ Success! Patient "${result.patient.name}" and test "${result.test.test_code}" created successfully.`)
        setNotificationType('success')
        setShowNotification(true)
      } else if (result.patient) {
        setNotificationMessage(`⚠️ Patient "${result.patient.name}" created but test creation failed. Check console for details.`)
        setNotificationType('warning')
        setShowNotification(true)
      } else {
        setNotificationMessage(`❌ Failed to create patient and test. Check console for details.`)
        setNotificationType('error')
        setShowNotification(true)
      }
      
    } catch (error) {
      console.error('Failed to create patient:', error)
      // Error handling is done in the hook
    }
  }

  const handleTestSelection = async (test: UrineTest) => {
    try {
      console.log('Selecting test:', test.test_code, 'for patient:', test.patient_id)
      
      // Set the selected test
      setSelectedTest(test)
      
      // Find and set the patient for this test
      const testPatient = patients.find(p => p.id === test.patient_id)
      if (testPatient) {
        setSelectedPatient(testPatient)
        console.log('Patient set:', testPatient.name)
      } else {
        console.warn('Patient not found for test:', test.patient_id)
        // Try to load the patient if not in current list
        // This could happen if the test is from a different date
        setNotificationMessage(`⚠️ Test loaded, but patient data may be incomplete.`)
        setNotificationType('warning')
        setShowNotification(true)
        return
      }
      
      // Show success notification
      setNotificationMessage(`✅ Loaded test "${test.test_code}" for ${testPatient?.name || 'patient'} successfully!`)
      setNotificationType('success')
      setShowNotification(true)
      
      // Scroll to top to show the test details
      window.scrollTo({ top: 0, behavior: 'smooth' })
      
    } catch (error) {
      console.error('Error selecting test:', error)
      setNotificationMessage('Failed to load test. Please try again.')
      setNotificationType('error')
      setShowNotification(true)
    }
  }

  const handleFileUpload = async (file: File) => {
    if (!selectedTest) {
      setNotificationMessage('No test selected. Please select a test first.')
      setNotificationType('error')
      setShowNotification(true)
      return
    }

    // Check if we've reached the maximum number of images (10)
    const currentImageCount = selectedTest.microscopic_images?.length || 0
    if (currentImageCount >= 10) {
      setNotificationMessage('Maximum of 10 images reached. Please delete some images before adding more.')
      setNotificationType('error')
      setShowNotification(true)
      return
    }

    try {
      setNotificationMessage('Uploading image...')
      setNotificationType('info')
      setShowNotification(true)

      // Upload the file to Supabase Storage
      const imageUrl = await uploadImageToStorage(file, selectedTest.id, 'microscopic')
      
      // Add the image URL to the test record
      await addImageToTest(selectedTest.id, imageUrl, 'microscopic')
      
      // Refresh the data to show the new image
      if (dateParam) {
        await preloadByDate(dateParam)
      }
      
      setNotificationMessage(`Image uploaded successfully! (${currentImageCount + 1}/10)`)
      setNotificationType('success')
      setShowNotification(true)
    } catch (error) {
      console.error('Error uploading image:', error)
      setNotificationMessage('Failed to upload image. Please try again.')
      setNotificationType('error')
      setShowNotification(true)
    }
  }

  const handleExport = () => {
    if (!selectedTest) {
      setNotificationMessage('No test selected for export.')
      setNotificationType('warning')
      setShowNotification(true)
      return
    }
    // Implement actual export logic here
    // This could involve generating a PDF or CSV
    setNotificationMessage('Export functionality not yet implemented.')
    setNotificationType('info')
    setShowNotification(true)
  }

  const navigateToTest = (direction: 'prev' | 'next') => {
    if (!selectedTest) return

    const currentIndex = tests.findIndex(test => test.id === selectedTest.id)
    if (currentIndex === -1) return

    let newIndex = currentIndex
    if (direction === 'prev') {
      newIndex = currentIndex - 1
    } else if (direction === 'next') {
      newIndex = currentIndex + 1
    }

    if (newIndex >= 0 && newIndex < tests.length) {
      const newSelectedTest = tests[newIndex]
      setSelectedTest(newSelectedTest)
      const testPatient = patients.find(p => p.id === newSelectedTest.patient_id)
      if (testPatient) {
        setSelectedPatient(testPatient)
      } else {
        setNotificationMessage(`⚠️ Patient data not found for test: ${newSelectedTest.test_code}`)
        setNotificationType('warning')
        setShowNotification(true)
      }
      setNotificationMessage(`✅ Navigated to test "${newSelectedTest.test_code}" for ${testPatient?.name || 'patient'}`)
      setNotificationType('success')
      setShowNotification(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      setNotificationMessage(`No more ${direction} test available.`)
      setNotificationType('info')
      setShowNotification(true)
    }
  }

  const canNavigateToTest = (direction: 'prev' | 'next') => {
    if (!selectedTest) return false
    const currentIndex = tests.findIndex(test => test.id === selectedTest.id)
    if (currentIndex === -1) return false

    if (direction === 'prev') {
      return currentIndex > 0
    } else if (direction === 'next') {
      return currentIndex < tests.length - 1
    }
    return false
  }

  return (
    <Suspense fallback={null}>
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-3 md:px-4 py-2 md:py-3 relative z-[60]">
        <div className="flex flex-wrap items-center justify-between gap-2 md:gap-3">
          {/* Left side - Back button and test info */}
          <div className="flex items-center gap-2 md:gap-4 order-1">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
               className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors ${
                sidebarCollapsed 
                  ? 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100' 
                  : 'border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100'
              }`}
               title={sidebarCollapsed ? 'Open Patient List' : 'Close Patient List'}
             >
               <Menu className="h-4 w-4" />
               <span className="text-sm font-medium">{sidebarCollapsed ? 'Open List' : 'Close List'}</span>
            </button>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <h1 className="text-sm md:text-base font-bold text-gray-900 leading-tight">Microscopy Urinalysis Report</h1>
              
              {/* Date Display */}
              <div className="text-xs text-gray-600">
                <span>{selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Today'}</span>
              </div>
              
              {/* Test Code Display */}
              {selectedTest && (
                <div className="text-xs md:text-sm font-mono font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 md:px-2.5 md:py-1 rounded w-fit">
                  {selectedTest.test_code}
                </div>
              )}
            </div>
          </div>
 
          {/* Center - Test navigation */}
          {selectedTest && (
            <div className="hidden md:flex items-center space-x-2 order-2">
              <button
                onClick={() => navigateToTest('prev')}
                disabled={!canNavigateToTest('prev')}
                className="p-2 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Previous test"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => navigateToTest('next')}
                disabled={!canNavigateToTest('next')}
                className="p-2 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Next test"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Right side - Action buttons */}
          <div className="flex items-center gap-2 md:gap-3 flex-nowrap overflow-x-auto whitespace-nowrap w-full md:w-auto justify-end order-3">

            
            <button
              onClick={handleNewPatient}
              className="px-2 py-1 rounded border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 transition-colors flex items-center space-x-1"
              title="Add new test"
            >
              <Plus className="h-3 w-3" />
              <span className="text-xs hidden sm:inline">Add Test</span>
            </button>
            
            
            
            <button
              onClick={() => {
                setFocusMode('field')
                document.getElementById('camera-field')?.scrollIntoView({ behavior: 'smooth' })
              }}
              className={`flex items-center space-x-1 px-2 py-1 rounded shadow-sm border transition-colors ${
                focusMode === 'field' ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700' : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50'
              }`}
              title="Focus on camera field"
            >
              <Microscope className="h-3 w-3" />
              <span className="text-xs hidden sm:inline">Focus Field</span>
              <span className="text-xs sm:hidden">Field</span>
            </button>
            <button
              onClick={() => {
                setFocusMode('report')
                document.getElementById('report-content')?.scrollIntoView({ behavior: 'smooth' })
              }}
              className={`flex items-center space-x-1 px-2 py-1 rounded shadow-sm border transition-colors ${
                focusMode === 'report' ? 'bg-green-600 text-white border-green-600 hover:bg-green-700' : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50'
              }`}
              title="Focus on report"
            >
              <CheckCircle className="h-3 w-3" />
              <span className="text-xs hidden sm:inline">Focus Report</span>
              <span className="text-xs sm:hidden">Report</span>
            </button>
            
            {/* Verify button moved from report header */}
            {selectedTest && (
              <button 
                onClick={handleValidateTest}
                disabled={selectedTest.status === 'reviewed'}
                className={`flex items-center space-x-1 px-2 py-1 rounded shadow-sm border transition-colors ${
                  selectedTest.status === 'reviewed' 
                    ? 'bg-gray-200 text-gray-500 border-gray-200 cursor-not-allowed' 
                    : 'bg-green-600 text-white border-green-600 hover:bg-green-700'
                }`}
                title="Verify Test"
              >
                <CheckCircle className="h-3 w-3" />
                <span className="text-xs hidden sm:inline">Verify</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-72px)] overflow-hidden">
         {/* Mobile Overlay */}
         {!sidebarCollapsed && (
           <div 
             className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
             onClick={() => setSidebarCollapsed(true)}
           />
         )}
         
        {/* Left Sidebar */}
         <div className={`${
           sidebarCollapsed 
             ? 'hidden' 
             : 'w-80'
         } bg-white border-r border-gray-200 h-full flex flex-col transition-all duration-300 ease-in-out relative z-[55] lg:relative fixed lg:static top-0 left-0`}>
          
          {/* Mobile Close Button */}
          <div className="lg:hidden flex justify-end p-3 border-b border-gray-200">
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              title="Close Patient List"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>
          
          {/* Main Sidebar Content */}
          <div className="p-3 flex-1 overflow-y-auto">

            {/* Date Selection */}
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Select Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="date"
                    value={selectedDate || new Date().toISOString().split('T')[0]}
                    onChange={(e) => {
                      setSelectedDate(e.target.value)
                      if (e.target.value) {
                        preloadByDate(e.target.value)
                      }
                    }}
                    className="w-full pl-10 pr-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-xs text-black"
                  />
                </div>
              </div>

            {/* Search and Filters */}
            <div className="mb-4 space-y-3">
              {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search patients, test codes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-xs text-black placeholder-gray-500"
                  />
                </div>

              {/* Results Count */}
                <div className="text-xs text-gray-600">
                  {selectedDate && (
                    <span className="text-blue-600 font-medium">{new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                  )}
                  <span className="text-gray-600"> • {filteredTests.length} of {tests.length} tests</span>
                </div>
           </div>

           {loading ? (
             <div className="text-center py-4 text-gray-600">
               <div className="animate-pulse">
                     <div className="h-4 bg-gray-200 rounded mb-2"></div>
                     <div className="h-4 bg-gray-200 rounded mb-2"></div>
                     <div className="h-4 bg-gray-200 rounded"></div>
               </div>
             </div>
           ) : error ? (
             <div className="text-center py-4">
                   <div className="text-red-600 mb-2 text-sm">{error}</div>
                   <button onClick={clearError} className="text-blue-600 hover:text-blue-800 text-xs">Try again</button>
             </div>
           ) : (
             <>
               <div className="space-y-1.5 mb-3">
                 {filteredTests.length === 0 ? (
                   <div className="text-gray-500 text-sm text-center py-4">
                     {tests.length === 0 ? 'No tests available' : 'No tests match your search/filter'}
                   </div>
                 ) : (
                   filteredTests.map((test) => {
                     const patient = patients.find(p => p.id === test.patient_id)
                     return (
                       <div 
                         key={test.id} 
                         onClick={() => {
                           if (patient) {
                             setSelectedPatient(patient)
                             setSelectedTest(test)
                           }
                         }} 
                         className="p-2 rounded-lg cursor-pointer transition-colors bg-gray-100 hover:bg-gray-200"
                       >
                             <div className="text-xs font-medium text-gray-900">Test: {test.test_code}</div>
                             <div className="text-xs text-gray-500">Status: {test.status}</div>
                       </div>
                     )
                   })
                 )}
               </div>
               


               
             </>
           )}
         </div>

          {/* Bottom Sidebar Buttons - Settings and Logout */}
          <div className="p-3 border-t border-gray-200 mt-auto">
            <button
              onClick={() => {
                try {
                  router.push('/')
                } catch (e) {
                  // Fallback
                  // @ts-ignore
                  window.location.href = '/'
                }
              }}
              className="w-full flex items-center justify-center px-3 py-2 space-x-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16,17 21,12 16,7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              <span className="text-xs font-medium">Logout</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto relative h-full" key={selectedPatient?.id || 'no-patient'}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <div className="text-gray-600">Loading test data...</div>
              </div>
            </div>
          ) : !selectedPatient ? (
            <div className="text-center py-12 text-gray-600">Select a patient or use the calendar</div>
          ) : (
            <>
              {/* Camera - Always visible with hover controls */}
              <div id="camera-field" className="relative h-full bg-black overflow-hidden group">
                {liveStreamActive && mediaStream ? (
                  <>
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    
                    {/* Microscope circular viewport mask */}
                    {scopeMask && (
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background:
                            'radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.85) 49%, rgba(0,0,0,0.95) 55%)'
                        }}
                      />
                    )}
                    
                    {/* Stain overlay */}
                    {overlayEnabled && (
                      <div className="absolute inset-0 pointer-events-none">
                        {/* Canvas for segmentation results */}
                        <canvas
                          ref={canvasRef}
                          className="absolute inset-0 w-full h-full"
                          style={{ zIndex: 0 }}
                        />
                        
                        {/* Object count display */}
                        <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-2 rounded-lg backdrop-blur-sm">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            <span className="text-sm font-medium">Sediments: {objectCount}</span>
                          </div>
                        </div>
                        
                        {/* Processing indicator */}
                        {!opencvReady && (
                          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/70 text-white px-4 py-2 rounded-lg">
                            <div className="flex items-center space-x-2">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              <span className="text-sm">Loading OpenCV...</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  /* Camera placeholder when not available */
                  <div className="w-full h-full bg-black flex items-center justify-center">
                    <div className="text-center">
                      {!liveStreamActive ? (
                        <div className="space-y-4">
                          <button
                            onClick={startLiveCamera}
                            className="w-16 h-16 mx-auto mb-4 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center transition-colors cursor-pointer group"
                          >
                            <svg className="w-8 h-8 text-white group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                          
                          
                          
                        </div>
                      ) : (
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      <p className="text-gray-400 text-sm">
                        {!liveStreamActive ? 'Click camera icon to start or use Test AI button' : 'Camera access denied or unavailable'}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Hover Controls - Only show when hovering over camera */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/20 z-10">
                  {/* Top Controls */}
                  <div className="absolute top-4 right-4 flex justify-end items-center gap-2">
                    <button
                      onClick={() => setPowerMode(v => v === 'high' ? 'low' : 'high')}
                      className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${powerMode === 'high' ? 'bg-blue-600/90 text-white hover:bg-blue-700/90' : 'bg-orange-600/90 text-white hover:bg-orange-700/90'}`}
                    >
                      <Microscope className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {powerMode === 'high' ? 'HPF' : 'LPF'} ({powerMode === 'high' ? highPowerImages.length : lowPowerImages.length}/10)
                      </span>
                    </button>
                    <button
                      onClick={() => setOverlayEnabled(v => !v)}
                      className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${overlayEnabled ? 'bg-green-600/90 text-white hover:bg-green-700/90' : 'bg-white/90 text-gray-800 hover:bg-white'}`}
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-medium">
                        {overlayEnabled ? `Stain: ${objectCount} sediments` : 'Stain: OFF'}
                      </span>
                    </button>
                    <button
                      onClick={() => setScopeMask(v => !v)}
                      className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${scopeMask ? 'bg-gray-900/90 text-white hover:bg-black/90' : 'bg-white/90 text-gray-800 hover:bg-white'}`}
                    >
                      <Microscope className="h-4 w-4" />
                      <span className="text-sm font-medium">{scopeMask ? 'Scope: ON' : 'Scope: OFF'}</span>
                    </button>
                  </div>
                  
                  {/* Bottom Controls */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                    <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md rounded-full px-6 py-3 border border-white/20 shadow-lg">
                      <button
                        onClick={captureImage}
                        disabled={!liveStreamActive || !mediaStream || (powerMode === 'high' ? highPowerImages.length >= 10 : lowPowerImages.length >= 10)}
                        className="px-4 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 text-sm font-medium flex items-center gap-2 disabled:bg-gray-600 disabled:cursor-not-allowed"
                      >
                          <>
                            <Plus className="h-4 w-4" />
                            Capture {powerMode === 'high' ? 'HPF' : 'LPF'} ({powerMode === 'high' ? highPowerImages.length : lowPowerImages.length}/10)
                          </>
                      </button>
                      
                    </div>
                  </div>
                  
                  {/* Right Side Info */}
                  <div className="absolute top-1/2 right-4 -translate-y-1/2">
                    <div className="bg-black/60 backdrop-blur-md rounded-lg px-4 py-3 border border-white/20">
                      <div className="text-white text-sm">
                        <div className="font-medium">
                          {liveStreamActive && mediaStream ? 'Live Camera Feed' : 'Camera Offline'}
                        </div>
                        <div className="text-white/70 text-xs mt-1">
                          <div className={`${powerMode === 'high' ? 'text-blue-300 font-semibold' : ''}`}>
                            HPF: {highPowerImages.length}/10 {highPowerImages.length >= 10 ? '✓' : ''}
                          </div>
                          <div className={`${powerMode === 'low' ? 'text-orange-300 font-semibold' : ''}`}>
                            LPF: {lowPowerImages.length}/10 {lowPowerImages.length >= 10 ? '✓' : ''}
                          </div>
                        </div>
                        {lowPowerImages.length >= 10 && highPowerImages.length >= 10 && (
                          <div className="text-green-300 text-xs mt-1 font-semibold">
                            All fields captured!
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Report Content */}
           

              {showHeader ? (
              <div id="report-content" className="bg-white rounded-lg p-2 shadow-sm mb-2 relative">
                <div className="flex items-center justify-between mb-1.5">
                   <h1 className="text-sm md:text-base font-bold text-gray-900">Microscopic Urine Analysis Report - {selectedTest?.test_code || 'N/A'}</h1>
                   <div className="flex items-center gap-1.5">
                     <button 
                       onClick={handleEditToggle}
                       className={`h-6 inline-flex items-center gap-1 px-2 rounded transition-colors text-xs ${
                         isEditing 
                           ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' 
                           : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                       }`}
                     >
                       {isEditing ? <X className="h-3 w-3" /> : <Edit className="h-3 w-3" />}
                       <span>{isEditing ? 'Cancel' : 'Edit'}</span>
                     </button>
                     {isEditing && (
                       <button 
                         onClick={handleSave}
                         disabled={saving}
                         className={`h-6 inline-flex items-center gap-1 bg-green-600 text-white px-2 rounded hover:bg-green-700 transition-colors disabled:opacity-50 text-xs`}
                       >
                         <Save className="h-3 w-3" />
                         <span>{saving ? 'Saving...' : 'Save'}</span>
                       </button>
                     )}
                     {selectedTest && (
                       <button 
                         onClick={handleDeleteTest}
                         className="h-6 inline-flex items-center gap-1 px-2 rounded bg-red-600 text-white hover:bg-red-700 transition-colors text-xs"
                         title="Delete Test"
                       >
                         <Trash2 className="h-3 w-3" />
                         <span>Delete</span>
                       </button>
                     )}
                   </div>
                 </div>
                                 <div className="grid grid-cols-3 gap-3 mb-2">
                   <div className="space-y-1">
                     <div className="flex justify-between">
                       <span className="text-xs text-gray-700 font-medium">Name:</span>
                       {isEditing ? (
                         <input
                           type="text"
                           value={editData.patientName}
                           onChange={(e) => setEditData(prev => ({ ...prev, patientName: e.target.value }))}
                           className="text-xs font-semibold text-gray-900 bg-white border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                         />
                       ) : (
                         <span className="text-xs font-semibold text-gray-900">{selectedPatient.name}</span>
                       )}
                     </div>
                     <div className="flex justify-between">
                       <span className="text-xs text-gray-700 font-medium">Patient ID:</span>
                       <span className="text-xs font-semibold text-gray-900">{selectedPatient.patient_id}</span>
                     </div>
                     <div className="flex justify-between">
                       <span className="text-xs text-gray-700 font-medium">Age:</span>
                       {isEditing ? (
                         <input
                           type="number"
                           value={editData.patientAge}
                           onChange={(e) => setEditData(prev => ({ ...prev, patientAge: e.target.value }))}
                           className="text-xs font-semibold text-gray-900 bg-white border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 w-14"
                           min="0"
                           max="150"
                         />
                       ) : (
                         <span className="text-xs font-semibold text-gray-900">{selectedPatient.age} Years</span>
                       )}
                     </div>
                   </div>
                   <div className="space-y-1">
                     <div className="flex justify-between">
                       <span className="text-xs text-gray-700 font-medium">Gender:</span>
                       {isEditing ? (
                         <select
                           value={editData.patientGender}
                           onChange={(e) => setEditData(prev => ({ ...prev, patientGender: e.target.value as 'male' | 'female' | 'other' }))}
                           className="text-xs font-semibold text-gray-900 bg-white border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                         >
                           <option value="male">Male</option>
                           <option value="female">Female</option>
                           <option value="other">Other</option>
                         </select>
                       ) : (
                         <span className="text-xs font-semibold text-gray-900">{selectedPatient.gender}</span>
                       )}
                     </div>
                     <div className="flex justify-between">
                       <span className="text-xs text-gray-700 font-medium">Collection Time:</span>
                       {isEditing ? (
                         <input
                           type="time"
                           value={editData.collectionTime}
                           onChange={(e) => setEditData(prev => ({ ...prev, collectionTime: e.target.value }))}
                           className="text-xs font-semibold text-gray-900 bg-white border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                         />
                       ) : (
                         <span className="text-xs font-semibold text-gray-900">{selectedTest?.collection_time || 'N/A'}</span>
                       )}
                     </div>
                   </div>
                   <div className="space-y-1">
                     <div className="flex justify-between">
                       <span className="text-xs text-gray-700 font-medium">Analysis Date:</span>
                       <span className="text-xs font-semibold text-gray-900">{selectedTest?.analysis_date || 'N/A'}</span>
                     </div>
                     <div className="flex justify-between">
                       <span className="text-xs text-gray-700 font-medium">Technician:</span>
                       {isEditing ? (
                         <input
                           type="text"
                           value={editData.technician}
                           onChange={(e) => setEditData(prev => ({ ...prev, technician: e.target.value }))}
                           className="text-xs font-semibold text-gray-900 bg-white border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                         />
                       ) : (
                         <span className="text-xs font-semibold text-gray-900">{selectedTest?.technician || 'N/A'}</span>
                       )}
                     </div>
                     <div className="flex justify-between items-center">
                       <span className="text-xs text-gray-700 font-medium">Status:</span>
                       <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${
                         selectedTest?.status === 'pending' 
                           ? 'bg-orange-100 text-orange-800 border border-orange-200'
                           : selectedTest?.status === 'completed'
                           ? 'bg-green-100 text-green-800 border border-green-200'
                           : selectedTest?.status === 'in_progress'
                           ? 'bg-blue-100 text-blue-800 border border-blue-200'
                           : selectedTest?.status === 'reviewed'
                           ? 'bg-purple-100 text-purple-800 border border-purple-200'
                           : 'bg-gray-100 text-gray-800 border border-gray-200'
                       }`}>
                         {selectedTest?.status?.replace('_', ' ').toUpperCase() || 'N/A'}
                       </span>
                     </div>
                   </div>
                  </div>
                  

               </div>
              ) : (
                null
              )}

                   {/* Low Power Field Images Section */}
                   <div className="bg-white rounded-lg p-3 shadow-sm mb-3">
                     <div className="flex items-center justify-between mb-2">
                       <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                         <Microscope className="h-4 w-4 mr-2 text-orange-600" />
                         Low Power Field (LPF)
                         <span className="ml-2 text-xs text-gray-600 font-normal">- Overview Analysis</span>
                         <span className={`ml-3 text-xs font-medium px-2 py-0.5 rounded-full ${
                           lowPowerImages.length >= 10 
                             ? 'text-green-700 bg-green-100' 
                             : lowPowerImages.length >= 7 
                             ? 'text-yellow-700 bg-yellow-100' 
                             : 'text-gray-500 bg-orange-100'
                         }`}>
                           {lowPowerImages.length}/10 images {lowPowerImages.length >= 10 ? '✓' : ''}
                         </span>
                       </h3>
                       <label
                         htmlFor="lpf-image-upload"
                         className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200 transition-colors cursor-pointer"
                         title="Upload LPF Image"
                       >
                         Upload Image
                       </label>
                     </div>
                   </div>

                   {/* LPF Photo Gallery */}
                   {lowPowerImages.length > 0 ? (
                     <div className="bg-white rounded-lg border-2 border-gray-300 overflow-hidden mb-4">
                       <div className="flex h-96">
                         {/* Main Image Display */}
                         <div className="w-96 bg-gray-100 flex items-center justify-center relative p-2">
                           {lowPowerImages.length > 0 ? (
                             <div className="relative">
                               <img
                                 src={lowPowerImages[currentLPFIndex]}
                                 alt="LPF Sample"
                                 className="max-w-full max-h-full object-contain rounded-lg"
                                 onError={(e) => {
                                   console.error('Failed to load image:', lowPowerImages[currentLPFIndex])
                                   e.currentTarget.style.display = 'none'
                                 }}
                               />
                             </div>
                           ) : (
                             <div className="text-gray-500 text-center">
                               <Microscope className="h-16 w-16 mx-auto mb-2 text-gray-400" />
                               <p>No LPF images captured</p>
                             </div>
                           )}
                           
                           {/* Navigation Arrows */}
                           {lowPowerImages.length > 1 && (
                             <>
                               <button 
                                 onClick={() => setCurrentLPFIndex(prev => prev > 0 ? prev - 1 : lowPowerImages.length - 1)}
                                 className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                               >
                                 <ChevronLeft className="h-5 w-5" />
                               </button>
                               <button 
                                 onClick={() => setCurrentLPFIndex(prev => prev < lowPowerImages.length - 1 ? prev + 1 : 0)}
                                 className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                               >
                                 <ChevronRight className="h-5 w-5" />
                               </button>
                             </>
                           )}
                           
                           {/* Image Counter */}
                           {lowPowerImages.length > 1 && (
                             <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                               {Math.min(currentLPFIndex + 1, lowPowerImages.length)} / {lowPowerImages.length}
                             </div>
                           )}
                           
                           {/* Action Buttons */}
                           <div className="absolute top-4 right-4 flex gap-2">
                             <button
                               onClick={() => recountImage('low')}
                               className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 transition-colors shadow-lg"
                               title="Recount current image"
                             >
                               <RefreshCw className="h-4 w-4" />
                             </button>
                           <button
                             onClick={() => removeCapturedImage(currentLPFIndex, 'low')}
                               className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors shadow-lg"
                             title="Delete current image"
                           >
                             <Trash2 className="h-4 w-4" />
                           </button>
                           </div>
                         </div>
                         
                         {/* Sidebar - Sediment Description */}
                         <div className="flex-1 bg-white border-l-2 border-gray-300 p-3">
                           <h4 className="font-semibold text-gray-900 mb-3 flex items-center text-sm">
                             <Microscope className="h-3 w-3 mr-1 text-orange-600" />
                             LPF Sediment Analysis
                           </h4>
                           
                           {/* Field-based Sediment Analysis Table */}
                           <div className="overflow-x-auto">
                             <table className="w-full text-xs">
                               <thead>
                                 <tr className="border-b border-gray-200">
                                   <th className="text-center py-2 px-2 font-semibold text-gray-700">Epithelial Cells</th>
                                   <th className="text-center py-2 px-2 font-semibold text-gray-700">Mucus Threads</th>
                                   <th className="text-center py-2 px-2 font-semibold text-gray-700">Casts</th>
                                   <th className="text-center py-2 px-2 font-semibold text-gray-700">Squamous Epithelial</th>
                                   <th className="text-center py-2 px-2 font-semibold text-gray-700">Abnormal Crystals</th>
                                 </tr>
                               </thead>
                               <tbody className="text-xs">
                                {lowPowerImages.length > 0 ? (
                                   <tr className="border-b border-gray-100 hover:bg-gray-50">
                                         <td className="text-center py-2 px-2">
                                           <div className={`rounded px-3 py-1 text-xs font-medium min-w-[60px] ${
                                         (lpfSedimentDetection?.epithelial_cells || 0) > 0
                                               ? 'bg-green-100 text-green-700' 
                                               : 'bg-gray-50 text-gray-500'
                                           }`}>
                                         <input
                                           type="number"
                                           min="0"
                                           value={lpfSedimentDetection?.epithelial_cells || 0}
                                           onChange={(e) => {
                                             const newValue = parseInt(e.target.value) || 0
                                             setLpfSedimentDetection(prev => prev ? { ...prev, epithelial_cells: newValue } : null)
                                             // Auto-save to database
                                             if (selectedTest) {
                                               saveLPFCountToDatabase('epithelial_cells', newValue)
                                             }
                                           }}
                                           className="w-full text-center text-xs bg-transparent border-none outline-none focus:ring-0 focus:outline-none"
                                         />
                                           </div>
                                         </td>
                                         <td className="text-center py-2 px-2">
                                           <div className={`rounded px-3 py-1 text-xs font-medium min-w-[60px] ${
                                         (lpfSedimentDetection?.mucus_threads || 0) > 0
                                               ? 'bg-green-100 text-green-700' 
                                               : 'bg-gray-50 text-gray-500'
                                           }`}>
                                         <input
                                           type="number"
                                           min="0"
                                           value={lpfSedimentDetection?.mucus_threads || 0}
                                           onChange={(e) => {
                                             const newValue = parseInt(e.target.value) || 0
                                             setLpfSedimentDetection(prev => prev ? { ...prev, mucus_threads: newValue } : null)
                                             // Auto-save to database
                                             if (selectedTest) {
                                               saveLPFCountToDatabase('mucus_threads', newValue)
                                             }
                                           }}
                                           className="w-full text-center text-xs bg-transparent border-none outline-none focus:ring-0 focus:outline-none"
                                         />
                                           </div>
                                         </td>
                                         <td className="text-center py-2 px-2">
                                           <div className={`rounded px-3 py-1 text-xs font-medium min-w-[60px] ${
                                         (lpfSedimentDetection?.casts || 0) > 0
                                               ? 'bg-green-100 text-green-700' 
                                               : 'bg-gray-50 text-gray-500'
                                           }`}>
                                         <input
                                           type="number"
                                           min="0"
                                           value={lpfSedimentDetection?.casts || 0}
                                           onChange={(e) => {
                                             const newValue = parseInt(e.target.value) || 0
                                             setLpfSedimentDetection(prev => prev ? { ...prev, casts: newValue } : null)
                                             // Auto-save to database
                                             if (selectedTest) {
                                               saveLPFCountToDatabase('casts', newValue)
                                             }
                                           }}
                                           className="w-full text-center text-xs bg-transparent border-none outline-none focus:ring-0 focus:outline-none"
                                         />
                                           </div>
                                         </td>
                                         <td className="text-center py-2 px-2">
                                           <div className={`rounded px-3 py-1 text-xs font-medium min-w-[60px] ${
                                         (lpfSedimentDetection?.squamous_epithelial || 0) > 0
                                               ? 'bg-green-100 text-green-700' 
                                               : 'bg-gray-50 text-gray-500'
                                           }`}>
                                         <input
                                           type="number"
                                           min="0"
                                           value={lpfSedimentDetection?.squamous_epithelial || 0}
                                           onChange={(e) => {
                                             const newValue = parseInt(e.target.value) || 0
                                             setLpfSedimentDetection(prev => prev ? { ...prev, squamous_epithelial: newValue } : null)
                                             // Auto-save to database
                                             if (selectedTest) {
                                               saveLPFCountToDatabase('squamous_epithelial', newValue)
                                             }
                                           }}
                                           className="w-full text-center text-xs bg-transparent border-none outline-none focus:ring-0 focus:outline-none"
                                         />
                                           </div>
                                         </td>
                                         <td className="text-center py-2 px-2">
                                           <div className={`rounded px-3 py-1 text-xs font-medium min-w-[60px] ${
                                         (lpfSedimentDetection?.abnormal_crystals || 0) > 0
                                               ? 'bg-green-100 text-green-700' 
                                               : 'bg-gray-50 text-gray-500'
                                           }`}>
                                         <input
                                           type="number"
                                           min="0"
                                           value={lpfSedimentDetection?.abnormal_crystals || 0}
                                           onChange={(e) => {
                                             const newValue = parseInt(e.target.value) || 0
                                             setLpfSedimentDetection(prev => prev ? { ...prev, abnormal_crystals: newValue } : null)
                                             // Auto-save to database
                                             if (selectedTest) {
                                               saveLPFCountToDatabase('abnormal_crystals', newValue)
                                             }
                                           }}
                                           className="w-full text-center text-xs bg-transparent border-none outline-none focus:ring-0 focus:outline-none"
                                         />
                                           </div>
                                         </td>
                                       </tr>
                                 ) : (
                                   <tr>
                                     <td colSpan={5} className="text-center py-4 text-gray-500 text-xs">
                                       No LPF images captured yet
                                     </td>
                                   </tr>
                                 )}
                               </tbody>
                             </table>
                           </div>
                           
                           {/* AI Analysis Status */}
                           {lpfSedimentDetection && (
                             <div className="mt-3 p-2 bg-blue-50 rounded-lg">
                               <div className="flex items-center justify-between text-xs">
                                 <span className="text-blue-700 font-medium">
                                   AI Analysis Complete ({lpfSedimentDetection.confidence}% confidence)
                                 </span>
                                 <span className="text-blue-600">
                                   {lpfSedimentDetection.analysis_notes}
                                 </span>
                               </div>
                             </div>
                           )}

                           {/* Loading indicator for LPF analysis */}
                           {isAnalyzingLPF[currentLPFIndex] === true && (
                             <div className="mt-3 p-3 bg-orange-50 rounded-lg">
                               <div className="flex items-center justify-center">
                                 <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                                 <span className="text-sm text-orange-700 font-medium">Analyzing LPF image...</span>
                               </div>
                             </div>
                           )}
                         </div>
                       </div>
                     </div>
                   ) : null}

                   {/* High Power Field Images Section */}
                   <div className="bg-white rounded-lg p-3 shadow-sm mb-3">
                     <div className="flex items-center justify-between mb-2">
                       <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                         <Microscope className="h-4 w-4 mr-2 text-blue-600" />
                         High Power Field (HPF)
                         <span className="ml-2 text-xs text-gray-600 font-normal">- Microscopic Analysis</span>
                         <span className={`ml-3 text-xs font-medium px-2 py-0.5 rounded-full ${
                           highPowerImages.length >= 10 
                             ? 'text-green-700 bg-green-100' 
                             : highPowerImages.length >= 7 
                             ? 'text-yellow-700 bg-yellow-100' 
                             : 'text-gray-500 bg-blue-100'
                         }`}>
                           {highPowerImages.length}/10 images {highPowerImages.length >= 10 ? '✓' : ''}
                         </span>
                       </h3>
                       <label
                         htmlFor="hpf-image-upload"
                         className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200 transition-colors cursor-pointer"
                         title="Upload HPF Image"
                       >
                         Upload Image
                       </label>
                     </div>
                   </div>

                   {/* HPF Photo Gallery */}
                   {highPowerImages.length > 0 ? (
                     <div className="bg-white rounded-lg border-2 border-gray-300 overflow-hidden mb-4">
                       <div className="flex h-96">
                         {/* Main Image Display */}
                         <div className="w-96 bg-gray-100 flex items-center justify-center relative p-2">
                           {highPowerImages.length > 0 ? (
                             <div className="relative">
                               <img
                                 src={highPowerImages[currentHPFIndex]}
                                 alt="HPF Sample"
                                 className="max-w-full max-h-full object-contain rounded-lg"
                                 onError={(e) => {
                                   console.error('Failed to load image:', highPowerImages[currentHPFIndex])
                                   e.currentTarget.style.display = 'none'
                                 }}
                               />
                             </div>
                           ) : (
                             <div className="text-gray-500 text-center">
                               <Microscope className="h-16 w-16 mx-auto mb-2 text-gray-400" />
                               <p>No HPF images captured</p>
                             </div>
                           )}
                           
                           {/* Navigation Arrows */}
                           {highPowerImages.length > 1 && (
                             <>
                               <button 
                                 onClick={() => setCurrentHPFIndex(prev => prev > 0 ? prev - 1 : highPowerImages.length - 1)}
                                 className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                               >
                                 <ChevronLeft className="h-5 w-5" />
                               </button>
                               <button 
                                 onClick={() => setCurrentHPFIndex(prev => prev < highPowerImages.length - 1 ? prev + 1 : 0)}
                                 className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                               >
                                 <ChevronRight className="h-5 w-5" />
                               </button>
                             </>
                           )}
                           
                           {/* Image Counter */}
                           {highPowerImages.length > 1 && (
                             <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                               {Math.min(currentHPFIndex + 1, highPowerImages.length)} / {highPowerImages.length}
                             </div>
                           )}
                           
                           {/* Action Buttons */}
                           <div className="absolute top-4 right-4 flex gap-2">
                             <button
                               onClick={() => recountImage('high')}
                               className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 transition-colors shadow-lg"
                               title="Recount current image"
                             >
                               <RefreshCw className="h-4 w-4" />
                             </button>
                           <button
                             onClick={() => removeCapturedImage(currentHPFIndex, 'high')}
                               className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors shadow-lg"
                             title="Delete current image"
                           >
                             <Trash2 className="h-4 w-4" />
                           </button>
                           </div>
                         </div>
                         
                         {/* Sidebar - Sediment Description */}
                         <div className="flex-1 bg-white border-l-2 border-gray-300 p-3">
                           <h4 className="font-semibold text-gray-900 mb-3 flex items-center text-sm">
                             <Microscope className="h-3 w-3 mr-1 text-blue-600" />
                             HPF Sediment Analysis
                           </h4>
                           
                           {/* Field-based Sediment Analysis Table */}
                           <div className="overflow-x-auto">
                             <table className="w-full text-xs">
                               <thead>
                                 <tr className="border-b border-gray-200">
                                   <th className="text-center py-2 px-2 font-semibold text-gray-700">RBC</th>
                                   <th className="text-center py-2 px-2 font-semibold text-gray-700">WBC</th>
                                   <th className="text-center py-2 px-2 font-semibold text-gray-700">Epithelial Cells</th>
                                   <th className="text-center py-2 px-2 font-semibold text-gray-700">Crystals</th>
                                   <th className="text-center py-2 px-2 font-semibold text-gray-700">Bacteria</th>
                                   <th className="text-center py-2 px-2 font-semibold text-gray-700">Yeast</th>
                                   <th className="text-center py-2 px-2 font-semibold text-gray-700">Sperm</th>
                                   <th className="text-center py-2 px-2 font-semibold text-gray-700">Parasites</th>
                                 </tr>
                               </thead>
                               <tbody className="text-xs">
                                {highPowerImages.length > 0 ? (
                                   <tr className="border-b border-gray-100 hover:bg-gray-50">
                                         <td className="text-center py-2 px-2">
                                           <div className={`rounded px-3 py-1 text-xs font-medium min-w-[60px] ${
                                         (hpfSedimentDetection?.rbc || 0) > 0
                                               ? 'bg-green-100 text-green-700' 
                                               : 'bg-gray-50 text-gray-500'
                                           }`}>
                                         <input
                                           type="number"
                                           min="0"
                                           value={hpfSedimentDetection?.rbc || 0}
                                           onChange={(e) => {
                                             const newValue = parseInt(e.target.value) || 0
                                             setHpfSedimentDetection(prev => prev ? { ...prev, rbc: newValue } : null)
                                             // Auto-save to database
                                             if (selectedTest) {
                                               saveHPFCountToDatabase('rbc', newValue)
                                             }
                                           }}
                                           className="w-full text-center text-xs bg-transparent border-none outline-none focus:ring-0 focus:outline-none"
                                         />
                                           </div>
                                         </td>
                                         <td className="text-center py-2 px-2">
                                           <div className={`rounded px-3 py-1 text-xs font-medium min-w-[60px] ${
                                         (hpfSedimentDetection?.wbc || 0) > 0
                                               ? 'bg-green-100 text-green-700' 
                                               : 'bg-gray-50 text-gray-500'
                                           }`}>
                                         <input
                                           type="number"
                                           min="0"
                                           value={hpfSedimentDetection?.wbc || 0}
                                           onChange={(e) => {
                                             const newValue = parseInt(e.target.value) || 0
                                             setHpfSedimentDetection(prev => prev ? { ...prev, wbc: newValue } : null)
                                             // Auto-save to database
                                             if (selectedTest) {
                                               saveHPFCountToDatabase('wbc', newValue)
                                             }
                                           }}
                                           className="w-full text-center text-xs bg-transparent border-none outline-none focus:ring-0 focus:outline-none"
                                         />
                                           </div>
                                         </td>
                                         <td className="text-center py-2 px-2">
                                           <div className={`rounded px-3 py-1 text-xs font-medium min-w-[60px] ${
                                         (hpfSedimentDetection?.epithelial_cells || 0) > 0
                                               ? 'bg-green-100 text-green-700' 
                                               : 'bg-gray-50 text-gray-500'
                                           }`}>
                                         <input
                                           type="number"
                                           min="0"
                                           value={hpfSedimentDetection?.epithelial_cells || 0}
                                           onChange={(e) => {
                                             const newValue = parseInt(e.target.value) || 0
                                             setHpfSedimentDetection(prev => prev ? { ...prev, epithelial_cells: newValue } : null)
                                             // Auto-save to database
                                             if (selectedTest) {
                                               saveHPFCountToDatabase('epithelial_cells', newValue)
                                             }
                                           }}
                                           className="w-full text-center text-xs bg-transparent border-none outline-none focus:ring-0 focus:outline-none"
                                         />
                                           </div>
                                         </td>
                                         <td className="text-center py-2 px-2">
                                           <div className={`rounded px-3 py-1 text-xs font-medium min-w-[60px] ${
                                             (hpfSedimentDetection?.crystals || 0) > 0
                                               ? 'bg-green-100 text-green-700' 
                                               : 'bg-gray-50 text-gray-500'
                                           }`}>
                                             <input
                                               type="number"
                                               min="0"
                                               value={hpfSedimentDetection?.crystals || 0}
                                               onChange={(e) => {
                                                 const newValue = parseInt(e.target.value) || 0
                                                 setHpfSedimentDetection(prev => prev ? { ...prev, crystals: newValue } : null)
                                                 // Auto-save to database
                                                 if (selectedTest) {
                                                   saveHPFCountToDatabase('crystals', newValue)
                                                 }
                                               }}
                                               className="w-full text-center text-xs bg-transparent border-none outline-none focus:ring-0 focus:outline-none"
                                             />
                                           </div>
                                         </td>
                                         <td className="text-center py-2 px-2">
                                           <div className={`rounded px-3 py-1 text-xs font-medium min-w-[60px] ${
                                         (hpfSedimentDetection?.bacteria || 0) > 0
                                               ? 'bg-green-100 text-green-700' 
                                               : 'bg-gray-50 text-gray-500'
                                           }`}>
                                         <input
                                           type="number"
                                           min="0"
                                           value={hpfSedimentDetection?.bacteria || 0}
                                           onChange={(e) => {
                                             const newValue = parseInt(e.target.value) || 0
                                             setHpfSedimentDetection(prev => prev ? { ...prev, bacteria: newValue } : null)
                                             // Auto-save to database
                                             if (selectedTest) {
                                               saveHPFCountToDatabase('bacteria', newValue)
                                             }
                                           }}
                                           className="w-full text-center text-xs bg-transparent border-none outline-none focus:ring-0 focus:outline-none"
                                         />
                                           </div>
                                         </td>
                                         <td className="text-center py-2 px-2">
                                           <div className={`rounded px-3 py-1 text-xs font-medium min-w-[60px] ${
                                         (hpfSedimentDetection?.yeast || 0) > 0
                                               ? 'bg-green-100 text-green-700' 
                                               : 'bg-gray-50 text-gray-500'
                                           }`}>
                                         <input
                                           type="number"
                                           min="0"
                                           value={hpfSedimentDetection?.yeast || 0}
                                           onChange={(e) => {
                                             const newValue = parseInt(e.target.value) || 0
                                             setHpfSedimentDetection(prev => prev ? { ...prev, yeast: newValue } : null)
                                             // Auto-save to database
                                             if (selectedTest) {
                                               saveHPFCountToDatabase('yeast', newValue)
                                             }
                                           }}
                                           className="w-full text-center text-xs bg-transparent border-none outline-none focus:ring-0 focus:outline-none"
                                         />
                                           </div>
                                         </td>
                                         <td className="text-center py-2 px-2">
                                           <div className={`rounded px-3 py-1 text-xs font-medium min-w-[60px] ${
                                         (hpfSedimentDetection?.sperm || 0) > 0
                                               ? 'bg-green-100 text-green-700' 
                                               : 'bg-gray-50 text-gray-500'
                                           }`}>
                                         <input
                                           type="number"
                                           min="0"
                                           value={hpfSedimentDetection?.sperm || 0}
                                           onChange={(e) => {
                                             const newValue = parseInt(e.target.value) || 0
                                             setHpfSedimentDetection(prev => prev ? { ...prev, sperm: newValue } : null)
                                             // Auto-save to database
                                             if (selectedTest) {
                                               saveHPFCountToDatabase('sperm', newValue)
                                             }
                                           }}
                                           className="w-full text-center text-xs bg-transparent border-none outline-none focus:ring-0 focus:outline-none"
                                         />
                                       </div>
                                     </td>
                                     <td className="text-center py-2 px-2">
                                       <div className={`rounded px-3 py-1 text-xs font-medium min-w-[60px] ${
                                         (hpfSedimentDetection?.parasites || 0) > 0
                                               ? 'bg-green-100 text-green-700' 
                                               : 'bg-gray-50 text-gray-500'
                                       }`}>
                                         <input
                                           type="number"
                                           min="0"
                                           value={hpfSedimentDetection?.parasites || 0}
                                           onChange={(e) => {
                                             const newValue = parseInt(e.target.value) || 0
                                             setHpfSedimentDetection(prev => prev ? { ...prev, parasites: newValue } : null)
                                             // Auto-save to database
                                             if (selectedTest) {
                                               saveHPFCountToDatabase('parasites', newValue)
                                             }
                                           }}
                                           className="w-full text-center text-xs bg-transparent border-none outline-none focus:ring-0 focus:outline-none"
                                         />
                                           </div>
                                         </td>
                                       </tr>
                                 ) : (
                                   <tr>
                                     <td colSpan={8} className="text-center py-4 text-gray-500 text-xs">
                                       No HPF images captured yet
                                     </td>
                                   </tr>
                                 )}
                               </tbody>
                             </table>
                           </div>
                           
                           {/* AI Analysis Status */}
                           {hpfSedimentDetection && (
                             <div className="mt-3 p-2 bg-blue-50 rounded-lg">
                               <div className="flex items-center justify-between text-xs">
                                 <span className="text-blue-700 font-medium">
                                   AI Analysis Complete ({hpfSedimentDetection.confidence}% confidence)
                                 </span>
                                 <span className="text-blue-600">
                                   {hpfSedimentDetection.analysis_notes}
                                 </span>
                               </div>
                             </div>
                           )}

                           {/* Loading indicator for HPF analysis */}
                           {isAnalyzingHPF[currentHPFIndex] === true && (
                             <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                               <div className="flex items-center justify-center">
                                 <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                                 <span className="text-sm text-blue-700 font-medium">Analyzing HPF image...</span>
                               </div>
                             </div>
                           )}

                         </div>
                       </div>
                     </div>
                   ) : null}
                   
                   
                   {/* Hidden file inputs */}
                   <input
                     id="image-upload"
                     type="file"
                     accept="image/*"
                     className="hidden"
                     onChange={(e) => {
                       const file = e.target.files?.[0]
                       if (file) {
                         handleFileUpload(file)
                       }
                     }}
                   />
                   <input
                     id="camera-capture"
                     type="file"
                     accept="image/*"
                     capture="environment"
                     className="hidden"
                     onChange={(e) => {
                       const files = e.target.files
                       if (files && files.length > 0) {
                         // Handle camera capture logic here
                         console.log('Camera capture:', files)
                         // You can implement the actual upload to Supabase storage here
                       }
                     }}
                   />
                   <input
                     id="lpf-image-upload"
                     type="file"
                     accept="image/*"
                     className="hidden"
                     onChange={(e) => {
                       const file = e.target.files?.[0]
                       if (file) {
                         handleLPFImageUpload(file)
                       }
                     }}
                   />
                   <input
                     id="hpf-image-upload"
                     type="file"
                     accept="image/*"
                     className="hidden"
                     onChange={(e) => {
                       const file = e.target.files?.[0]
                       if (file) {
                         handleHPFImageUpload(file)
                       }
                     }}
                   />
                  {selectedTest && (
                    <div className="space-y-4">
                      {/* Display captured microscopic images */}
                                            {selectedTest.microscopic_images && selectedTest.microscopic_images.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {selectedTest.microscopic_images.map((imageUrl, index) => (
                            <div key={index} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium text-gray-900">
                                  Sample {index + 1}
                                </h4>
                                <button
                                  onClick={async () => {
                                    if (confirm('Are you sure you want to delete this image?')) {
                                      try {
                                        await deleteImageFromTest(selectedTest.id, imageUrl, 'microscopic')
                                        await deleteImageFromStorage(imageUrl)
                                        // Refresh the data
                                        if (dateParam) {
                                          await preloadByDate(dateParam)
                                        }
                                        setNotificationMessage('Image deleted successfully!')
                                        setNotificationType('success')
                                        setShowNotification(true)
                                      } catch (error) {
                                        console.error('Error deleting image:', error)
                                        setNotificationMessage('Failed to delete image. Please try again.')
                                        setNotificationType('error')
                                        setShowNotification(true)
                                      }
                                    }
                                  }}
                                  className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                                  title="Delete image"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                              <div className="relative group">
                                <div className="relative w-full h-64 rounded-lg border border-gray-200 shadow-lg overflow-hidden bg-black">




                                  {/* Main Image */}
                                  {imageUrl.startsWith('data:') ? (
                                    // Handle base64 images
                                    <img 
                                      src={imageUrl} 
                                      alt={`Microscopic image ${index + 1}`}
                                      className="w-full h-full object-contain relative z-10"
                                      onError={(e) => {
                                        console.error('Image failed to load:', imageUrl)
                                        const target = e.target as HTMLImageElement
                                        target.style.display = 'none'
                                        const parent = target.parentElement
                                        if (parent) {
                                          parent.innerHTML = `
                                            <div class="flex items-center justify-center h-full">
                                              <div class="text-center">
                                                <Microscope class="h-12 w-12 mx-auto mb-2 text-gray-400" />
                                                <p class="text-sm text-gray-500">Image failed to load</p>
                                              </div>
                                            </div>
                                          `
                                        }
                                      }}
                                    />
                                  ) : (
                                    // Handle URL images
                                    <Image 
                                      src={imageUrl} 
                                      alt={`Microscopic image ${index + 1}`}
                                      width={400}
                                      height={320}
                                      className="w-full h-full object-contain relative z-10"
                                      unoptimized={imageUrl.startsWith('http')}
                                      onError={(e) => {
                                        console.error('Image failed to load:', imageUrl)
                                        const target = e.target as HTMLImageElement
                                        target.style.display = 'none'
                                        const parent = target.parentElement
                                        if (parent) {
                                          parent.innerHTML = `
                                            <div class="flex items-center justify-center h-full">
                                              <div class="text-center">
                                                <Microscope class="h-12 w-12 mx-auto mb-2 text-gray-400" />
                                                <p class="text-sm text-gray-500">Image failed to load</p>
                                              </div>
                                            </div>
                                          `
                                        }
                                      }}
                                    />
                                  )}

                                  {/* Measurement Overlay (below image) */}
                                  <div className="absolute inset-0 pointer-events-none z-0">
                                    <svg className="w-full h-full">
                                      <line 
                                        x1="10%" y1="10%" x2="90%" y2="90%" 
                                        stroke="red" strokeWidth="2" 
                                        markerEnd="url(#arrowhead)"
                                      />
                                      <defs>
                                        <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                                          refX="9" refY="3.5" orient="auto">
                                          <polygon points="0 0, 10 3.5, 0 7" fill="red" />
                                        </marker>
                                      </defs>
                                    </svg>
                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                                      <div className="bg-yellow-400 text-black text-xs px-2 py-1 rounded font-bold">
                                        L: 1.78mm
                                      </div>
                                    </div>
                                  </div>

                                  {/* Click to Enlarge Overlay (below image) */}
                                  <div className="absolute inset-0 z-0 pointer-events-none bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 rounded-lg flex items-center justify-center">
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white bg-opacity-90 px-3 py-1 rounded-full text-sm font-medium text-gray-800 shadow-sm">
                                      Click to enlarge
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 mt-2">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium text-gray-700"><strong>Captured:</strong> {new Date().toLocaleDateString()}</p>
                                    <p className="text-gray-600"><strong>Type:</strong> Microscopic analysis</p>
                                  </div>
                                  <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full border">
                                    Sample {index + 1}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )}

               {/* Strasinger Quantitation Table */}
                               <div className="bg-white rounded-lg p-3 shadow-sm mb-3">
                  <div className="flex items-center justify-between mb-2">
                   <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                     <Microscope className="h-4 w-4 mr-2 text-green-600" />
                     Microscopic Quantitations (Strasinger)
                     <span className="ml-2 text-xs text-gray-600 font-normal">- Clinical Reference Standards</span>
                   </h3>
                 </div>
                 
                 <div className="overflow-x-auto">
                   <table className="w-full text-xs border border-gray-300">
                     {/* Header */}
                     <thead>
                       <tr className="bg-blue-600 text-white">
                         <th className="py-1.5 px-2 text-center font-bold text-sm" colSpan={9}>
                           MICROSCOPIC QUANTITATIONS (Strasinger)
                         </th>
                       </tr>
                       <tr className="bg-gray-100 border-b border-gray-300">
                         <th className="py-1.5 px-2 text-left font-semibold text-gray-800 border-r border-gray-300">Item</th>
                         <th className="py-1.5 px-2 text-center font-semibold text-gray-800 border-r border-gray-300">Quantitated</th>
                         <th className="py-1.5 px-2 text-center font-semibold text-gray-800 border-r border-gray-300">None</th>
                         <th className="py-1.5 px-2 text-center font-semibold text-gray-800 border-r border-gray-300">Rare</th>
                         <th className="py-1.5 px-2 text-center font-semibold text-gray-800 border-r border-gray-300">Few</th>
                         <th className="py-1.5 px-2 text-center font-semibold text-gray-800 border-r border-gray-300">Moderate</th>
                         <th className="py-1.5 px-2 text-center font-semibold text-gray-800 border-r border-gray-300">Many</th>
                         <th className="py-1.5 px-2 text-center font-semibold text-green-700 border-r border-gray-300 bg-green-50">AI Generated</th>
                       </tr>
                     </thead>
                     <tbody>
                       {/* Epithelial cells */}
                       <tr className="border-b border-gray-300">
                         <td className="py-1.5 px-2 font-medium text-gray-900 border-r border-gray-300">Epithelial cells</td>
                         <td className="py-1.5 px-2 text-center text-gray-700 border-r border-gray-300">per LPF</td>
                         <td className="py-1.5 px-2 text-center text-gray-700 border-r border-gray-300">0</td>
                         <td className="py-1.5 px-2 text-center text-gray-700 border-r border-gray-300">0-5</td>
                         <td className="py-1.5 px-2 text-center text-gray-700 border-r border-gray-300">5-20</td>
                         <td className="py-1.5 px-2 text-center text-gray-700 border-r border-gray-300">20-100</td>
                         <td className="py-1.5 px-2 text-center text-gray-700 border-r border-gray-300">&gt;100</td>
                         <td className="py-1.5 px-2 text-center border-r border-gray-300 bg-green-50">
                           <select
                             value={aiGeneratedValues.epithelialCells}
                             onChange={(e) => updateAiValue('epithelialCells', e.target.value)}
                             className="text-green-600 font-medium bg-transparent border-none text-xs text-center focus:outline-none focus:ring-1 focus:ring-green-500 rounded px-1"
                           >
                             {getDropdownOptions('epithelialCells').map(option => (
                               <option key={option} value={option}>{option}</option>
                             ))}
                           </select>
                         </td>
                       </tr>
                       
                       {/* Crystals (normal) */}
                       <tr className="border-b border-gray-300">
                         <td className="py-1.5 px-2 font-medium text-gray-900 border-r border-gray-300">Crystals (normal)</td>
                         <td className="py-1.5 px-2 text-center text-gray-700 border-r border-gray-300">per HPF</td>
                         <td className="py-1.5 px-2 text-center text-gray-700 border-r border-gray-300">0</td>
                         <td className="py-1.5 px-2 text-center text-gray-700 border-r border-gray-300">0-2</td>
                         <td className="py-1.5 px-2 text-center text-gray-700 border-r border-gray-300">2-5</td>
                         <td className="py-1.5 px-2 text-center text-gray-700 font-semibold border-r border-gray-300">5-20</td>
                         <td className="py-1.5 px-2 text-center text-gray-700 border-r border-gray-300">&gt;20</td>
                         <td className="py-1.5 px-2 text-center border-r border-gray-300 bg-green-50">
                           <select
                             value={aiGeneratedValues.crystalsNormal}
                             onChange={(e) => updateAiValue('crystalsNormal', e.target.value)}
                             className="text-green-600 font-medium bg-transparent border-none text-xs text-center focus:outline-none focus:ring-1 focus:ring-green-500 rounded px-1"
                           >
                             {getDropdownOptions('crystalsNormal').map(option => (
                               <option key={option} value={option}>{option}</option>
                             ))}
                           </select>
                         </td>
                       </tr>
                       
                       {/* Bacteria */}
                       <tr className="border-b border-gray-300">
                         <td className="py-1.5 px-2 font-medium text-gray-900 border-r border-gray-300">Bacteria</td>
                         <td className="py-1.5 px-2 text-center text-gray-700 border-r border-gray-300">per HPF</td>
                         <td className="py-1.5 px-2 text-center text-gray-700 border-r border-gray-300">0</td>
                         <td className="py-1.5 px-2 text-center text-gray-700 font-semibold border-r border-gray-300">0-10</td>
                         <td className="py-1.5 px-2 text-center text-gray-700 font-semibold border-r border-gray-300">10-50</td>
                         <td className="py-1.5 px-2 text-center text-gray-700 border-r border-gray-300">50-200</td>
                         <td className="py-1.5 px-2 text-center text-gray-700 border-r border-gray-300">&gt;200</td>
                         <td className="py-1.5 px-2 text-center border-r border-gray-300 bg-green-50">
                           <select
                             value={aiGeneratedValues.bacteria}
                             onChange={(e) => updateAiValue('bacteria', e.target.value)}
                             className="text-green-600 font-medium bg-transparent border-none text-xs text-center focus:outline-none focus:ring-1 focus:ring-green-500 rounded px-1"
                           >
                             {getDropdownOptions('bacteria').map(option => (
                               <option key={option} value={option}>{option}</option>
                             ))}
                           </select>
                         </td>
                       </tr>
                       
                       {/* Mucus threads */}
                       <tr className="border-b border-gray-300">
                         <td className="py-1.5 px-2 font-medium text-gray-900 border-r border-gray-300">Mucus threads</td>
                         <td className="py-1.5 px-2 text-center text-gray-700 border-r border-gray-300">per LPF</td>
                         <td className="py-1.5 px-2 text-center text-gray-700 border-r border-gray-300">0</td>
                         <td className="py-1.5 px-2 text-center text-gray-700 border-r border-gray-300">0-1</td>
                         <td className="py-1.5 px-2 text-center text-gray-700 border-r border-gray-300">1-3</td>
                         <td className="py-1.5 px-2 text-center text-gray-700 border-r border-gray-300">3-10</td>
                         <td className="py-1.5 px-2 text-center text-gray-700 border-r border-gray-300">&gt;10</td>
                         <td className="py-1.5 px-2 text-center border-r border-gray-300 bg-green-50">
                           <select
                             value={aiGeneratedValues.mucusThreads}
                             onChange={(e) => updateAiValue('mucusThreads', e.target.value)}
                             className="text-green-600 font-medium bg-transparent border-none text-xs text-center focus:outline-none focus:ring-1 focus:ring-green-500 rounded px-1"
                           >
                             {getDropdownOptions('mucusThreads').map(option => (
                               <option key={option} value={option}>{option}</option>
                             ))}
                           </select>
                         </td>
                       </tr>
                       
                       {/* Casts */}
                       <tr className="border-b border-gray-300">
                         <td className="py-1.5 px-2 font-medium text-gray-900 border-r border-gray-300">Casts</td>
                         <td className="py-1.5 px-2 text-center text-gray-700 border-r border-gray-300">per LPF</td>
                         <td className="py-1.5 px-2 text-center text-gray-700 border-r border-gray-300" colSpan={5}>
                           Numerical ranges: 0-2, 2-5, 5-10, &gt;10
                         </td>
                         <td className="py-1.5 px-2 text-center border-r border-gray-300 bg-green-50">
                           <select
                             value={aiGeneratedValues.casts}
                             onChange={(e) => updateAiValue('casts', e.target.value)}
                             className="text-green-600 font-medium bg-transparent border-none text-xs text-center focus:outline-none focus:ring-1 focus:ring-green-500 rounded px-1"
                           >
                             {getDropdownOptions('casts').map(option => (
                               <option key={option} value={option}>{option}</option>
                             ))}
                           </select>
                         </td>
                       </tr>
                       
                       {/* RBCs */}
                       <tr className="border-b border-gray-300">
                         <td className="py-3 px-4 font-medium text-gray-900 border-r border-gray-300">RBCs</td>
                         <td className="py-3 px-4 text-center text-gray-700 border-r border-gray-300">per HPF</td>
                         <td className="py-3 px-4 text-center text-gray-700 border-r border-gray-300" colSpan={5}>
                           Numerical ranges: 0-2, 2-5, 5-10, 10-25, 25-50, 50-100, &gt;100
                         </td>
                         <td className="py-3 px-4 text-center border-r border-gray-300 bg-green-50">
                           <select
                             value={aiGeneratedValues.rbcs}
                             onChange={(e) => updateAiValue('rbcs', e.target.value)}
                             className="text-green-600 font-medium bg-transparent border-none text-xs text-center focus:outline-none focus:ring-1 focus:ring-green-500 rounded px-1"
                           >
                             {getDropdownOptions('rbcs').map(option => (
                               <option key={option} value={option}>{option}</option>
                             ))}
                           </select>
                         </td>
                       </tr>
                       
                       {/* WBCs */}
                       <tr className="border-b border-gray-300">
                         <td className="py-3 px-4 font-medium text-gray-900 border-r border-gray-300">WBCs</td>
                         <td className="py-3 px-4 text-center text-gray-700 border-r border-gray-300">per HPF</td>
                         <td className="py-3 px-4 text-center text-gray-700 border-r border-gray-300" colSpan={5}>
                           Numerical ranges: 0-2, 2-5, 5-10, 10-25, 25-50, 50-100, &gt;100
                         </td>
                         <td className="py-3 px-4 text-center border-r border-gray-300 bg-green-50">
                           <select
                             value={aiGeneratedValues.wbcs}
                             onChange={(e) => updateAiValue('wbcs', e.target.value)}
                             className="text-green-600 font-medium bg-transparent border-none text-xs text-center focus:outline-none focus:ring-1 focus:ring-green-500 rounded px-1"
                           >
                             {getDropdownOptions('wbcs').map(option => (
                               <option key={option} value={option}>{option}</option>
                             ))}
                           </select>
                         </td>
                       </tr>
                       
                       {/* Squamous epithelial cells */}
                       <tr className="border-b border-gray-300">
                         <td className="py-3 px-4 font-medium text-gray-900 border-r border-gray-300">Squamous epithelial cells</td>
                         <td className="py-3 px-4 text-center text-gray-700 border-r border-gray-300"></td>
                         <td className="py-3 px-4 text-center text-gray-700 font-semibold border-r border-gray-300" colSpan={5}>
                           Rare, few, moderate or many per LPF
                         </td>
                         <td className="py-3 px-4 text-center border-r border-gray-300 bg-green-50">
                           <select
                             value={aiGeneratedValues.squamousEpithelial}
                             onChange={(e) => updateAiValue('squamousEpithelial', e.target.value)}
                             className="text-green-600 font-medium bg-transparent border-none text-xs text-center focus:outline-none focus:ring-1 focus:ring-green-500 rounded px-1"
                           >
                             {getDropdownOptions('squamousEpithelial').map(option => (
                               <option key={option} value={option}>{option}</option>
                             ))}
                           </select>
                         </td>
                       </tr>
                       
                       {/* Transitional epithelial cells, yeasts, Trichomonas */}
                       <tr className="border-b border-gray-300">
                         <td className="py-3 px-4 font-medium text-gray-900 border-r border-gray-300">Transitional epithelial cells, yeasts, Trichomonas</td>
                         <td className="py-3 px-4 text-center text-gray-700 border-r border-gray-300"></td>
                         <td className="py-3 px-4 text-center text-gray-700 font-semibold border-r border-gray-300" colSpan={5}>
                           Rare, few, moderate, or many per HPF
                         </td>
                         <td className="py-3 px-4 text-center border-r border-gray-300 bg-green-50">
                           <select
                             value={aiGeneratedValues.transitionalEpithelial}
                             onChange={(e) => updateAiValue('transitionalEpithelial', e.target.value)}
                             className="text-green-600 font-medium bg-transparent border-none text-xs text-center focus:outline-none focus:ring-1 focus:ring-green-500 rounded px-1"
                           >
                             {getDropdownOptions('transitionalEpithelial').map(option => (
                               <option key={option} value={option}>{option}</option>
                             ))}
                           </select>
                         </td>
                       </tr>
                       
                       {/* Renal tubular epithelial cells */}
                       <tr className="border-b border-gray-300">
                         <td className="py-3 px-4 font-medium text-gray-900 border-r border-gray-300">Renal tubular epithelial cells</td>
                         <td className="py-3 px-4 text-center text-gray-700 border-r border-gray-300"></td>
                         <td className="py-3 px-4 text-center text-gray-700 font-semibold border-r border-gray-300" colSpan={5}>
                           Average number per 10 HPFs
                         </td>
                         <td className="py-3 px-4 text-center border-r border-gray-300 bg-green-50">
                           <select
                             value={aiGeneratedValues.renalTubular}
                             onChange={(e) => updateAiValue('renalTubular', e.target.value)}
                             className="text-green-600 font-medium bg-transparent border-none text-xs text-center focus:outline-none focus:ring-1 focus:ring-green-500 rounded px-1"
                           >
                             {getDropdownOptions('renalTubular').map(option => (
                               <option key={option} value={option}>{option}</option>
                             ))}
                           </select>
                         </td>
                       </tr>
                       
                       {/* Oval fat bodies */}
                       <tr className="border-b border-gray-300">
                         <td className="py-3 px-4 font-medium text-gray-900 border-r border-gray-300">Oval fat bodies</td>
                         <td className="py-3 px-4 text-center text-gray-700 border-r border-gray-300"></td>
                         <td className="py-3 px-4 text-center text-gray-700 font-semibold border-r border-gray-300" colSpan={5}>
                           Average number per HPF
                         </td>
                         <td className="py-3 px-4 text-center border-r border-gray-300 bg-green-50">
                           <select
                             value={aiGeneratedValues.ovalFatBodies}
                             onChange={(e) => updateAiValue('ovalFatBodies', e.target.value)}
                             className="text-green-600 font-medium bg-transparent border-none text-xs text-center focus:outline-none focus:ring-1 focus:ring-green-500 rounded px-1"
                           >
                             {getDropdownOptions('ovalFatBodies').map(option => (
                               <option key={option} value={option}>{option}</option>
                             ))}
                           </select>
                         </td>
                       </tr>
                       
                       {/* Abnormal crystals, casts */}
                       <tr className="border-b border-gray-300">
                         <td className="py-3 px-4 font-medium text-gray-900 border-r border-gray-300">Abnormal crystals, casts</td>
                         <td className="py-3 px-4 text-center text-gray-700 border-r border-gray-300"></td>
                         <td className="py-3 px-4 text-center text-gray-700 font-semibold border-r border-gray-300" colSpan={5}>
                           Average number per LPF
                         </td>
                         <td className="py-3 px-4 text-center border-r border-gray-300 bg-green-50">
                           <select
                             value={aiGeneratedValues.abnormalCrystals}
                             onChange={(e) => updateAiValue('abnormalCrystals', e.target.value)}
                             className="text-green-600 font-medium bg-transparent border-none text-xs text-center focus:outline-none focus:ring-1 focus:ring-green-500 rounded px-1"
                           >
                             {getDropdownOptions('abnormalCrystals').map(option => (
                               <option key={option} value={option}>{option}</option>
                             ))}
                           </select>
                         </td>
                       </tr>
                     </tbody>
                   </table>
                 </div>
                 
              
  
               </div>

              {/* Text-only Urinalysis Summary (based on provided report) */}
              <div className="bg-white rounded-lg p-3 shadow-sm mt-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900">Urinalysis Summary</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Microscopic */}
                  <div className="space-y-2">
                    <div className="text-[11px] uppercase tracking-wide text-gray-500">Microscopic</div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-800">Red Blood Cells (RBC)</span>
                      <select value={urinalysisText.rbc} onChange={(e) => updateUrinalysisText('rbc', e.target.value)} className="w-40 text-right text-xs bg-transparent border-none outline-none focus:ring-0 focus:outline-none text-gray-900">
                        {getDropdownOptions('rbcs').map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-800">Pus Cells (WBC)</span>
                      <select value={urinalysisText.pusCells} onChange={(e) => updateUrinalysisText('pusCells', e.target.value)} className="w-40 text-right text-xs bg-transparent border-none outline-none focus:ring-0 focus:outline-none text-gray-900">
                        {getDropdownOptions('rbcs').map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-800">Epithelial Cells</span>
                      <select value={urinalysisText.epithelialCells} onChange={(e) => updateUrinalysisText('epithelialCells', e.target.value)} className="w-40 text-right text-xs bg-transparent border-none outline-none focus:ring-0 focus:outline-none text-gray-900">
                        {getDropdownOptions('epithelialCells').map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-800">Bacteria</span>
                      <select value={urinalysisText.bacteria} onChange={(e) => updateUrinalysisText('bacteria', e.target.value)} className="w-40 text-right text-xs bg-transparent border-none outline-none focus:ring-0 focus:outline-none text-gray-900">
                        {getDropdownOptions('bacteria').map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Remarks */}
                  <div className="space-y-2 md:col-span-2">
                    <div className="text-[11px] uppercase tracking-wide text-gray-500">Remarks</div>
                    <textarea value={urinalysisText.remarks} onChange={(e) => updateUrinalysisText('remarks', e.target.value)} placeholder="Enter remarks here" className="w-full resize-y min-h-[60px] text-xs bg-transparent border border-gray-200 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                </div>
              </div>

            </>
          )}
        </div>
      </div>
       
              

      
      
           

      {/* Image Modal */}
      <div className="z-[9999]">
        <ImageModal
          isOpen={!!modalImage}
          onClose={() => setModalImage(null)}
          imageSrc={modalImage?.src || ''}
          imageAlt={modalImage?.alt || ''}
          title={modalImage?.title || ''}
        />
      </div>




        {/* Delete Confirmation Modal */}
        <div className="z-[9999]">
          <ConfirmationModal
            isOpen={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            onConfirm={confirmDeleteTest}
            title="Delete Test"
            message="Are you sure you want to delete this test? This action cannot be undone."
            type="danger"
            confirmText="Delete"
            cancelText="Cancel"
          />
        </div>

        {/* Notification */}
        {showNotification && (
          <div className="fixed top-4 right-4 z-[9999]">
            <Notification
              message={notificationMessage}
              type={notificationType}
              onClose={() => setShowNotification(false)}
              duration={4000}
            />
          </div>
        )}

      </div>
    </Suspense>
  )
}


