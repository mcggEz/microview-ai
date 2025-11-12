import { supabase } from './supabase'
import { Patient, UrineTest, SedimentAnalysis, PowerMode, ImageAnalysis } from '@/types/database'

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

export const deletePatient = async (id: string): Promise<void> => {
  try {
    // First check if patient has any tests
    const hasTests = await checkPatientHasTests(id)
    if (hasTests) {
      throw new Error('Cannot delete patient with existing tests. Please delete all tests first.')
    }

    // If no tests, safe to delete the patient
    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Supabase error deleting patient:', error)
      throw error
    }
    
    console.log('Patient deleted successfully')
  } catch (error) {
    console.error('Error deleting patient:', error)
    throw error
  }
}

export const checkPatientHasTests = async (patientId: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('urine_tests')
    .select('id')
    .eq('patient_id', patientId)
    .limit(1)

  if (error) throw error
  return (data && data.length > 0)
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

// DEPRECATED: AI counts are now stored in image_analysis table, not urine_tests
// This function is kept for backward compatibility but does nothing
export const updateAICounts = async (testId: string, aiCounts: {[key: string]: string}): Promise<UrineTest> => {
  console.warn('updateAICounts is deprecated - AI counts are now stored in image_analysis table')
  // Return the test without updating (AI counts are stored per-image in image_analysis)
  const test = await getTest(testId)
  if (!test) {
    throw new Error('Test not found')
  }
  return test
}

export const getTestsByDate = async (date: string): Promise<UrineTest[]> => {
  const { data, error } = await supabase
    .from('urine_tests')
    .select('*')
    .eq('analysis_date', date)
    .order('created_at', { ascending: false })

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
  
  try {
    // First, get the test to retrieve all image URLs and patient_id
    const test = await getTest(testId)
    if (!test) {
      throw new Error('Test not found')
    }

    const patientId = test.patient_id

    // Collect all image URLs from image arrays
    const allImageUrls: string[] = []
    
    // Add images from all image arrays
    if (test.microscopic_images) allImageUrls.push(...test.microscopic_images)
    if (test.hpf_images) allImageUrls.push(...test.hpf_images)
    if (test.lpf_images) allImageUrls.push(...test.lpf_images)

    console.log(`Found ${allImageUrls.length} images to delete for test ${testId}`)

    // Delete all images from storage
    for (const imageUrl of allImageUrls) {
      try {
        await deleteImageFromStorage(imageUrl)
        console.log(`Deleted image: ${imageUrl}`)
      } catch (error) {
        console.warn(`Failed to delete image ${imageUrl}:`, error)
        // Continue with other images even if one fails
      }
    }

    // Delete the test record
    const { error } = await supabase
      .from('urine_tests')
      .delete()
      .eq('id', testId)

    if (error) {
      console.error('Supabase error deleting test:', error)
      throw error
    }
    
    console.log('Test and all associated images deleted successfully')

    // Delete the patient (one-to-one relationship: one patient = one test)
    console.log(`Deleting patient ${patientId} (one-to-one relationship with test)...`)
    try {
      const { error: patientError } = await supabase
        .from('patients')
        .delete()
        .eq('id', patientId)

      if (patientError) {
        console.warn(`Failed to delete patient ${patientId}:`, patientError)
        // Don't throw error - test deletion was successful
      } else {
        console.log(`Patient ${patientId} deleted successfully`)
      }
    } catch (patientError) {
      console.warn(`Error deleting patient ${patientId}:`, patientError)
      // Don't throw error - test deletion was successful
    }
  } catch (error) {
    console.error('Error deleting test:', error)
    throw error
  }
}


// Image Upload Functions
export const uploadImageToStorage = async (file: File, testId: string, imageType: 'microscopic' | 'lpf' | 'hpf' = 'microscopic'): Promise<string> => {
  try {
    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const fileExtension = file.name.split('.').pop() || 'jpg'
    const fileName = `${testId}/${imageType}_${timestamp}.${fileExtension}`
    
    // Upload to Supabase Storage
    const { error } = await supabase.storage
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

export const uploadBase64Image = async (base64Data: string, testId: string, imageType: 'microscopic' | 'lpf' | 'hpf' = 'microscopic'): Promise<string> => {
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

export const addImageToTest = async (testId: string, imageUrl: string, imageType: 'microscopic' | 'hpf' | 'lpf' = 'microscopic'): Promise<UrineTest> => {
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
    } else if (imageType === 'hpf') {
      // Add to HPF images array or create new array
      const currentImages = currentTest.hpf_images || []
      updates.hpf_images = [...currentImages, imageUrl]
    } else if (imageType === 'lpf') {
      // Add to LPF images array or create new array
      const currentImages = currentTest.lpf_images || []
      updates.lpf_images = [...currentImages, imageUrl]
    }

    return await updateTest(testId, updates)
  } catch (error) {
    console.error('Failed to add image to test:', error)
    throw error
  }
}

export const deleteImageFromTest = async (testId: string, imageUrl: string, imageType: 'microscopic' | 'hpf' | 'lpf' = 'microscopic'): Promise<UrineTest> => {
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
    } else if (imageType === 'hpf') {
      const currentImages = currentTest.hpf_images || []
      updates.hpf_images = currentImages.filter(img => img !== imageUrl)
    } else if (imageType === 'lpf') {
      const currentImages = currentTest.lpf_images || []
      updates.lpf_images = currentImages.filter(img => img !== imageUrl)
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

// Sediment Analysis
export const getSedimentAnalysis = async (testId: string, powerMode: PowerMode): Promise<SedimentAnalysis[]> => {
  console.log(`Fetching sediment analysis for test ${testId}, power mode ${powerMode}`)
  
  const { data, error } = await supabase
    .from('sediment_analysis')
    .select('*')
    .eq('test_id', testId)
    .eq('power_mode', powerMode)
    .order('field_index', { ascending: true })
    .order('region_index', { ascending: true })

  if (error) {
    console.error('Error fetching sediment analysis:', error)
    throw error
  }
  
  console.log('Sediment analysis fetched successfully:', data?.length || 0, 'records')
  return data || []
}

export const getSedimentAnalysisByField = async (
  testId: string, 
  powerMode: PowerMode, 
  fieldIndex: number
): Promise<SedimentAnalysis[]> => {
  console.log(`Fetching sediment analysis for test ${testId}, ${powerMode} field ${fieldIndex}`)
  
  const { data, error } = await supabase
    .from('sediment_analysis')
    .select('*')
    .eq('test_id', testId)
    .eq('power_mode', powerMode)
    .eq('field_index', fieldIndex)
    .order('region_index', { ascending: true })

  if (error) {
    console.error('Error fetching sediment analysis by field:', error)
    throw error
  }
  
  console.log('Sediment analysis by field fetched successfully:', data?.length || 0, 'records')
  return data || []
}

export const createSedimentAnalysis = async (
  sedimentData: Omit<SedimentAnalysis, 'id' | 'created_at' | 'updated_at'>
): Promise<SedimentAnalysis> => {
  console.log('Creating sediment analysis with data:', sedimentData)
  
  const { data, error } = await supabase
    .from('sediment_analysis')
    .insert(sedimentData)
    .select()
    .single()

  if (error) {
    console.error('Supabase error creating sediment analysis:', error)
    throw error
  }
  
  console.log('Sediment analysis created successfully:', data)
  return data
}

export const updateSedimentAnalysis = async (
  id: string, 
  updates: Partial<Omit<SedimentAnalysis, 'id' | 'test_id' | 'power_mode' | 'field_index' | 'region_index' | 'created_at' | 'updated_at'>>
): Promise<SedimentAnalysis> => {
  console.log(`Updating sediment analysis ${id} with data:`, updates)
  
  const { data, error } = await supabase
    .from('sediment_analysis')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Supabase error updating sediment analysis:', error)
    throw error
  }
  
  console.log('Sediment analysis updated successfully:', data)
  return data
}

export const deleteSedimentAnalysis = async (id: string): Promise<void> => {
  console.log(`Deleting sediment analysis ${id}`)
  
  const { error } = await supabase
    .from('sediment_analysis')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Supabase error deleting sediment analysis:', error)
    throw error
  }
  
  console.log('Sediment analysis deleted successfully')
}

export const deleteSedimentAnalysisByTest = async (testId: string): Promise<void> => {
  console.log(`Deleting all sediment analysis for test ${testId}`)
  
  const { error } = await supabase
    .from('sediment_analysis')
    .delete()
    .eq('test_id', testId)

  if (error) {
    console.error('Supabase error deleting sediment analysis by test:', error)
    throw error
  }
  
  console.log('All sediment analysis deleted successfully for test')
}

// Image Analysis Functions
export const getImageAnalysis = async (testId: string, powerMode: PowerMode): Promise<ImageAnalysis[]> => {
  console.log(`Fetching image analysis for test ${testId}, power mode ${powerMode}`)
  
  const { data, error } = await supabase
    .from('image_analysis')
    .select('*')
    .eq('test_id', testId)
    .eq('power_mode', powerMode)
    .order('image_index', { ascending: true })

  if (error) {
    console.error('Error fetching image analysis:', error)
    throw error
  }
  
  console.log('Image analysis fetched successfully:', data?.length || 0, 'records')
  return data || []
}

export const getImageAnalysisByIndex = async (
  testId: string, 
  powerMode: PowerMode, 
  imageIndex: number
): Promise<ImageAnalysis | null> => {
  console.log(`Fetching image analysis for test ${testId}, ${powerMode} image ${imageIndex}`)
  
  const { data, error } = await supabase
    .from('image_analysis')
    .select('*')
    .eq('test_id', testId)
    .eq('power_mode', powerMode)
    .eq('image_index', imageIndex)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows found
      return null
    }
    console.error('Error fetching image analysis by index:', error)
    throw error
  }
  
  console.log('Image analysis by index fetched successfully:', data)
  return data
}

