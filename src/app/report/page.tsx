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
import { updatePatient, updateTest, updateTestWithAnalysis, testDatabaseConnection, deleteTest, deleteImageFromTest, deleteImageFromStorage, addImageToTest, uploadImageToStorage, uploadBase64Image } from '@/lib/api'
import { Calendar, Download, Microscope, Edit, CheckCircle, Save, X, Plus, Camera, Trash2, ChevronDown, Upload, ChevronLeft, ChevronRight, Brain, Search, ArrowLeft } from 'lucide-react'
import ImageModal from '@/components/ImageModal'
import ImageAnalysisModal from '@/components/ImageAnalysisModal'
import NewPatientModal from '@/components/NewPatientModal'
import ConfirmationModal from '@/components/ConfirmationModal'
import CameraCaptureModal from '@/components/CameraCaptureModal'
import Notification from '@/components/Notification'
import PatientTestHistory from '@/components/PatientTestHistory'
import Image from 'next/image'
import { UrinalysisResult } from '@/lib/gemini'
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
    sampleId: '',
    collectionTime: '',
    technician: ''
  })
  const [saving, setSaving] = useState(false)
  const [showNewPatientModal, setShowNewPatientModal] = useState(false)
  const [showImageAnalysisModal, setShowImageAnalysisModal] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null) // Used in handleImageCapture - keeping for future use
  const [capturedImages, setCapturedImages] = useState<string[]>([]) // Store multiple captured images
  const [focusMode, setFocusMode] = useState<'field' | 'report'>('field') // Focus mode for UI
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showNotification, setShowNotification] = useState(false)
  const [notificationMessage, setNotificationMessage] = useState('')
  const [notificationType, setNotificationType] = useState<'success' | 'error' | 'warning' | 'info'>('success')
  const [searchQuery, setSearchQuery] = useState('')

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showHeader, setShowHeader] = useState(true)
  const [liveStreamActive, setLiveStreamActive] = useState(false)
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [scopeMask, setScopeMask] = useState(true)
  const [overlayEnabled, setOverlayEnabled] = useState(false)
  const [objectCount, setObjectCount] = useState(0)
  const [opencvReady, setOpencvReady] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [dateParam, setDateParam] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search)
      setDateParam(sp.get('date'))
    }
  }, [])

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

  const getMicroscopicFindings = (): MicroscopicFindings[] => {
    if (!selectedTest) return []
    return [
      { item: 'Red Blood Cells (RBC)', count: selectedTest.rbc_count || '0', unit: selectedTest.rbc_unit || '/HPF', morphology: selectedTest.rbc_morphology || 'Normal', notes: selectedTest.rbc_notes || '', status: selectedTest.rbc_status || 'normal', accuracy: selectedTest.rbc_accuracy || 0, isEditing: false },
      { item: 'White Blood Cells (WBC)', count: selectedTest.wbc_count || '0', unit: selectedTest.wbc_unit || '/HPF', morphology: selectedTest.wbc_morphology || 'Normal', notes: selectedTest.wbc_notes || '', status: selectedTest.wbc_status || 'normal', accuracy: selectedTest.wbc_accuracy || 0, isEditing: false },
      { item: 'Epithelial Cells', count: selectedTest.epithelial_cells_count || '0', unit: selectedTest.epithelial_cells_unit || '/HPF', morphology: selectedTest.epithelial_cells_morphology || 'Normal', notes: selectedTest.epithelial_cells_notes || '', status: selectedTest.epithelial_cells_status || 'normal', accuracy: selectedTest.epithelial_cells_accuracy || 0, isEditing: false },
      { item: 'Crystals', count: selectedTest.crystals_count || '0', unit: selectedTest.crystals_unit || '/HPF', morphology: selectedTest.crystals_morphology || 'Normal', notes: selectedTest.crystals_notes || '', status: selectedTest.crystals_status || 'normal', accuracy: selectedTest.crystals_accuracy || 0, isEditing: false },
      { item: 'Casts', count: selectedTest.casts_count || '0', unit: selectedTest.casts_unit || '/LPF', morphology: selectedTest.casts_morphology || 'Normal', notes: selectedTest.casts_notes || '', status: selectedTest.casts_status || 'normal', accuracy: selectedTest.casts_accuracy || 0, isEditing: false },
      { item: 'Bacteria', count: selectedTest.bacteria_count || '0', unit: selectedTest.bacteria_unit || '/HPF', morphology: selectedTest.bacteria_morphology || 'Normal', notes: selectedTest.bacteria_notes || '', status: selectedTest.bacteria_status || 'normal', accuracy: selectedTest.bacteria_accuracy || 0, isEditing: false },
      { item: 'Yeast', count: selectedTest.yeast_count || '0', unit: selectedTest.yeast_unit || '/HPF', morphology: selectedTest.yeast_morphology || 'Normal', notes: selectedTest.yeast_notes || '', status: selectedTest.yeast_status || 'normal', accuracy: selectedTest.yeast_accuracy || 0, isEditing: false },
      { item: 'Mucus', count: selectedTest.mucus_count || '0', unit: selectedTest.mucus_unit || '/LPF', morphology: selectedTest.mucus_morphology || 'Normal', notes: selectedTest.mucus_notes || '', status: selectedTest.mucus_status || 'normal', accuracy: selectedTest.mucus_accuracy || 0, isEditing: false },
      { item: 'Sperm', count: selectedTest.sperm_count || '0', unit: selectedTest.sperm_unit || '/HPF', morphology: selectedTest.sperm_morphology || 'Normal', notes: selectedTest.sperm_notes || '', status: selectedTest.sperm_status || 'normal', accuracy: selectedTest.sperm_accuracy || 0, isEditing: false },
      { item: 'Parasites', count: selectedTest.parasites_count || '0', unit: selectedTest.parasites_unit || '/HPF', morphology: selectedTest.parasites_morphology || 'Normal', notes: selectedTest.parasites_notes || '', status: selectedTest.parasites_status || 'normal', accuracy: selectedTest.parasites_accuracy || 0, isEditing: false },
    ]
  }

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

  const findings = useMemo(() => getMicroscopicFindings(), [selectedTest])

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
          test.test_code.toLowerCase().includes(query) ||
          test.sample_id?.toLowerCase().includes(query)
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
        sampleId: selectedTest.sample_id || '',
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
  const captureImage = () => {
    if (!videoRef.current || !mediaStream) return
    
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    ctx.drawImage(videoRef.current, 0, 0)
    
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8)
    setCapturedImages(prev => [...prev, imageDataUrl])
    
    setNotificationMessage('Image captured successfully!')
    setNotificationType('success')
    setShowNotification(true)
  }

  // Remove captured image
  const removeCapturedImage = (index: number) => {
    setCapturedImages(prev => prev.filter((_, i) => i !== index))
  }

  // Image segmentation function
  const performSegmentation = (videoElement: HTMLVideoElement, canvas: HTMLCanvasElement) => {
    if (!opencvReady || !window.cv) return

    try {
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Set canvas size to match video
      canvas.width = videoElement.videoWidth
      canvas.height = videoElement.videoHeight

      // Draw current video frame to canvas
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)

      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      
      // Create OpenCV Mat from image data
      const src = window.cv.matFromImageData(imageData)
      const gray = new window.cv.Mat()
      const binary = new window.cv.Mat()
      const contours = new window.cv.MatVector()
      const hierarchy = new window.cv.Mat()

      // Convert to grayscale
      window.cv.cvtColor(src, gray, window.cv.COLOR_RGBA2GRAY)

      // Apply Gaussian blur to reduce noise
      const blurred = new window.cv.Mat()
      window.cv.GaussianBlur(gray, blurred, new window.cv.Size(5, 5), 0)

      // Apply adaptive threshold
      window.cv.adaptiveThreshold(blurred, binary, 255, window.cv.ADAPTIVE_THRESH_GAUSSIAN_C, window.cv.THRESH_BINARY, 11, 2)

      // Find contours
      window.cv.findContours(binary, contours, hierarchy, window.cv.RETR_EXTERNAL, window.cv.CHAIN_APPROX_SIMPLE)

      // Filter contours by area (remove very small objects)
      const minArea = 50 // Minimum area threshold
      let validContours = 0
      const validContourIndices: number[] = []

      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i)
        const area = window.cv.contourArea(contour)
        if (area > minArea) {
          validContours++
          validContourIndices.push(i)
        }
        contour.delete()
      }

      // Update object count
      setObjectCount(validContours)

      // Clear canvas (keep it transparent)
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Set composite operation to overlay contours on video
      ctx.globalCompositeOperation = 'source-over'

      // Draw detected objects
      ctx.strokeStyle = '#00ff00'
      ctx.lineWidth = 2
      ctx.fillStyle = 'rgba(0, 255, 0, 0.3)'

      for (const index of validContourIndices) {
        const contour = contours.get(index)
        const points = []
        
        for (let j = 0; j < contour.rows; j++) {
          const point = contour.data32S.subarray(j * 2, j * 2 + 2)
          points.push({ x: point[0], y: point[1] })
        }

        if (points.length > 0) {
          ctx.beginPath()
          ctx.moveTo(points[0].x, points[0].y)
          for (let k = 1; k < points.length; k++) {
            ctx.lineTo(points[k].x, points[k].y)
          }
          ctx.closePath()
          ctx.stroke()
          ctx.fill()
        }
        
        contour.delete()
      }

      // Clean up
      src.delete()
      gray.delete()
      binary.delete()
      blurred.delete()
      contours.delete()
      hierarchy.delete()

    } catch (error) {
      console.error('Segmentation error:', error)
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

  // Load OpenCV.js
  useEffect(() => {
    const loadOpenCV = async () => {
      if (typeof window !== 'undefined' && !window.cv) {
        const script = document.createElement('script')
        script.src = 'https://docs.opencv.org/4.8.0/opencv.js'
        script.async = true
        script.onload = () => {
          window.cv['onRuntimeInitialized'] = () => {
            console.log('OpenCV.js loaded successfully')
            setOpencvReady(true)
          }
        }
        document.head.appendChild(script)
      } else if (window.cv) {
        setOpencvReady(true)
      }
    }
    
    loadOpenCV()
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

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel editing - reset to original data
      if (selectedPatient && selectedTest) {
        setEditData({
          patientName: selectedPatient.name,
          patientAge: selectedPatient.age.toString(),
          patientGender: selectedPatient.gender,
          sampleId: selectedTest.sample_id || '',
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
          sampleId: selectedTest.sample_id || '',
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
          sample_id: editData.sampleId,
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

  const handleNewPatient = () => {
    setShowNewPatientModal(true)
  }

  // const handleImageAnalysis = () => {
  //   setShowImageAnalysisModal(true)
  // }

  const handleCameraCapture = () => {
    // Camera is always active now, just capture image
    captureImage()
  }

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
      
      // Refresh the data to show the new image
      if (dateParam) {
        await preloadByDate(dateParam)
      }
      
      setNotificationMessage(`Image captured and saved successfully! (${currentImageCount + 1}/10)`)
      setNotificationType('success')
      setShowNotification(true)
    } catch (error) {
      console.error('Error saving captured image:', error)
      setNotificationMessage('Failed to save image. Please try again.')
      setNotificationType('error')
      setShowNotification(true)
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

  const handleAnalysisComplete = async (result: UrinalysisResult) => {
    if (selectedTest) {
      try {
        await updateTestWithAnalysis(selectedTest.id, result)
        // Refresh the data to show updated results
        if (dateParam) {
          preloadByDate(dateParam)
        }
        alert('Analysis results saved successfully!')
      } catch (error) {
        console.error('Failed to save analysis:', error)
        alert('Failed to save analysis results. Please try again.')
      }
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
      
      setShowNewPatientModal(false)
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
              className={`flex items-center space-x-1 px-2 py-1 rounded border transition-colors ${
                sidebarCollapsed 
                  ? 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100' 
                  : 'border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100'
              }`}
              title={sidebarCollapsed ? 'Open Sidebar' : 'Close Sidebar'}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">{sidebarCollapsed ? 'Open Sidebar' : 'Close Sidebar'}</span>
            </button>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <h1 className="text-sm md:text-base font-bold text-gray-900 leading-tight">Microscopic Report</h1>
              
              {/* Date Display */}
              <div className="text-xs text-gray-600">
                <span>{selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Today'}</span>
              </div>
              
              <div className="text-xs md:text-sm font-mono font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 md:px-2.5 md:py-1 rounded w-fit">
                {selectedTest?.test_code || 'N/A'}
              </div>
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
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-72px)] overflow-hidden">
        {/* Left Sidebar */}
        <div className={`${sidebarCollapsed ? 'hidden' : 'w-80'} bg-white border-r border-gray-200 h-full flex flex-col transition-all duration-300 ease-in-out relative z-[55]`}>
          
          {/* Main Sidebar Content */}
          <div className={`${sidebarCollapsed ? 'px-2' : 'p-3'} transition-all duration-300 flex-1 overflow-y-auto`}>

            {/* Date Selection */}
            {!sidebarCollapsed && (
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
            )}

            {/* Search and Filters */}
            <div className={`${sidebarCollapsed ? 'mb-3' : 'mb-4'} ${sidebarCollapsed ? 'space-y-2' : 'space-y-3'}`}>
              {/* Search */}
              {!sidebarCollapsed && (
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
              )}



              {/* Results Count */}
              {!sidebarCollapsed && (
                <div className="text-xs text-gray-600">
                  {selectedDate && (
                    <span className="text-blue-600 font-medium">{new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                  )}
                  <span className="text-gray-600"> • {filteredTests.length} of {tests.length} tests</span>
                </div>
              )}
           </div>

           {loading ? (
             <div className={`text-center ${sidebarCollapsed ? 'py-2' : 'py-4'} text-gray-600`}>
               <div className="animate-pulse">
                 {sidebarCollapsed ? (
                   <>
                     <div className="h-3 bg-gray-200 rounded mb-1"></div>
                     <div className="h-3 bg-gray-200 rounded mb-1"></div>
                     <div className="h-3 bg-gray-200 rounded"></div>
                   </>
                 ) : (
                   <>
                     <div className="h-4 bg-gray-200 rounded mb-2"></div>
                     <div className="h-4 bg-gray-200 rounded mb-2"></div>
                     <div className="h-4 bg-gray-200 rounded"></div>
                   </>
                 )}
               </div>
             </div>
           ) : error ? (
             <div className={`text-center ${sidebarCollapsed ? 'py-2' : 'py-4'}`}>
               {!sidebarCollapsed && (
                 <>
                   <div className="text-red-600 mb-2 text-sm">{error}</div>
                   <button onClick={clearError} className="text-blue-600 hover:text-blue-800 text-xs">Try again</button>
                 </>
               )}
               {sidebarCollapsed && (
                 <div className="text-red-500 text-xs" title={error}>⚠️</div>
               )}
             </div>
           ) : (
             <>
               <div className="space-y-1.5 mb-3">
                 {filteredTests.length === 0 ? (
                   <div className={`text-gray-500 ${sidebarCollapsed ? 'text-xs' : 'text-sm'} text-center ${sidebarCollapsed ? 'py-2' : 'py-4'}`}>
                     {sidebarCollapsed ? (
                       <div title={tests.length === 0 ? 'No tests available' : 'No tests match your search/filter'}>
                         {tests.length === 0 ? '📭' : '🔍'}
                       </div>
                     ) : (
                       tests.length === 0 ? 'No tests available' : 'No tests match your search/filter'
                     )}
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
                         className={`${sidebarCollapsed ? 'p-1.5' : 'p-2'} rounded-lg cursor-pointer transition-colors ${
                           selectedTest?.id === test.id 
                             ? 'bg-blue-100 border-l-4 border-blue-500' 
                             : 'bg-gray-100 hover:bg-gray-200'
                         }`}
                       >
                         {sidebarCollapsed ? (
                           <div className="text-center" title={`${patient?.name || 'Unknown Patient'} - ${test.test_code} - ${test.status}`}>
                             <div className="text-xs font-medium text-gray-900 truncate">
                               {patient?.name?.charAt(0) || 'U'}
                             </div>
                             <div className="text-xs text-gray-500 mt-1">
                               {test.test_code?.split('-')[2] || 'XX'}
                             </div>
                           </div>
                         ) : (
                           <>
                             <div className="text-xs font-medium text-gray-900">{patient?.name || 'Unknown Patient'}</div>
                             <div className="text-xs text-gray-600">Test: {test.test_code}</div>
                             <div className="text-xs text-gray-500">Status: {test.status}</div>
                           </>
                         )}
                       </div>
                     )
                   })
                 )}
               </div>
               
               {/* New Test Button */}
               <div className="border-t border-gray-200 pt-3">
                 <button
                   onClick={handleNewPatient}
                   className={`w-full flex items-center justify-center ${sidebarCollapsed ? 'px-2 py-2' : 'px-3 py-2 space-x-1.5'} bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors`}
                 >
                   <Plus className={`${sidebarCollapsed ? 'h-5 w-5' : 'h-5 w-5'}`} />
                   {!sidebarCollapsed && <span className="text-xs font-medium">Add New Test</span>}
                 </button>
               </div>


               
             </>
           )}
         </div>

          {/* Bottom Sidebar Buttons - Settings and Logout */}
          <div className={`${sidebarCollapsed ? 'px-2' : 'p-3'} border-t border-gray-200 mt-auto`}>
            
            
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
              className={`w-full flex items-center justify-center ${sidebarCollapsed ? 'px-2 py-2' : 'px-3 py-2 space-x-1.5'} bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors`}
            >
              <svg className={`${sidebarCollapsed ? 'h-4 w-4' : 'h-4 w-4'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16,17 21,12 16,7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              {!sidebarCollapsed && <span className="text-xs font-medium">Logout</span>}
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto relative h-full" key={selectedPatient?.id || 'no-patient'}>
          {!selectedPatient ? (
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
                    
                    {/* Segmentation overlay */}
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
                            <span className="text-sm font-medium">
                              Objects: {objectCount}
                            </span>
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
                        <button
                          onClick={startLiveCamera}
                          className="w-16 h-16 mx-auto mb-4 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center transition-colors cursor-pointer group"
                        >
                          <svg className="w-8 h-8 text-white group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      ) : (
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      <p className="text-gray-400 text-sm">
                        {!liveStreamActive ? 'Click camera icon to start' : 'Camera access denied or unavailable'}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Hover Controls - Only show when hovering over camera */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/20" style={{ zIndex: 10 }}>
                  {/* Top Controls */}
                  <div className="absolute top-4 right-4 flex justify-end items-center gap-2">
                    <button
                      onClick={() => setOverlayEnabled(v => !v)}
                      className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${overlayEnabled ? 'bg-green-600/90 text-white hover:bg-green-700/90' : 'bg-white/90 text-gray-800 hover:bg-white'}`}
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-medium">
                        {overlayEnabled ? `Segmentation: ${objectCount} objects` : 'Segmentation: OFF'}
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
                        disabled={!liveStreamActive || !mediaStream}
                        className="px-4 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 text-sm font-medium flex items-center gap-2 disabled:bg-gray-600 disabled:cursor-not-allowed"
                      >
                        <Plus className="h-4 w-4" />
                        Capture Field
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
                          {capturedImages.length} images captured
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Report Content */}
           

              {showHeader ? (
              <div id="report-content" className="bg-white rounded-lg p-3 shadow-sm mb-3 relative">
                <div className="flex items-center justify-between mb-2">
                   <h1 className="text-lg md:text-xl font-bold text-gray-900">Microscopic Urine Analysis Report - {selectedTest?.test_code || 'N/A'}</h1>
                   <div className="flex items-center gap-2">
                     <button
                       onClick={() => setShowHistory((v) => !v)}
                       className={`h-8 inline-flex items-center gap-1.5 px-2.5 rounded-lg transition-colors text-xs ${
                         showHistory 
                           ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' 
                           : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                       }`}
                       title={showHistory ? 'Hide patient history' : 'Show patient history'}
                     >
                       <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
                       <span>{showHistory ? 'Hide History' : 'Show History'}</span>
                     </button>
                     <button 
                       onClick={handleEditToggle}
                       className={`h-8 inline-flex items-center gap-1.5 px-2.5 rounded-md transition-colors text-xs ${
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
                         className={`h-8 inline-flex items-center gap-1.5 bg-green-600 text-white px-2.5 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 text-xs`}
                       >
                         <Save className="h-3 w-3" />
                         <span>{saving ? 'Saving...' : 'Save'}</span>
                       </button>
                     )}
                     {selectedTest && (
                       <>
                         <button 
                           onClick={handleDeleteTest}
                           className={`h-8 inline-flex items-center gap-1.5 px-2.5 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors text-xs`}
                           title="Delete Test"
                         >
                           <Trash2 className="h-3 w-3" />
                           <span>Delete</span>
                         </button>
                         <button 
                           onClick={handleValidateTest}
                           disabled={selectedTest.status === 'reviewed'}
                           className={`h-8 inline-flex items-center gap-1.5 px-2.5 rounded-md transition-colors text-xs ${selectedTest.status === 'reviewed' ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}
                           title="Verify Test"
                         >
                           <CheckCircle className="h-3 w-3" />
                           <span>Verify</span>
                         </button>
                       </>
                     )}
                   </div>
                 </div>
                                 <div className="grid grid-cols-3 gap-4 mb-3">
                   <div className="space-y-2">
                     <div className="flex justify-between">
                       <span className="text-xs text-gray-700 font-medium">Name:</span>
                       {isEditing ? (
                         <input
                           type="text"
                           value={editData.patientName}
                           onChange={(e) => setEditData(prev => ({ ...prev, patientName: e.target.value }))}
                           className="text-xs font-semibold text-gray-900 bg-white border border-gray-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                           className="text-xs font-semibold text-gray-900 bg-white border border-gray-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 w-16"
                           min="0"
                           max="150"
                         />
                       ) : (
                         <span className="text-xs font-semibold text-gray-900">{selectedPatient.age} Years</span>
                       )}
                     </div>
                   </div>
                   <div className="space-y-2">
                     <div className="flex justify-between">
                       <span className="text-xs text-gray-700 font-medium">Gender:</span>
                       {isEditing ? (
                         <select
                           value={editData.patientGender}
                           onChange={(e) => setEditData(prev => ({ ...prev, patientGender: e.target.value as 'male' | 'female' | 'other' }))}
                           className="text-xs font-semibold text-gray-900 bg-white border border-gray-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                       <span className="text-xs text-gray-700 font-medium">Sample ID:</span>
                       {isEditing ? (
                         <input
                           type="text"
                           value={editData.sampleId}
                           onChange={(e) => setEditData(prev => ({ ...prev, sampleId: e.target.value }))}
                           className="text-xs font-semibold text-gray-900 bg-white border border-gray-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                         />
                       ) : (
                         <span className="text-xs font-semibold text-gray-900">{selectedTest?.sample_id || 'N/A'}</span>
                       )}
                     </div>
                     <div className="flex justify-between">
                       <span className="text-xs text-gray-700 font-medium">Collection Time:</span>
                       {isEditing ? (
                         <input
                           type="time"
                           value={editData.collectionTime}
                           onChange={(e) => setEditData(prev => ({ ...prev, collectionTime: e.target.value }))}
                           className="text-xs font-semibold text-gray-900 bg-white border border-gray-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                         />
                       ) : (
                         <span className="text-xs font-semibold text-gray-900">{selectedTest?.collection_time || 'N/A'}</span>
                       )}
                     </div>
                   </div>
                   <div className="space-y-2">
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
                           className="text-xs font-semibold text-gray-900 bg-white border border-gray-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                         />
                       ) : (
                         <span className="text-xs font-semibold text-gray-900">{selectedTest?.technician || 'N/A'}</span>
                       )}
                     </div>
                     <div className="flex justify-between items-center">
                       <span className="text-xs text-gray-700 font-medium">Status:</span>
                       <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] md:text-xs font-semibold tracking-wide ${
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
                  
                  {/* Patient History (integrated within main card) */}
                  {showHistory && (
                    <div className="border-t border-gray-200 pt-3 mt-3">
                      <PatientTestHistory 
                        selectedPatient={selectedPatient}
                        selectedTest={selectedTest}
                        onTestSelect={handleTestSelection}
                      />
                    </div>
                  )}

               </div>
              ) : (
                null
              )}

                   {/* Microscopic Images Section */}
                   <div className="bg-white rounded-lg p-3 shadow-sm mb-3">
                     <div className="flex items-center justify-between mb-2">
                       <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                         <Microscope className="h-4 w-4 mr-2 text-green-600" />
                         Microscopic Images
                         <span className="ml-2 text-xs text-gray-600 font-normal">- High Power Field (HPF) Analysis</span>
                         <span className="ml-3 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                           {capturedImages.length}/10 images
                         </span>
                       </h3>
                     </div>
                   </div>

                   {/* Image Grid */}
                   {capturedImages.length > 0 ? (
                     <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
                       {capturedImages.map((imageDataUrl, index) => (
                         <div key={index} className="relative group">
                           <img
                             src={imageDataUrl}
                             alt={`Captured image ${index + 1}`}
                             className="w-full h-24 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                             onClick={() => setModalImage({ src: imageDataUrl, alt: `Captured image ${index + 1}`, title: `HPF Sample ${index + 1}` })}
                           />
                           <button
                             onClick={() => removeCapturedImage(index)}
                             className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                           >
                             ×
                           </button>
                         </div>
                       ))}
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
                   <div className="flex items-center space-x-3 text-xs">
                     <div className="flex items-center space-x-1">
                       <span className="text-gray-600">Total Elements:</span>
                       <span className="font-semibold text-gray-900">{findings.length}</span>
                     </div>
                     <div className="flex items-center space-x-1">
                       <span className="text-gray-600">Abnormal:</span>
                       <span className="font-semibold text-orange-600">
                         {findings.filter(f => f.status === 'abnormal' || f.status === 'critical').length}
                       </span>
                     </div>
                     <div className="flex items-center space-x-1">
                       <span className="text-gray-600">Avg Accuracy:</span>
                       <span className="font-semibold text-blue-600">
                         {findings.length > 0 ? Math.round(findings.reduce((sum, f) => sum + f.accuracy, 0) / findings.length) : 0}%
                       </span>
                     </div>
                   </div>
                 </div>
                 
                 <div className="overflow-x-auto">
                   <table className="w-full text-xs border border-gray-300">
                     {/* Header */}
                     <thead>
                       <tr className="bg-blue-600 text-white">
                         <th className="py-1.5 px-2 text-center font-bold text-sm" colSpan={7}>
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
                         <th className="py-1.5 px-2 text-center font-semibold text-gray-800">Many</th>
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
                         <td className="py-1.5 px-2 text-center text-gray-700">&gt;100</td>
                       </tr>
                       
                       {/* Crystals (normal) */}
                       <tr className="border-b border-gray-300">
                         <td className="py-1.5 px-2 font-medium text-gray-900 border-r border-gray-300">Crystals (normal)</td>
                         <td className="py-1.5 px-2 text-center text-gray-700 border-r border-gray-300">per HPF</td>
                         <td className="py-1.5 px-2 text-center text-gray-700 border-r border-gray-300">0</td>
                         <td className="py-1.5 px-2 text-center text-gray-700 border-r border-gray-300">0-2</td>
                         <td className="py-1.5 px-2 text-center text-gray-700 border-r border-gray-300">2-5</td>
                         <td className="py-1.5 px-2 text-center text-red-600 font-semibold border-r border-gray-300">5-20</td>
                         <td className="py-1.5 px-2 text-center text-gray-700">&gt;20</td>
                       </tr>
                       
                       {/* Bacteria */}
                       <tr className="border-b border-gray-300">
                         <td className="py-1.5 px-2 font-medium text-gray-900 border-r border-gray-300">Bacteria</td>
                         <td className="py-1.5 px-2 text-center text-gray-700 border-r border-gray-300">per HPF</td>
                         <td className="py-1.5 px-2 text-center text-gray-700 border-r border-gray-300">0</td>
                         <td className="py-1.5 px-2 text-center text-red-600 font-semibold border-r border-gray-300">0-10</td>
                         <td className="py-1.5 px-2 text-center text-red-600 font-semibold border-r border-gray-300">10-50</td>
                         <td className="py-1.5 px-2 text-center text-gray-700 border-r border-gray-300">50-200</td>
                         <td className="py-1.5 px-2 text-center text-gray-700">&gt;200</td>
                       </tr>
                       
                       {/* Mucus threads */}
                       <tr className="border-b border-gray-300">
                         <td className="py-1.5 px-2 font-medium text-gray-900 border-r border-gray-300">Mucus threads</td>
                         <td className="py-1.5 px-2 text-center text-gray-700 border-r border-gray-300">per LPF</td>
                         <td className="py-1.5 px-2 text-center text-gray-700 border-r border-gray-300">0</td>
                         <td className="py-1.5 px-2 text-center text-gray-700 border-r border-gray-300">0-1</td>
                         <td className="py-1.5 px-2 text-center text-gray-700 border-r border-gray-300">1-3</td>
                         <td className="py-1.5 px-2 text-center text-gray-700 border-r border-gray-300">3-10</td>
                         <td className="py-1.5 px-2 text-center text-gray-700">&gt;10</td>
                       </tr>
                       
                       {/* Casts */}
                       <tr className="border-b border-gray-300">
                         <td className="py-1.5 px-2 font-medium text-gray-900 border-r border-gray-300">Casts</td>
                         <td className="py-1.5 px-2 text-center text-gray-700 border-r border-gray-300">per LPF</td>
                         <td className="py-1.5 px-2 text-center text-gray-700 border-r border-gray-300" colSpan={5}>
                           Numerical ranges: 0-2, 2-5, 5-10, &gt;10
                         </td>
                       </tr>
                       
                       {/* RBCs */}
                       <tr className="border-b border-gray-300">
                         <td className="py-3 px-4 font-medium text-gray-900 border-r border-gray-300">RBCs</td>
                         <td className="py-3 px-4 text-center text-gray-700 border-r border-gray-300">per HPF</td>
                         <td className="py-3 px-4 text-center text-gray-700 border-r border-gray-300" colSpan={5}>
                           Numerical ranges: 0-2, 2-5, 5-10, 10-25, 25-50, 50-100, &gt;100
                         </td>
                       </tr>
                       
                       {/* WBCs */}
                       <tr className="border-b border-gray-300">
                         <td className="py-3 px-4 font-medium text-gray-900 border-r border-gray-300">WBCs</td>
                         <td className="py-3 px-4 text-center text-gray-700 border-r border-gray-300">per HPF</td>
                         <td className="py-3 px-4 text-center text-gray-700 border-r border-gray-300" colSpan={5}>
                           Numerical ranges: 0-2, 2-5, 5-10, 10-25, 25-50, 50-100, &gt;100
                         </td>
                       </tr>
                       
                       {/* Squamous epithelial cells */}
                       <tr className="border-b border-gray-300">
                         <td className="py-3 px-4 font-medium text-gray-900 border-r border-gray-300">Squamous epithelial cells</td>
                         <td className="py-3 px-4 text-center text-gray-700 border-r border-gray-300"></td>
                         <td className="py-3 px-4 text-center text-red-600 font-semibold border-r border-gray-300" colSpan={5}>
                           Rare, few, moderate or many per LPF
                         </td>
                       </tr>
                       
                       {/* Transitional epithelial cells, yeasts, Trichomonas */}
                       <tr className="border-b border-gray-300">
                         <td className="py-3 px-4 font-medium text-gray-900 border-r border-gray-300">Transitional epithelial cells, yeasts, Trichomonas</td>
                         <td className="py-3 px-4 text-center text-gray-700 border-r border-gray-300"></td>
                         <td className="py-3 px-4 text-center text-red-600 font-semibold border-r border-gray-300" colSpan={5}>
                           Rare, few, moderate, or many per HPF
                         </td>
                       </tr>
                       
                       {/* Renal tubular epithelial cells */}
                       <tr className="border-b border-gray-300">
                         <td className="py-3 px-4 font-medium text-gray-900 border-r border-gray-300">Renal tubular epithelial cells</td>
                         <td className="py-3 px-4 text-center text-gray-700 border-r border-gray-300"></td>
                         <td className="py-3 px-4 text-center text-red-600 font-semibold border-r border-gray-300" colSpan={5}>
                           Average number per 10 HPFs
                         </td>
                       </tr>
                       
                       {/* Oval fat bodies */}
                       <tr className="border-b border-gray-300">
                         <td className="py-3 px-4 font-medium text-gray-900 border-r border-gray-300">Oval fat bodies</td>
                         <td className="py-3 px-4 text-center text-gray-700 border-r border-gray-300"></td>
                         <td className="py-3 px-4 text-center text-red-600 font-semibold border-r border-gray-300" colSpan={5}>
                           Average number per HPF
                         </td>
                       </tr>
                       
                       {/* Abnormal crystals, casts */}
                       <tr className="border-b border-gray-300">
                         <td className="py-3 px-4 font-medium text-gray-900 border-r border-gray-300">Abnormal crystals, casts</td>
                         <td className="py-3 px-4 text-center text-gray-700 border-r border-gray-300"></td>
                         <td className="py-3 px-4 text-center text-red-600 font-semibold border-r border-gray-300" colSpan={5}>
                           Average number per LPF
                         </td>
                       </tr>
                     </tbody>
                   </table>
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

        {/* New Patient Modal */}
        {showNewPatientModal && (
          <div className="z-[9999]">
            <NewPatientModal
              isOpen={showNewPatientModal}
              onClose={() => setShowNewPatientModal(false)}
              onPatientCreated={handlePatientCreated}
              currentDate={dateParam || new Date().toISOString().split('T')[0]}
            />
          </div>
        )}

        {/* Image Analysis Modal */}
        {showImageAnalysisModal && (
          <div className="z-[9999]">
            <ImageAnalysisModal
              isOpen={showImageAnalysisModal}
              onClose={() => setShowImageAnalysisModal(false)}
              onAnalysisComplete={handleAnalysisComplete}
            />
          </div>
        )}


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


