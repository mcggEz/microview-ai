'use client'

import { useState } from 'react'
import { X, User, Calendar, Hash } from 'lucide-react'
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
        age,
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
              New Patient
            </h2>
            {currentDate && (
              <p className="text-sm text-gray-800 mt-1 flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                Test will be created for: {currentDate}
              </p>
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
              {loading ? 'Creating...' : 'Create Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
