'use client'

import { useEffect, useState, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useDashboard } from '@/hooks/useDashboard'
import { updatePatient, updateTest, createPatient, updateTestWithAnalysis, testDatabaseConnection, deleteTest } from '@/lib/api'
import { Calendar, Download, Printer, Microscope, Edit, CheckCircle, Save, X, Plus, User, Brain, Camera, Trash2, ChevronDown } from 'lucide-react'
import ImageModal from '@/components/ImageModal'
import ImageAnalysisModal from '@/components/ImageAnalysisModal'
import NewPatientModal from '@/components/NewPatientModal'
import ConfirmationModal from '@/components/ConfirmationModal'
import CameraCaptureModal from '@/components/CameraCaptureModal'
import Notification from '@/components/Notification'
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
  const [showCamera, setShowCamera] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showNotification, setShowNotification] = useState(false)
  const [notificationMessage, setNotificationMessage] = useState('')
  const [notificationType, setNotificationType] = useState<'success' | 'error' | 'warning' | 'info'>('success')
  const [showMonthDropdown, setShowMonthDropdown] = useState(false)
  const searchParams = useSearchParams()
  const dateParam = searchParams.get('date')

  // Close month dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMonthDropdown && !(event.target as Element).closest('.month-dropdown')) {
        setShowMonthDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMonthDropdown])

  const {
    patients,
    selectedPatient,
    tests,
    selectedTest,
    loading,
    error,
    selectPatient,
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
    if (accuracy >= 95) return 'text-green-600 bg-green-100'
    if (accuracy >= 90) return 'text-yellow-600 bg-yellow-100'
    if (accuracy >= 80) return 'text-orange-600 bg-orange-100'
    return 'text-red-600 bg-red-100'
  }

  const [dummy, setDummy] = useState(0)
  const toggleEdit = () => setDummy(prev => prev + 1)

  const findings = useMemo(() => getMicroscopicFindings(), [selectedTest])

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
      await preloadByDate(dateParam || '')
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

  const handleImageAnalysis = () => {
    setShowImageAnalysisModal(true)
  }

  const handleCameraCapture = () => {
    setShowCamera(true)
  }

  const handleImageCapture = (imageData: string) => {
    setCapturedImage(imageData)
    // Here you would typically save the image to the database
    console.log('Image captured:', imageData.substring(0, 100) + '...')
    
    // Show success message
    setNotificationMessage('Image captured successfully!')
    setNotificationType('success')
    setShowNotification(true)
  }

  const handleDeleteTest = async () => {
    if (!selectedTest) return
    setShowDeleteConfirm(true)
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back</span>
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Microscopic Report</h1>
          </div>
                     <div className="flex items-center space-x-4">
             <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
               <Download className="h-5 w-5" />
               <span>Export</span>
             </button>
             
             {/* Month Navigation Dropdown */}
             <div className="relative month-dropdown">
               <button
                 onClick={() => setShowMonthDropdown(!showMonthDropdown)}
                 className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
               >
                 <Calendar className="h-4 w-4" />
                 <span className="font-medium">Quick Month</span>
                 <ChevronDown className={`h-4 w-4 transition-transform ${showMonthDropdown ? 'rotate-180' : ''}`} />
               </button>
               
               {showMonthDropdown && (
                 <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                   <div className="py-2">
                     {Array.from({ length: 12 }, (_, i) => {
                       const month = new Date(2025, i, 1).toLocaleString('default', { month: 'long' })
                       const monthNumber = String(i + 1).padStart(2, '0')
                       return (
                         <button
                           key={i}
                           onClick={() => {
                             const newDate = `2025-${monthNumber}-01`
                             setSelectedDate(newDate)
                             preloadByDate(newDate)
                             setShowMonthDropdown(false)
                           }}
                           className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 transition-colors"
                         >
                           {month}
                         </button>
                       )
                     })}
                   </div>
                 </div>
               )}
             </div>
             
             <div className="flex items-center text-lg font-semibold text-gray-900">
               <span>{selectedDate}</span>
             </div>

           </div>
        </div>
      </div>

      <div className="flex">
                 {/* Left Sidebar */}
         <div className="w-80 bg-white border-r border-gray-200 min-h-screen p-4">

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
               <div className="text-red-600 mb-2">{error}</div>
               <button onClick={clearError} className="text-blue-600 hover:text-blue-800">Try again</button>
             </div>
           ) : (
             <>
               <div className="space-y-2 mb-4">
                 {tests.length === 0 ? (
                   <div className="text-gray-500 text-sm text-center py-4">No tests available</div>
                 ) : (
                   tests.map((test) => {
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
                         className={`p-3 rounded-lg cursor-pointer transition-colors ${
                           selectedTest?.id === test.id 
                             ? 'bg-blue-100 border-l-4 border-blue-500' 
                             : 'bg-gray-100 hover:bg-gray-200'
                         }`}
                       >
                         <div className="font-medium text-gray-900">{patient?.name || 'Unknown Patient'}</div>
                         <div className="text-sm text-gray-600">Test: {test.test_code}</div>
                         <div className="text-xs text-gray-500">Status: {test.status}</div>
                       </div>
                     )
                   })
                 )}
               </div>
               
               {/* New Test Button */}
               <div className="border-t border-gray-200 pt-4">
                 <button
                   onClick={handleNewPatient}
                   className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                 >
                   <Plus className="h-5 w-5" />
                   <span className="font-medium">Add New Test</span>
                 </button>
               </div>
             </>
           )}
         </div>

        {/* Main Content */}
        <div className="flex-1 p-6" key={selectedPatient?.id || 'no-patient'}>
          {!selectedPatient ? (
            <div className="text-center py-12 text-gray-600">Select a patient or use the calendar</div>
          ) : (
            <>
              {/* Back Button and Delete Button */}
              <div className="mb-4 flex items-center justify-end">
                {selectedTest && (
                  <button 
                    onClick={handleDeleteTest}
                    className="flex items-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    title="Delete Test"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
                             {/* Header info */}
               <div className="bg-white rounded-lg p-6 shadow-sm mb-6 relative">
                 <h1 className="text-2xl font-bold text-center text-gray-900 mb-6">Microscopic Urine Analysis Report - {selectedTest?.test_code || 'N/A'}</h1>
                                  <div className="grid grid-cols-3 gap-6 mb-6">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-700 font-medium">Name:</span>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editData.patientName}
                            onChange={(e) => setEditData(prev => ({ ...prev, patientName: e.target.value }))}
                            className="font-semibold text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <span className="font-semibold text-gray-900">{selectedPatient.name}</span>
                        )}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700 font-medium">Patient ID:</span>
                        <span className="font-semibold text-gray-900">{selectedPatient.patient_id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700 font-medium">Age:</span>
                        {isEditing ? (
                          <input
                            type="number"
                            value={editData.patientAge}
                            onChange={(e) => setEditData(prev => ({ ...prev, patientAge: e.target.value }))}
                            className="font-semibold text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 w-20"
                            min="0"
                            max="150"
                          />
                        ) : (
                          <span className="font-semibold text-gray-900">{selectedPatient.age} Years</span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-700 font-medium">Gender:</span>
                        {isEditing ? (
                          <select
                            value={editData.patientGender}
                            onChange={(e) => setEditData(prev => ({ ...prev, patientGender: e.target.value as 'male' | 'female' | 'other' }))}
                            className="font-semibold text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                        ) : (
                          <span className="font-semibold text-gray-900">{selectedPatient.gender}</span>
                        )}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700 font-medium">Sample ID:</span>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editData.sampleId}
                            onChange={(e) => setEditData(prev => ({ ...prev, sampleId: e.target.value }))}
                            className="font-semibold text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <span className="font-semibold text-gray-900">{selectedTest?.sample_id || 'N/A'}</span>
                        )}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700 font-medium">Collection Time:</span>
                        {isEditing ? (
                          <input
                            type="time"
                            value={editData.collectionTime}
                            onChange={(e) => setEditData(prev => ({ ...prev, collectionTime: e.target.value }))}
                            className="font-semibold text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <span className="font-semibold text-gray-900">{selectedTest?.collection_time || 'N/A'}</span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-700 font-medium">Analysis Date:</span>
                        <span className="font-semibold text-gray-900">{selectedTest?.analysis_date || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700 font-medium">Technician:</span>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editData.technician}
                            onChange={(e) => setEditData(prev => ({ ...prev, technician: e.target.value }))}
                            className="font-semibold text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <span className="font-semibold text-gray-900">{selectedTest?.technician || 'N/A'}</span>
                        )}
                      </div>
                      <div className="flex justify-between items-center mb-6">
                        <span className="text-gray-700 font-medium">Status:</span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
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
                  
                  {/* Edit Button in Lower Right */}
                  <div className="absolute bottom-4 right-4">
                    {selectedPatient && (
                      <div className="flex items-center space-x-5">
                        <button 
                          onClick={handleEditToggle}
                          className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                            isEditing 
                              ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' 
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          }`}
                        >
                          {isEditing ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                          <span>{isEditing ? 'Cancel' : 'Edit'}</span>
                        </button>
                        {isEditing && (
                          <button 
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center space-x-2 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                          >
                            <Save className="h-4 w-4" />
                            <span>{saving ? 'Saving...' : 'Save'}</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
               </div>

                                                                            {/* Microscopic Images */}
                 <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
                   <div className="flex items-center justify-between mb-4">
                     <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                       <Microscope className="h-5 w-5 mr-2 text-green-600" />
                       Microscopic Images
                       <span className="ml-2 text-sm text-gray-600 font-normal">- Sample Analysis</span>
                     </h3>
                   </div>
                   
                   {/* Hidden file inputs */}
                   <input
                     id="image-upload"
                     type="file"
                     accept="image/*"
                     multiple
                     className="hidden"
                     onChange={(e) => {
                       const files = e.target.files
                       if (files && files.length > 0) {
                         // Handle file upload logic here
                         console.log('Files selected:', files)
                         // You can implement the actual upload to Supabase storage here
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Dynamic Image 1 */}
                      {selectedTest.image_1_url && (
                        <div className="space-y-3">
                          <h4 className="font-medium text-gray-900">
                            {selectedTest.image_1_description?.split(' - ')[0] || 'Sample 1'}
                          </h4>
                          <div className="relative group cursor-pointer" onClick={() => setModalImage({
                            src: selectedTest.image_1_url!,
                            alt: selectedTest.image_1_description || 'Microscopic image 1',
                            title: selectedTest.image_1_description?.split(' - ')[0] || 'Sample 1'
                          })}>
                            {imageErrors['image1'] ? (
                              <div className="w-full h-64 bg-gray-100 rounded-lg border border-gray-200 shadow-sm flex items-center justify-center">
                                <div className="text-center text-gray-500">
                                  <Microscope className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                                  <p className="text-sm">Image not available</p>
                                </div>
                              </div>
                            ) : (
                              <Image 
                                src={selectedTest.image_1_url} 
                                alt={selectedTest.image_1_description || 'Microscopic image 1'} 
                                width={400}
                                height={256}
                                className="w-full h-64 object-contain rounded-lg border border-gray-200 shadow-sm bg-white"
                                onError={() => setImageErrors(prev => ({ ...prev, image1: true }))}
                              />
                            )}
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 rounded-lg flex items-center justify-center">
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white bg-opacity-90 px-3 py-1 rounded-full text-sm font-medium text-gray-800">
                                Click to enlarge
                              </div>
                            </div>
                          </div>
                          <div className="text-sm text-gray-600">
                            <p><strong>Analysis:</strong> {selectedTest.image_1_description?.split(' - ')[1] || 'Microscopic analysis'}</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Dynamic Image 2 */}
                      {selectedTest.image_2_url && (
                        <div className="space-y-3">
                          <h4 className="font-medium text-gray-900">
                            {selectedTest.image_2_description?.split(' - ')[0] || 'Sample 2'}
                          </h4>
                          <div className="relative group cursor-pointer" onClick={() => setModalImage({
                            src: selectedTest.image_2_url!,
                            alt: selectedTest.image_2_description || 'Microscopic image 2',
                            title: selectedTest.image_2_description?.split(' - ')[0] || 'Sample 2'
                          })}>
                            {imageErrors['image2'] ? (
                              <div className="w-full h-64 bg-gray-100 rounded-lg border border-gray-200 shadow-sm flex items-center justify-center">
                                <div className="text-center text-gray-500">
                                  <Microscope className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                                  <p className="text-sm">Image not available</p>
                                </div>
                              </div>
                            ) : (
                              <Image 
                                src={selectedTest.image_2_url} 
                                alt={selectedTest.image_2_description || 'Microscopic image 2'} 
                                width={400}
                                height={256}
                                className="w-full h-64 object-contain rounded-lg border border-gray-200 shadow-sm bg-white"
                                onError={() => setImageErrors(prev => ({ ...prev, image2: true }))}
                              />
                            )}
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 rounded-lg flex items-center justify-center">
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white bg-opacity-90 px-3 py-1 rounded-full text-sm font-medium text-gray-800">
                                Click to enlarge
                              </div>
                            </div>
                          </div>
                          <div className="text-sm text-gray-600">
                            <p><strong>Analysis:</strong> {selectedTest.image_2_description?.split(' - ')[1] || 'Microscopic analysis'}</p>
                          </div>
                        </div>
                      )}

                      {/* Dynamic Image 3 */}
                      {selectedTest.image_3_url && (
                        <div className="space-y-3">
                          <h4 className="font-medium text-gray-900">
                            {selectedTest.image_3_description?.split(' - ')[0] || 'Sample 3'}
                          </h4>
                          <div className="relative group cursor-pointer" onClick={() => setModalImage({
                            src: selectedTest.image_3_url!,
                            alt: selectedTest.image_3_description || 'Microscopic image 3',
                            title: selectedTest.image_3_description?.split(' - ')[0] || 'Sample 3'
                          })}>
                            {imageErrors['image3'] ? (
                              <div className="w-full h-64 bg-gray-100 rounded-lg border border-gray-200 shadow-sm flex items-center justify-center">
                                <div className="text-center text-gray-500">
                                  <Microscope className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                                  <p className="text-sm">Image not available</p>
                                </div>
                              </div>
                            ) : (
                              <Image 
                                src={selectedTest.image_3_url} 
                                alt={selectedTest.image_3_description || 'Microscopic image 3'} 
                                width={400}
                                height={256}
                                className="w-full h-64 object-contain rounded-lg border border-gray-200 shadow-sm bg-white"
                                onError={() => setImageErrors(prev => ({ ...prev, image3: true }))}
                              />
                            )}
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 rounded-lg flex items-center justify-center">
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white bg-opacity-90 px-3 py-1 rounded-full text-sm font-medium text-gray-800">
                                Click to enlarge
                              </div>
                            </div>
                          </div>
                          <div className="text-sm text-gray-600">
                            <p><strong>Analysis:</strong> {selectedTest.image_3_description?.split(' - ')[1] || 'Microscopic analysis'}</p>
                          </div>
                        </div>
                      )}

                      {/* Dynamic Image 4 */}
                      {selectedTest.image_4_url && (
                        <div className="space-y-3">
                          <h4 className="font-medium text-gray-900">
                            {selectedTest.image_4_description?.split(' - ')[0] || 'Sample 4'}
                          </h4>
                          <div className="relative group cursor-pointer" onClick={() => setModalImage({
                            src: selectedTest.image_4_url!,
                            alt: selectedTest.image_4_description || 'Microscopic image 4',
                            title: selectedTest.image_4_description?.split(' - ')[0] || 'Sample 4'
                          })}>
                            {imageErrors['image4'] ? (
                              <div className="w-full h-64 bg-gray-100 rounded-lg border border-gray-200 shadow-sm flex items-center justify-center">
                                <div className="text-center text-gray-500">
                                  <Microscope className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                                  <p className="text-sm">Image not available</p>
                                </div>
                              </div>
                            ) : (
                              <Image 
                                src={selectedTest.image_4_url} 
                                alt={selectedTest.image_4_description || 'Microscopic image 4'} 
                                width={400}
                                height={256}
                                className="w-full h-64 object-contain rounded-lg border border-gray-200 shadow-sm bg-white"
                                onError={() => setImageErrors(prev => ({ ...prev, image4: true }))}
                              />
                            )}
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 rounded-lg flex items-center justify-center">
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white bg-opacity-90 px-3 py-1 rounded-full text-sm font-medium text-gray-800">
                                Click to enlarge
                              </div>
                            </div>
                          </div>
                          <div className="text-sm text-gray-600">
                            <p><strong>Analysis:</strong> {selectedTest.image_4_description?.split(' - ')[1] || 'Microscopic analysis'}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                                     {(!selectedTest || (!selectedTest.image_1_url && !selectedTest.image_2_url && !selectedTest.image_3_url && !selectedTest.image_4_url)) && (
                     <div className="text-center py-8 text-gray-500">
                       <Microscope className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                       <p className="text-lg font-medium">No microscopic images available</p>
                       <p className="text-sm">Images will appear here when uploaded for this test</p>
                       
                       {/* Single Capture Image button */}
                       <div className="flex items-center justify-center mt-6">
                         <button
                           onClick={handleCameraCapture}
                           className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                         >
                           <Camera className="h-5 w-5" />
                           <span className="font-medium">Capture Image</span>
                         </button>
                       </div>
                     </div>
                   )}
                </div>

               {/* Findings table */}
               <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
                 <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center"><Microscope className="h-5 w-5 mr-2 text-green-600" />Microscopic Examination<span className="ml-2 text-sm text-gray-600 font-normal">- AI Generated Results</span></h3>
                 <div className="overflow-x-auto">
                   <table className="w-full text-sm">
                     <thead>
                       <tr className="border-b border-gray-200"><th className="text-left py-2 font-semibold text-gray-800">Element</th><th className="text-left py-2 font-semibold text-gray-800">Count</th><th className="text-left py-2 font-semibold text-gray-800">Morphology</th><th className="text-left py-2 font-semibold text-gray-800">Status</th><th className="text-left py-2 font-semibold text-gray-800">AI Accuracy</th><th className="text-left py-2 font-semibold text-gray-800">Notes</th><th className="text-left py-2 font-semibold text-gray-800">Actions</th></tr>
                     </thead>
                     <tbody>
                       {findings.map((item: MicroscopicFindings, index: number) => (
                         <tr key={index} className="border-b border-gray-100">
                           <td className="py-2 text-gray-900 font-semibold">{item.item}</td>
                           <td className="py-2 font-bold text-gray-900">{item.count} {item.unit}</td>
                           <td className="py-2 text-gray-800 font-medium">{item.morphology}</td>
                           <td className="py-2"><span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>{item.status}</span></td>
                           <td className="py-2"><span className={`px-2 py-1 rounded-full text-xs font-medium ${getAccuracyColor(item.accuracy)}`}>{item.accuracy}%</span></td>
                           <td className="py-2 text-gray-800 text-sm max-w-xs font-medium">{item.notes}</td>
                           <td className="py-2"><button onClick={() => toggleEdit()} className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Edit findings">{item.isEditing ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Edit className="h-4 w-4" />}</button></td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               </div>

              {/* History */}
              <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Patient Test History</h3>
                {!selectedPatient ? (
                  <div className="text-sm text-gray-600">Select a patient to view their test history</div>
                ) : (() => {
                  const patientTests = tests.filter(t => t.patient_id === selectedPatient.id)
                  if (patientTests.length === 0) {
                    return <div className="text-sm text-gray-600">No previous tests for this patient</div>
                  }
                  
                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 font-semibold text-gray-800">Test Code</th>
                            <th className="text-left py-2 font-semibold text-gray-800">Date</th>
                            <th className="text-left py-2 font-semibold text-gray-800">Status</th>
                            <th className="text-left py-2 font-semibold text-gray-800">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {patientTests.map((t: UrineTest) => (
                            <tr key={t.id} className="border-b border-gray-100">
                              <td className="py-2 text-gray-900 font-semibold">{t.test_code}</td>
                              <td className="py-2 text-gray-800 font-medium">{t.analysis_date}</td>
                              <td className="py-2 text-gray-800 font-medium">{t.status}</td>
                              <td className="py-2">
                                <button 
                                  onClick={() => setSelectedTest(t)} 
                                  className={`px-3 py-1 rounded text-sm ${selectedTest?.id === t.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                })()}
              </div>
            </>
          )}
        </div>
      </div>
       
               {/* Image Modal */}
        <ImageModal
          isOpen={!!modalImage}
          onClose={() => setModalImage(null)}
          imageSrc={modalImage?.src || ''}
          imageAlt={modalImage?.alt || ''}
          title={modalImage?.title || ''}
        />

        {/* New Patient Modal */}
        {showNewPatientModal && (
          <NewPatientModal
            isOpen={showNewPatientModal}
            onClose={() => setShowNewPatientModal(false)}
            onPatientCreated={handlePatientCreated}
            currentDate={dateParam || new Date().toISOString().split('T')[0]}
          />
        )}

        {/* Image Analysis Modal */}
        {showImageAnalysisModal && (
          <ImageAnalysisModal
            isOpen={showImageAnalysisModal}
            onClose={() => setShowImageAnalysisModal(false)}
            onAnalysisComplete={handleAnalysisComplete}
          />
        )}

        {/* Camera Capture Modal */}
        <CameraCaptureModal
          isOpen={showCamera}
          onClose={() => setShowCamera(false)}
          onCapture={handleImageCapture}
        />

        {/* Delete Confirmation Modal */}
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

        {/* Notification */}
        {showNotification && (
          <Notification
            message={notificationMessage}
            type={notificationType}
            onClose={() => setShowNotification(false)}
            duration={4000}
          />
        )}

      </div>
    )
  }


