import { supabase } from './supabase'
import { Patient, UrineTest } from '@/types/database'

// Patients
export const getPatients = async (): Promise<Patient[]> => {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export const getPatient = async (id: string): Promise<Patient | null> => {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export const createPatient = async (patient: Omit<Patient, 'id' | 'created_at' | 'updated_at'>): Promise<Patient> => {
  const { data, error } = await supabase
    .from('patients')
    .insert(patient)
    .select()
    .single()

  if (error) throw error
  return data
}

export const updatePatient = async (id: string, updates: Partial<Patient>): Promise<Patient> => {
  const { data, error } = await supabase
    .from('patients')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Urine Tests
export const getTestsByPatient = async (patientId: string): Promise<UrineTest[]> => {
  const { data, error } = await supabase
    .from('urine_tests')
    .select('*')
    .eq('patient_id', patientId)
    .order('analysis_date', { ascending: false })

  if (error) throw error
  return data || []
}

export const getTest = async (id: string): Promise<UrineTest | null> => {
  const { data, error } = await supabase
    .from('urine_tests')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export const createTest = async (test: Omit<UrineTest, 'id' | 'created_at' | 'updated_at'>): Promise<UrineTest> => {
  const { data, error } = await supabase
    .from('urine_tests')
    .insert(test)
    .select()
    .single()

  if (error) throw error
  return data
}

export const updateTest = async (id: string, updates: Partial<UrineTest>): Promise<UrineTest> => {
  const { data, error } = await supabase
    .from('urine_tests')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export const getTestsByDate = async (date: string): Promise<UrineTest[]> => {
  const { data, error } = await supabase
    .from('urine_tests')
    .select('*')
    .eq('analysis_date', date)
    .order('patient_id', { ascending: true })

  if (error) throw error
  return data || []
}

export const getTestsInRange = async (startDate: string, endDate: string): Promise<UrineTest[]> => {
  const { data, error } = await supabase
    .from('urine_tests')
    .select('*')
    .gte('analysis_date', startDate)
    .lte('analysis_date', endDate)

  if (error) throw error
  return data || []
}
