'use client'

import { useState, useEffect } from 'react'
import { getTestsByPatient } from '@/lib/api'
import { Patient, UrineTest } from '@/types/database'
import { Clock, FileText } from 'lucide-react'

interface PatientTestHistoryProps {
  selectedPatient: Patient | null
  selectedTest: UrineTest | null
  onTestSelect: (test: UrineTest) => void
}

export default function PatientTestHistory({ 
  selectedPatient, 
  selectedTest, 
  onTestSelect 
}: PatientTestHistoryProps) {
  const [patientTests, setPatientTests] = useState<UrineTest[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (selectedPatient) {
      loadPatientTests(selectedPatient.id)
    } else {
      setPatientTests([])
    }
  }, [selectedPatient])

  const loadPatientTests = async (patientId: string) => {
    try {
      setLoading(true)
      setError(null)
      const tests = await getTestsByPatient(patientId)
      setPatientTests(tests)
    } catch (err) {
      console.error('Error loading patient tests:', err)
      setError('Failed to load patient test history')
      setPatientTests([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100'
      case 'in_progress':
        return 'text-blue-600 bg-blue-100'
      case 'reviewed':
        return 'text-purple-600 bg-purple-100'
      case 'pending':
      default:
        return 'text-orange-600 bg-orange-100'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (!selectedPatient) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FileText className="h-5 w-5 mr-2 text-blue-600" />
          Patient Test History
        </h3>
        <div className="text-sm text-gray-600">Select a patient to view their test history</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <FileText className="h-5 w-5 mr-2 text-blue-600" />
          Patient Test History
          <span className="ml-2 text-sm text-gray-600 font-normal">
            - {selectedPatient.name} ({selectedPatient.patient_id})
          </span>
        </h3>
        {patientTests.length > 0 && (
          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {patientTests.length} test{patientTests.length !== 1 ? 's' : ''} total
          </span>
        )}
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-gray-600 mt-2">Loading test history...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8 text-red-600">
          <p className="text-sm">{error}</p>
          <button 
            onClick={() => selectedPatient && loadPatientTests(selectedPatient.id)}
            className="mt-2 text-blue-600 hover:text-blue-800 text-sm underline"
          >
            Try again
          </button>
        </div>
      ) : patientTests.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium text-gray-600 mb-2">No test history found</p>
          <p className="text-sm text-gray-500">This patient has no previous tests in the system</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 font-semibold text-gray-800">Test Code</th>
                <th className="text-left py-3 font-semibold text-gray-800">Date</th>
                <th className="text-left py-3 font-semibold text-gray-800">Status</th>
                <th className="text-left py-3 font-semibold text-gray-800">Sample ID</th>
                <th className="text-left py-3 font-semibold text-gray-800">Action</th>
              </tr>
            </thead>
            <tbody>
                             {patientTests.map((test: UrineTest) => (
                 <tr key={test.id} className={`border-b border-gray-100 transition-colors ${
                   selectedTest?.id === test.id 
                     ? 'bg-blue-50 border-l-4 border-l-blue-500' 
                     : 'hover:bg-gray-50'
                 }`}>
                  <td className="py-3 text-gray-900 font-semibold">
                    {test.test_code}
                  </td>
                  <td className="py-3 text-gray-800 font-medium">
                    {formatDate(test.analysis_date)}
                  </td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(test.status)}`}>
                      {test.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 text-gray-700">
                    {test.sample_id || 'N/A'}
                  </td>
                  <td className="py-3">
                                         <button 
                       onClick={() => {
                         onTestSelect(test)
                         // Add a small delay to show the button was clicked
                         const button = event?.target as HTMLButtonElement
                         if (button) {
                           button.style.transform = 'scale(0.95)'
                           setTimeout(() => {
                             button.style.transform = 'scale(1)'
                           }, 150)
                         }
                       }} 
                       className={`px-3 py-1 rounded text-sm font-medium transition-all duration-150 ${
                         selectedTest?.id === test.id 
                           ? 'bg-blue-600 text-white shadow-sm' 
                           : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900 hover:shadow-sm'
                       }`}
                     >
                       {selectedTest?.id === test.id ? 'Current' : 'View'}
                     </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
