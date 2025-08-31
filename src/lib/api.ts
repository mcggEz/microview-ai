import { supabase } from './supabase'
import { Patient, UrineTest } from '@/types/database'

// Patients
export const getPatients = async (): Promise<Patient[]> => {
  console.log('Fetching patients...')
  
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching patients:', error)
    throw error
  }
  
  console.log('Patients fetched successfully:', data?.length || 0, 'patients')
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
  console.log('Creating patient with data:', patient)
  
  const { data, error } = await supabase
    .from('patients')
    .insert(patient)
    .select()
    .single()

  if (error) {
    console.error('Supabase error creating patient:', error)
    throw error
  }
  
  console.log('Patient created successfully:', data)
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
  console.log('Creating test with data:', test)
  console.log('Test data type:', typeof test)
  console.log('Test data keys:', Object.keys(test))
  console.log('Test data values:', Object.values(test))
  
  const { data, error } = await supabase
    .from('urine_tests')
    .insert(test)
    .select()
    .single()

  if (error) {
    console.error('Supabase error creating test:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    throw error
  }
  
  console.log('Test created successfully:', data)
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

// Test database connection
export const testDatabaseConnection = async (): Promise<boolean> => {
  try {
    console.log('Testing database connection...')
    
    // Test patients table
    const { error: patientsError } = await supabase
      .from('patients')
      .select('count')
      .limit(1)
    
    if (patientsError) {
      console.error('Patients table test failed:', patientsError)
      return false
    }
    
    // Test urine_tests table
    const { error: testsError } = await supabase
      .from('urine_tests')
      .select('count')
      .limit(1)
    
    if (testsError) {
      console.error('Urine tests table test failed:', testsError)
      return false
    }
    
    console.log('Database connection test successful - both tables accessible')
    return true
  } catch (err) {
    console.error('Database connection test error:', err)
    return false
  }
}

// Check table structure
export const checkTableStructure = async (tableName: string) => {
  try {
    console.log(`Checking structure of ${tableName} table...`)
    
    // Try to get one row to see the structure
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1)
    
    if (error) {
      console.error(`Error checking ${tableName} structure:`, error)
      return null
    }
    
    if (data && data.length > 0) {
      console.log(`${tableName} table structure:`, Object.keys(data[0]))
      return Object.keys(data[0])
    } else {
      console.log(`${tableName} table is empty, checking schema...`)
      // Try to insert a dummy row to see what fields are required
      const dummyData = tableName === 'urine_tests' ? { test_code: 'DUMMY', patient_id: '00000000-0000-0000-0000-000000000000' } : { name: 'DUMMY' }
      
      const { error: insertError } = await supabase
        .from(tableName)
        .insert(dummyData)
      
      if (insertError) {
        console.log(`${tableName} table schema error:`, insertError)
        return null
      }
    }
    
    return null
  } catch (err) {
    console.error(`Error checking ${tableName} structure:`, err)
    return null
  }
}

// Delete test
export const deleteTest = async (testId: string): Promise<void> => {
  console.log('Deleting test:', testId)
  
  const { error } = await supabase
    .from('urine_tests')
    .delete()
    .eq('id', testId)

  if (error) {
    console.error('Supabase error deleting test:', error)
    throw error
  }
  
  console.log('Test deleted successfully')
}

export const updateTestWithAnalysis = async (testId: string, analysis: { 
  rbc: { count: string; unit: string; morphology: string; notes: string; status: string }; 
  wbc: { count: string; unit: string; morphology: string; notes: string; status: string }; 
  epithelial_cells: { count: string; unit: string; morphology: string; notes: string; status: string }; 
  crystals: { count: string; unit: string; morphology: string; notes: string; status: string }; 
  casts: { count: string; unit: string; morphology: string; notes: string; status: string }; 
  bacteria: { count: string; unit: string; morphology: string; notes: string; status: string }; 
  yeast: { count: string; unit: string; morphology: string; notes: string; status: string }; 
  mucus: { count: string; unit: string; morphology: string; notes: string; status: string }; 
  sperm: { count: string; unit: string; morphology: string; notes: string; status: string }; 
  parasites: { count: string; unit: string; morphology: string; notes: string; status: string }; 
  overall_accuracy: number 
}): Promise<UrineTest> => {
  const updates = {
    rbc_count: analysis.rbc.count,
    rbc_unit: analysis.rbc.unit,
    rbc_morphology: analysis.rbc.morphology,
    rbc_notes: analysis.rbc.notes,
    rbc_status: analysis.rbc.status,
    rbc_accuracy: analysis.overall_accuracy,
    
    wbc_count: analysis.wbc.count,
    wbc_unit: analysis.wbc.unit,
    wbc_morphology: analysis.wbc.morphology,
    wbc_notes: analysis.wbc.notes,
    wbc_status: analysis.wbc.status,
    wbc_accuracy: analysis.overall_accuracy,
    
    epithelial_cells_count: analysis.epithelial_cells.count,
    epithelial_cells_unit: analysis.epithelial_cells.unit,
    epithelial_cells_morphology: analysis.epithelial_cells.morphology,
    epithelial_cells_notes: analysis.epithelial_cells.notes,
    epithelial_cells_status: analysis.epithelial_cells.status,
    epithelial_cells_accuracy: analysis.overall_accuracy,
    
    crystals_count: analysis.crystals.count,
    crystals_unit: analysis.crystals.unit,
    crystals_morphology: analysis.crystals.morphology,
    crystals_notes: analysis.crystals.notes,
    crystals_status: analysis.crystals.status,
    crystals_accuracy: analysis.overall_accuracy,
    
    casts_count: analysis.casts.count,
    casts_unit: analysis.casts.unit,
    casts_morphology: analysis.casts.morphology,
    casts_notes: analysis.casts.notes,
    casts_status: analysis.casts.status,
    casts_accuracy: analysis.overall_accuracy,
    
    bacteria_count: analysis.bacteria.count,
    bacteria_unit: analysis.bacteria.unit,
    bacteria_morphology: analysis.bacteria.morphology,
    bacteria_notes: analysis.bacteria.notes,
    bacteria_status: analysis.bacteria.status,
    bacteria_accuracy: analysis.overall_accuracy,
    
    yeast_count: analysis.yeast.count,
    yeast_unit: analysis.yeast.unit,
    yeast_morphology: analysis.yeast.morphology,
    yeast_notes: analysis.yeast.notes,
    yeast_status: analysis.yeast.status,
    yeast_accuracy: analysis.overall_accuracy,
    
    mucus_count: analysis.mucus.count,
    mucus_unit: analysis.mucus.unit,
    mucus_morphology: analysis.mucus.morphology,
    mucus_notes: analysis.mucus.notes,
    mucus_status: analysis.mucus.status,
    mucus_accuracy: analysis.overall_accuracy,
    
    sperm_count: analysis.sperm.count,
    sperm_unit: analysis.sperm.unit,
    sperm_morphology: analysis.sperm.morphology,
    sperm_notes: analysis.sperm.notes,
    sperm_status: analysis.sperm.status,
    sperm_accuracy: analysis.overall_accuracy,
    
    parasites_count: analysis.parasites.count,
    parasites_unit: analysis.parasites.unit,
    parasites_morphology: analysis.parasites.morphology,
    parasites_notes: analysis.parasites.notes,
    parasites_status: analysis.parasites.status,
    parasites_accuracy: analysis.overall_accuracy,
  }
  
  return await updateTest(testId, updates)
}