export const createImageAnalysis = async (
  analysisData: Omit<ImageAnalysis, 'id' | 'created_at' | 'updated_at'>
): Promise<ImageAnalysis> => {
  console.log('Creating image analysis with data:', analysisData)
  
  const { data, error } = await supabase
    .from('image_analysis')
    .insert(analysisData)
    .select()
    .single()

  if (error) {
    console.error('Supabase error creating image analysis:', error)
    throw error
  }
  
  console.log('Image analysis created successfully:', data)
  return data
}

export const updateImageAnalysis = async (
  id: string, 
  updates: Partial<Omit<ImageAnalysis, 'id' | 'test_id' | 'power_mode' | 'image_index' | 'image_url' | 'created_at' | 'updated_at'>>
): Promise<ImageAnalysis> => {
  console.log(`Updating image analysis ${id} with data:`, updates)
  
  const { data, error } = await supabase
    .from('image_analysis')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Supabase error updating image analysis:', error)
    throw error
  }
  
  console.log('Image analysis updated successfully:', data)
  return data
}

export const upsertImageAnalysis = async (
  analysisData: Omit<ImageAnalysis, 'id' | 'created_at' | 'updated_at'>
): Promise<ImageAnalysis> => {
  console.log('Upserting image analysis with data:', JSON.stringify(analysisData, null, 2))
  
  // First, check if the image_analysis table exists
  const { error: tableError } = await supabase
    .from('image_analysis')
    .select('id')
    .limit(1)

  if (tableError) {
    console.error('image_analysis table does not exist:', {
      error: tableError,
      message: tableError.message,
      code: tableError.code,
      details: tableError.details,
      hint: tableError.hint
    })
    throw new Error(`image_analysis table does not exist: ${tableError.message}`)
  }

  console.log('✅ image_analysis table exists and is accessible')

  // Verify the test exists
  const { data: testData, error: testError } = await supabase
    .from('urine_tests')
    .select('id')
    .eq('id', analysisData.test_id)
    .single()

  if (testError || !testData) {
    console.error('Test not found:', {
      testId: analysisData.test_id,
      error: testError
    })
    throw new Error(`Test with ID ${analysisData.test_id} not found`)
  }

  const { data, error } = await supabase
    .from('image_analysis')
    .upsert(analysisData, {
      onConflict: 'test_id,power_mode,image_index'
    })
    .select()
    .single()

  if (error) {
    console.error('Supabase error upserting image analysis:', {
      error,
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      data: analysisData
    })
    throw error
  }
  
  console.log('Image analysis upserted successfully:', data)
  return data
}

