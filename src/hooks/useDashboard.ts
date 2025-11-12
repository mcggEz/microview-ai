import { useState, useEffect, useCallback } from 'react'
import { getPatients, updatePatient, getTestsByPatient, getTestsByDate, createPatient, createTest } from '@/lib/api'
import { Patient, UrineTest, ReportStatus } from '@/types/database'
import type { Gender } from '@/types/database'

export type AddPatientWithTestInput = {
  name: string
  age: string
  gender: Gender
  patient_id: string
}

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

  const preloadByDate = useCallback(async (date: string) => {
    try {
      setLoading(true)
      setError(null)
      
      // Validate date parameter
      if (!date || date.trim() === '') {
        throw new Error('Date parameter is required')
      }
      
      console.log('Preloading data for date:', date)
      
      // Clear all state first to prevent data bleeding
      setSelectedPatient(null)
      setSelectedTest(null)
      setTests([])
      setPatients([])
      
      // Load tests for the specific date ONLY
      const testsForDate = await getTestsByDate(date)
      console.log(`Tests found for date ${date}:`, testsForDate.length)
      
      if (testsForDate.length === 0) {
        console.log('No tests found for this date, state cleared')
        return
      }
      
      // Get unique patient IDs from tests for this date ONLY
      const patientIds = [...new Set(testsForDate.map(test => test.patient_id))]
      console.log('Patient IDs with tests on this date:', patientIds)
      
      // Load only the patients who have tests on this specific date
      const allPatients = await getPatients()
      const patientsForDate = allPatients.filter(patient => 
        patientIds.includes(patient.id)
      )
      console.log('Patients with tests on this date:', patientsForDate.length)
      
      // Update state with ONLY the data for this date
      setPatients(patientsForDate)
      setTests(testsForDate)
      
      // Set the first patient and their test for this date
      if (patientsForDate.length > 0) {
        const firstPatient = patientsForDate[0]
        console.log('Setting first patient:', firstPatient.name, 'for date:', date)
        setSelectedPatient(firstPatient)
        
        // Get tests for this specific patient on this specific date
        const patientTests = testsForDate.filter(test => test.patient_id === firstPatient.id)
        setSelectedTest(patientTests[0] || null)
        console.log('Patient tests set:', patientTests.length, 'for patient:', firstPatient.name)
      }
      
    } catch (err) {
      console.error('Error in preloadByDate:', err)
      console.error('Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
        date: date
      })
      setError(`Failed to load data for selected date: ${err instanceof Error ? err.message : 'Unknown error'}`)
      // Clear state on error to prevent showing wrong data
      setSelectedPatient(null)
      setSelectedTest(null)
      setTests([])
      setPatients([])
    } finally {
      setLoading(false)
    }
  }, [])

  const addPatientWithTest = async (patientData: AddPatientWithTestInput, date: string) => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('Starting test creation process for date:', date)
      
      // First, check if patient already exists (by patient_id)
      let existingPatient = null
      try {
        const allPatients = await getPatients()
        existingPatient = allPatients.find(p => p.patient_id === patientData.patient_id)
        if (existingPatient) {
          console.log('Patient already exists:', existingPatient.name)
        }
      } catch {
        console.log('No existing patient found, will create new one')
      }
      
      // Create patient if doesn't exist, otherwise use existing
      let patientToUse = existingPatient
      if (!existingPatient) {
        console.log('Creating new patient with data:', patientData)
        patientToUse = await createPatient({
          name: patientData.name,
          age: Number(patientData.age) || 0,
          gender: patientData.gender,
          patient_id: patientData.patient_id,
        })
        console.log('New patient created:', patientToUse)
      }
      
      // Ensure we have a valid patient object before proceeding
      if (!patientToUse) {
        throw new Error('Failed to resolve patient record')
      }

      // Now create the test for this patient on the specific date
      console.log('Creating test for patient:', patientToUse.name, 'on date:', date)
      
      // Get current time for both test code generation and collection time
      const now = new Date()
      
      // Generate test code in format: YYYYMMDD-XX-XX-N (using time + day-based tally)
      // Examples: 20241201-14-30-1 (Dec 1, 2024, 2:30 PM, 1st test of day), 20241201-09-15-2 (Dec 1, 2024, 9:15 AM, 2nd test of day)
      const generateTestCode = async (date: string, patientName: string, currentTime: Date) => {
        const dateStr = date.replace(/-/g, '') // Convert YYYY-MM-DD to YYYYMMDD
        
        // Get hour and minute (24-hour format)
        const hour = currentTime.getHours().toString().padStart(2, '0')
        const minute = currentTime.getMinutes().toString().padStart(2, '0')
        
        // Get count of existing tests for this date (day-based counting for last digit)
        const existingTests = await getTestsByDate(date)
        const testsForDate = existingTests.filter(test => test.test_code.startsWith(dateStr))
        
        // Extract the last digit from existing test codes and find the highest number
        let maxTally = 0
        testsForDate.forEach(test => {
          const parts = test.test_code.split('-')
          if (parts.length >= 4) {
            const lastDigit = parseInt(parts[3])
            if (!isNaN(lastDigit) && lastDigit > maxTally) {
              maxTally = lastDigit
            }
          }
        })
        
        const dayTally = maxTally + 1
        
        const testCode = `${dateStr}-${hour}-${minute}-${dayTally}`
        console.log('Generated test code:', testCode, 'for patient:', patientName, 'at time:', `${hour}:${minute}`, 'day tally:', dayTally)
        
        return testCode
      }
      
      const testData = {
        patient_id: patientToUse.id,
        test_code: await generateTestCode(date, patientToUse.name, now),
        analysis_date: date,
        status: 'pending' as ReportStatus,
        // Add minimal required fields
        collection_time: now.toTimeString().slice(0, 8), // Use actual current time
        technician: 'Lab Tech'
        // Note: AI counts are no longer stored in urine_tests table
        // All AI analysis results are stored in image_analysis table
      }
      
      console.log('Creating test with data:', testData)
      const newTest = await createTest(testData)
      console.log('Test created successfully:', newTest)
      
      // Refresh the data for the current date to show the new test
      await preloadByDate(date)
      
      return { patient: patientToUse, test: newTest }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(`Failed to create test: ${errorMessage}`)
      console.error('Error creating test:', err)
      throw err
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
    setSelectedPatient,
    updateSelectedPatient,
    clearError,
    loadPatients,
    loadTestsForPatient,
    preloadByDate,
    addPatientWithTest
  }
}