// Image Upload Functions
export const uploadImageToStorage = async (file: File, testId: string, imageType: 'microscopic' | 'gross' = 'microscopic'): Promise<string> => {
  try {
    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const fileExtension = file.name.split('.').pop() || 'jpg'
    const fileName = `${testId}/${imageType}_${timestamp}.${fileExtension}`
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('urine-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Error uploading image:', error)
      throw error
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('urine-images')
      .getPublicUrl(fileName)

    return urlData.publicUrl
  } catch (error) {
    console.error('Failed to upload image:', error)
    throw error
  }
}

export const uploadBase64Image = async (base64Data: string, testId: string, imageType: 'microscopic' | 'gross' = 'microscopic'): Promise<string> => {
  try {
    // Convert base64 to blob
    const base64Response = await fetch(base64Data)
    const blob = await base64Response.blob()
    
    // Create file from blob
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const fileName = `captured_${imageType}_${timestamp}.jpg`
    const file = new File([blob], fileName, { type: 'image/jpeg' })
    
    // Upload using the file upload function
    return await uploadImageToStorage(file, testId, imageType)
  } catch (error) {
    console.error('Failed to upload base64 image:', error)
    throw error
  }
}

export const addImageToTest = async (testId: string, imageUrl: string, imageType: 'microscopic' | 'gross' = 'microscopic'): Promise<UrineTest> => {
  try {
    // Get current test to see existing images
    const currentTest = await getTest(testId)
    if (!currentTest) {
      throw new Error('Test not found')
    }

    // Update the appropriate image field based on type
    const updates: Partial<UrineTest> = {}
    
    if (imageType === 'microscopic') {
      // Add to microscopic images array or create new array
      const currentImages = currentTest.microscopic_images || []
      updates.microscopic_images = [...currentImages, imageUrl]
    } else {
      // Add to gross images array or create new array
      const currentImages = currentTest.gross_images || []
      updates.gross_images = [...currentImages, imageUrl]
    }

    return await updateTest(testId, updates)
  } catch (error) {
    console.error('Failed to add image to test:', error)
    throw error
  }
}

export const deleteImageFromTest = async (testId: string, imageUrl: string, imageType: 'microscopic' | 'gross' = 'microscopic'): Promise<UrineTest> => {
  try {
    // Get current test
    const currentTest = await getTest(testId)
    if (!currentTest) {
      throw new Error('Test not found')
    }

    // Remove image from array
    const updates: Partial<UrineTest> = {}
    
    if (imageType === 'microscopic') {
      const currentImages = currentTest.microscopic_images || []
      updates.microscopic_images = currentImages.filter(img => img !== imageUrl)
    } else {
      const currentImages = currentTest.gross_images || []
      updates.gross_images = currentImages.filter(img => img !== imageUrl)
    }

    return await updateTest(testId, updates)
  } catch (error) {
    console.error('Failed to delete image from test:', error)
    throw error
  }
}

export const deleteImageFromStorage = async (imageUrl: string): Promise<void> => {
  try {
    // Extract file path from URL
    const url = new URL(imageUrl)
    const pathParts = url.pathname.split('/')
    const fileName = pathParts[pathParts.length - 1]
    const folderPath = pathParts.slice(-2).join('/') // Get folder/filename
    
    // Delete from Supabase Storage
    const { error } = await supabase.storage
      .from('urine-images')
      .remove([folderPath])

    if (error) {
      console.error('Error deleting image from storage:', error)
      throw error
    }
  } catch (error) {
    console.error('Failed to delete image from storage:', error)
    throw error
  }
}
