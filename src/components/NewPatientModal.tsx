'use client'

import { useState, useEffect } from 'react'
import { X, User, Calendar, Hash, Users, ChevronDown, Trash2 } from 'lucide-react'
import { getPatients, deletePatient, checkPatientHasTests } from '@/lib/api'
import type { Patient } from '@/types/database'

interface NewPatientModalProps {
  isOpen: boolean
  onClose: () => void
  onPatientCreated: (patient: { name: string; age: string; gender: string; patient_id: string }) => void
  currentDate?: string
}

export default function NewPatientModal({ isOpen, onClose, onPatientCreated, currentDate }: NewPatientModalProps) {
  const [formData, setFormData] = useState({
    patient_id: '',
    name: '',
    age: '',
    gender: 'male' as 'male' | 'female' | 'other'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previousPatients, setPreviousPatients] = useState<Patient[]>([])
  const [showPreviousPatients, setShowPreviousPatients] = useState(false)
  const [loadingPatients, setLoadingPatients] = useState(false)
  const [deletingPatient, setDeletingPatient] = useState<string | null>(null)
  const [patientTestCounts, setPatientTestCounts] = useState<Record<string, number>>({})

  // Load previous patients when modal opens
  useEffect(() => {
    if (isOpen) {
      loadPreviousPatients()
    }
  }, [isOpen])

  const loadPreviousPatients = async () => {
    setLoadingPatients(true)
    try {
      const patients = await getPatients()
      setPreviousPatients(patients)
      
      // Check test counts for each patient
      const testCounts: Record<string, number> = {}
      for (const patient of patients) {
        const hasTests = await checkPatientHasTests(patient.id)
        testCounts[patient.id] = hasTests ? 1 : 0 // We only need to know if they have tests or not
      }
      setPatientTestCounts(testCounts)
    } catch (error) {
      console.error('Failed to load previous patients:', error)
    } finally {
      setLoadingPatients(false)
    }
  }

  const selectPreviousPatient = (patient: Patient) => {
    setFormData({
      patient_id: patient.patient_id,
      name: patient.name,
      age: patient.age.toString(),
      gender: patient.gender
    })
    setShowPreviousPatients(false)
  }

  const handleDeletePatient = async (patientId: string, patientName: string) => {
    const hasTests = patientTestCounts[patientId] > 0
    
    const message = hasTests 
      ? `Cannot delete patient "${patientName}" because they have existing tests.`
      : `Delete patient "${patientName}"? This action cannot be undone.`
    
    if (hasTests) {
      alert(message)
      return
    }
    
    if (!confirm(message)) return
    
    setDeletingPatient(patientId)
    try {
      await deletePatient(patientId)
      // Remove from local state
      setPreviousPatients(prev => prev.filter(p => p.id !== patientId))
      setPatientTestCounts(prev => {
        const newCounts = { ...prev }
        delete newCounts[patientId]
        return newCounts
      })
    } catch (error) {
      console.error('Failed to delete patient:', error)
      alert('Failed to delete patient. Please try again.')
    } finally {
      setDeletingPatient(null)
    }
  }

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validate form data
      if (!formData.patient_id.trim() || !formData.name.trim() || !formData.age.trim()) {
        throw new Error('Please fill in all required fields')
      }

      const age = parseInt(formData.age)
      if (isNaN(age) || age < 0 || age > 150) {
        throw new Error('Please enter a valid age (0-150)')
      }

      const patientData = {
        patient_id: formData.patient_id.trim(),
        name: formData.name.trim(),
        age: age.toString(),
        gender: formData.gender
      }

      onPatientCreated(patientData)
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create patient')
    } finally {
      setLoading(false)
    }
  }

  const generatePatientId = () => {
    const today = new Date()
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '') // YYYYMMDD format
    const randomLetters = Math.random().toString(36).substring(2, 6).toUpperCase() // 4 random letters
    const generatedId = `${dateStr}-${randomLetters}`
    setFormData(prev => ({ ...prev, patient_id: generatedId }))
  }

  const handleClose = () => {
    setFormData({ patient_id: '', name: '', age: '', gender: 'male' })
    setError(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4" onClick={handleClose}>
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <User className="h-5 w-5 mr-2 text-blue-600" />
              New Test
            </h2>
            {currentDate && (
              <div className="text-sm text-gray-800 mt-1 space-y-1">
                <p className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  Test will be created for: {currentDate}
                </p>
                <p className="text-xs text-gray-600 flex items-center">
                  <Hash className="h-3 w-3 mr-1" />
                  Test code format: YYYYMMDD-FL-XX (Date-Initials-Hour)
                </p>
              </div>
            )}
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Previous Patients Section */}
          <div className="border-b border-gray-200 pb-4">
            <button
              type="button"
              onClick={() => setShowPreviousPatients(!showPreviousPatients)}
              className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-2 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Previous Patients</span>
                {loadingPatients && <span className="ml-2 text-xs text-gray-500">Loading...</span>}
              </div>
              <ChevronDown className={`h-4 w-4 text-gray-600 transition-transform ${showPreviousPatients ? 'rotate-180' : ''}`} />
            </button>
            
            {showPreviousPatients && (
              <div className="mt-3 max-h-32 overflow-y-auto">
                {previousPatients.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-2">No previous patients found</p>
                ) : (
                  <div className="space-y-1">
                    {previousPatients.map((patient) => (
                      <div
                        key={patient.id}
                        className="flex items-center justify-between p-2 hover:bg-blue-50 rounded text-sm text-gray-700 hover:text-blue-700 transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => selectPreviousPatient(patient)}
                          className="flex-1 text-left"
                        >
                          <div className="font-medium">{patient.name}</div>
                          <div className="text-xs text-gray-500">ID: {patient.patient_id} • Age: {patient.age} • {patient.gender}</div>
                        </button>
                        
                        {/* Delete button - only show if patient has no tests */}
                        {patientTestCounts[patient.id] === 0 && (
                          <button
                            type="button"
                            onClick={() => handleDeletePatient(patient.id, patient.name)}
                            disabled={deletingPatient === patient.id}
                            className="ml-2 p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                            title="Delete patient"
                          >
                            {deletingPatient === patient.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2 flex items-center">
              <User className="h-4 w-4 mr-1" />
              Full Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-800 text-gray-900"
              placeholder="Enter full name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2 flex items-center">
              <Hash className="h-4 w-4 mr-1" />
              Patient ID *
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={formData.patient_id}
                onChange={(e) => setFormData(prev => ({ ...prev, patient_id: e.target.value }))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-800 text-gray-900"
                placeholder="Enter patient ID"
                required
              />
              <button
                type="button"
                onClick={generatePatientId}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Generate
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2 flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              Age *
            </label>
            <input
              type="number"
              value={formData.age}
              onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-800 text-gray-900"
              placeholder="Enter age"
              min="0"
              max="150"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gender *
            </label>
            <select
              value={formData.gender}
              onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value as 'male' | 'female' | 'other' }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              required
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Test'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
