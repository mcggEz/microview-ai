import { useState, useEffect } from 'react'
import { getPatients, updatePatient, getTestsByPatient, getTestsByDate } from '@/lib/api'
import { Patient, UrineTest } from '@/types/database'

export const useDashboard = () => {
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [tests, setTests] = useState<UrineTest[]>([])
  const [selectedTest, setSelectedTest] = useState<UrineTest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadPatients()
  }, [])

  const loadPatients = async () => {
    try {
      setLoading(true)
      const data = await getPatients()
      setPatients(data)
    } catch (err) {
      setError('Failed to load patients')
      console.error('Error loading patients:', err)
    } finally {
      setLoading(false)
    }
  }

  const selectPatient = async (patient: Patient) => {
    // Only update if it's a different patient
    if (selectedPatient?.id !== patient.id) {
      setSelectedPatient(patient)
      setSelectedTest(null)
      setTests([]) // Clear tests while loading
      await loadTestsForPatient(patient.id)
    }
  }

  const updateSelectedPatient = async (updates: Partial<Patient>) => {
    if (!selectedPatient) return null
    try {
      const updated = await updatePatient(selectedPatient.id, updates)
      setSelectedPatient(updated)
      setPatients(prev => prev.map(p => (p.id === updated.id ? updated : p)))
      return updated
    } catch (err) {
      setError('Failed to update patient')
      console.error('Error updating patient:', err)
      throw err
    }
  }

  const clearError = () => setError(null)

  const loadTestsForPatient = async (patientId: string) => {
    try {
      setError(null)
      const data = await getTestsByPatient(patientId)
      setTests(data)
      return data
    } catch (err) {
      setError('Failed to load tests')
      console.error('Error loading tests:', err)
      setTests([])
    }
  }

  const preloadByDate = async (date: string) => {
    try {
      setLoading(true)
      setError(null)
      
      // Load tests for the specific date
      const testsForDate = await getTestsByDate(date)
      
      if (testsForDate.length === 0) {
        // No tests found for this date
        setSelectedPatient(null)
        setSelectedTest(null)
        setTests([])
        return
      }
      
      const firstTest = testsForDate[0]
      
      // Load patients if not already loaded
      let currentPatients = patients
      if (currentPatients.length === 0) {
        currentPatients = await getPatients()
        setPatients(currentPatients)
      }
      
      // Find the patient for this test
      const patient = currentPatients.find(p => p.id === firstTest.patient_id)
      if (!patient) {
        setError('Patient not found for this test')
        return
      }
      
      // Load all tests for this patient
      const allTests = await getTestsByPatient(patient.id)
      setTests(allTests)
      
      // Set the patient and the specific test for the date
      setSelectedPatient(patient)
      const matchingTest = allTests.find(t => t.analysis_date === date) || firstTest
      setSelectedTest(matchingTest)
      
    } catch (err) {
      setError('Failed to load data for selected date')
      console.error('Error preloading by date:', err)
    } finally {
      setLoading(false)
    }
  }

  return {
    patients,
    selectedPatient,
    tests,
    selectedTest,
    loading,
    error,
    selectPatient,
    setSelectedTest,
    updateSelectedPatient,
    clearError,
    loadPatients,
    loadTestsForPatient,
    preloadByDate
  }
}
