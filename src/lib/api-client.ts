/**
 * API Client - Secure client-side functions that call authenticated API routes
 * This replaces direct Supabase calls with secure API endpoints
 */

import { Patient, UrineTest } from '@/types/database'

// Helper function to handle API responses
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || `HTTP error! status: ${response.status}`)
  }
  return response.json()
}

// Patients API
export const getPatients = async (): Promise<Patient[]> => {
  const response = await fetch('/api/patients', {
    credentials: 'include'
  })
  const data = await handleResponse<{ patients: Patient[] }>(response)
  return data.patients
}

export const getPatient = async (id: string): Promise<Patient | null> => {
  const response = await fetch(`/api/patients/${id}`, {
    credentials: 'include'
  })
  if (response.status === 404) return null
  const data = await handleResponse<{ patient: Patient }>(response)
  return data.patient
}

export const createPatient = async (
  patient: Omit<Patient, 'id' | 'created_at' | 'updated_at' | 'med_tech_id'>
): Promise<Patient> => {
  const response = await fetch('/api/patients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patient),
    credentials: 'include'
  })
  const data = await handleResponse<{ patient: Patient }>(response)
  return data.patient
}

export const updatePatient = async (id: string, updates: Partial<Patient>): Promise<Patient> => {
  const response = await fetch(`/api/patients/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
    credentials: 'include'
  })
  const data = await handleResponse<{ patient: Patient }>(response)
  return data.patient
}

export const deletePatient = async (id: string): Promise<void> => {
  const response = await fetch(`/api/patients/${id}`, {
    method: 'DELETE',
    credentials: 'include'
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete patient' }))
    throw new Error(error.error || 'Failed to delete patient')
  }
}

export const checkPatientHasTests = async (patientId: string): Promise<boolean> => {
  try {
    const response = await fetch(`/api/tests?patientId=${patientId}`, {
      credentials: 'include'
    })
    const data = await handleResponse<{ tests: UrineTest[] }>(response)
    return data.tests.length > 0
  } catch {
    return false
  }
}

// Tests API
export const getTestsByPatient = async (patientId: string): Promise<UrineTest[]> => {
  const response = await fetch(`/api/tests?patientId=${patientId}`, {
    credentials: 'include'
  })
  const data = await handleResponse<{ tests: UrineTest[] }>(response)
  return data.tests
}

export const getTest = async (id: string): Promise<UrineTest | null> => {
  const response = await fetch(`/api/tests/${id}`, {
    credentials: 'include'
  })
  if (response.status === 404) return null
  const data = await handleResponse<{ test: UrineTest }>(response)
  return data.test
}

export const createTest = async (
  test: Omit<UrineTest, 'id' | 'created_at' | 'updated_at' | 'med_tech_id'>
): Promise<UrineTest> => {
  const response = await fetch('/api/tests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(test),
    credentials: 'include'
  })
  const data = await handleResponse<{ test: UrineTest }>(response)
  return data.test
}

export const updateTest = async (id: string, updates: Partial<UrineTest>): Promise<UrineTest> => {
  const response = await fetch(`/api/tests/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
    credentials: 'include'
  })
  const data = await handleResponse<{ test: UrineTest }>(response)
  return data.test
}

export const deleteTest = async (testId: string): Promise<void> => {
  const response = await fetch(`/api/tests/${testId}`, {
    method: 'DELETE',
    credentials: 'include'
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete test' }))
    throw new Error(error.error || 'Failed to delete test')
  }
}

export const getTestsByDate = async (date: string): Promise<UrineTest[]> => {
  const response = await fetch(`/api/tests?date=${date}`, {
    credentials: 'include'
  })
  const data = await handleResponse<{ tests: UrineTest[] }>(response)
  return data.tests
}

export const getTestsInRange = async (startDate: string, endDate: string): Promise<UrineTest[]> => {
  // Fetch tests for each date in the range
  // This is not ideal but works until we add a date range endpoint
  const allTests: UrineTest[] = []
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]
    try {
      const tests = await getTestsByDate(dateStr)
      allTests.push(...tests)
    } catch (error) {
      console.warn(`Failed to fetch tests for ${dateStr}:`, error)
    }
  }
  
  return allTests
}

// Re-export other functions that don't need changes (image operations, etc.)
// These will still use Supabase directly but are less critical for security
export {
  uploadImageToStorage,
  uploadBase64Image,
  addImageToTest,
  deleteImageFromTest,
  deleteImageFromStorage,
  getSedimentAnalysis,
  getSedimentAnalysisByField,
  createSedimentAnalysis,
  updateSedimentAnalysis,
  deleteSedimentAnalysis,
  deleteSedimentAnalysisByTest,
  getImageAnalysis,
  getImageAnalysisByIndex,
  createImageAnalysis,
  updateImageAnalysis,
  upsertImageAnalysis,
  deleteImageAnalysis,
  deleteImageAnalysisByTest,
  deleteImageAnalysisByImage,
  updateAICounts,
} from './api'