export const deleteImageAnalysis = async (id: string): Promise<void> => {
  console.log(`Deleting image analysis ${id}`)
  
  const { error } = await supabase
    .from('image_analysis')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Supabase error deleting image analysis:', error)
    throw error
  }
  
  console.log('Image analysis deleted successfully')
}

export const deleteImageAnalysisByTest = async (testId: string): Promise<void> => {
  console.log(`Deleting all image analysis for test ${testId}`)
  
  const { error } = await supabase
    .from('image_analysis')
    .delete()
    .eq('test_id', testId)

  if (error) {
    console.error('Supabase error deleting image analysis by test:', error)
    throw error
  }
  
  console.log('All image analysis deleted successfully for test')
}

export const deleteImageAnalysisByImage = async (
  testId: string, 
  powerMode: PowerMode, 
  imageIndex: number
): Promise<void> => {
  console.log(`Deleting image analysis for test ${testId}, ${powerMode} image ${imageIndex}`)
  
  const { error } = await supabase
    .from('image_analysis')
    .delete()
    .eq('test_id', testId)
    .eq('power_mode', powerMode)
    .eq('image_index', imageIndex)

  if (error) {
    console.error('Supabase error deleting image analysis by image:', error)
    throw error
  }
  
  console.log('Image analysis deleted successfully for specific image')
}

