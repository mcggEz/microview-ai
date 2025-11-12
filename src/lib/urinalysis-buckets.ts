import { 
  UrinalysisBuckets, 
  UrinalysisField, 
  UrinalysisBucketKey,
  DEFAULT_URINALYSIS_BUCKETS,
  BUCKET_DISPLAY_NAMES,
} from '@/types/database'

type UrinalysisTestData = Record<string, string | number | null | undefined>

/**
 * Convert database test data to bucket format
 */
export const convertTestToBuckets = (test: UrinalysisTestData): UrinalysisBuckets => {
  return {
    red_blood_cells: {
      count: test.rbc_count || '0',
      unit: test.rbc_unit || '/HPF',
      morphology: test.rbc_morphology || 'Normal',
      notes: test.rbc_notes || '',
      status: test.rbc_status || 'normal',
      accuracy: test.rbc_accuracy || 0
    },
    white_blood_cells: {
      count: test.wbc_count || '0',
      unit: test.wbc_unit || '/HPF',
      morphology: test.wbc_morphology || 'Normal',
      notes: test.wbc_notes || '',
      status: test.wbc_status || 'normal',
      accuracy: test.wbc_accuracy || 0
    },
    epithelial_cells: {
      count: test.epithelial_cells_count || '0',
      unit: test.epithelial_cells_unit || '/HPF',
      morphology: test.epithelial_cells_morphology || 'Normal',
      notes: test.epithelial_cells_notes || '',
      status: test.epithelial_cells_status || 'normal',
      accuracy: test.epithelial_cells_accuracy || 0
    },
    crystals: {
      count: test.crystals_count || '0',
      unit: test.crystals_unit || '/HPF',
      morphology: test.crystals_morphology || 'Normal',
      notes: test.crystals_notes || '',
      status: test.crystals_status || 'normal',
      accuracy: test.crystals_accuracy || 0
    },
    casts: {
      count: test.casts_count || '0',
      unit: test.casts_unit || '/LPF',
      morphology: test.casts_morphology || 'Normal',
      notes: test.casts_notes || '',
      status: test.casts_status || 'normal',
      accuracy: test.casts_accuracy || 0
    },
    bacteria: {
      count: test.bacteria_count || '0',
      unit: test.bacteria_unit || '/HPF',
      morphology: test.bacteria_morphology || 'Normal',
      notes: test.bacteria_notes || '',
      status: test.bacteria_status || 'normal',
      accuracy: test.bacteria_accuracy || 0
    },
    yeast: {
      count: test.yeast_count || '0',
      unit: test.yeast_unit || '/HPF',
      morphology: test.yeast_morphology || 'Normal',
      notes: test.yeast_notes || '',
      status: test.yeast_status || 'normal',
      accuracy: test.yeast_accuracy || 0
    },
    mucus: {
      count: test.mucus_count || '0',
      unit: test.mucus_unit || '/LPF',
      morphology: test.mucus_morphology || 'Normal',
      notes: test.mucus_notes || '',
      status: test.mucus_status || 'normal',
      accuracy: test.mucus_accuracy || 0
    },
    sperm: {
      count: test.sperm_count || '0',
      unit: test.sperm_unit || '/HPF',
      morphology: test.sperm_morphology || 'Normal',
      notes: test.sperm_notes || '',
      status: test.sperm_status || 'normal',
      accuracy: test.sperm_accuracy || 0
    },
    parasites: {
      count: test.parasites_count || '0',
      unit: test.parasites_unit || '/HPF',
      morphology: test.parasites_morphology || 'Normal',
      notes: test.parasites_notes || '',
      status: test.parasites_status || 'normal',
      accuracy: test.parasites_accuracy || 0
    }
  }
}

/**
 * Convert bucket data back to database format
 */
export const convertBucketsToTest = (buckets: UrinalysisBuckets): UrinalysisTestData => {
  return {
    rbc_count: buckets.red_blood_cells.count,
    rbc_unit: buckets.red_blood_cells.unit,
    rbc_morphology: buckets.red_blood_cells.morphology,
    rbc_notes: buckets.red_blood_cells.notes,
    rbc_status: buckets.red_blood_cells.status,
    rbc_accuracy: buckets.red_blood_cells.accuracy,
    
    wbc_count: buckets.white_blood_cells.count,
    wbc_unit: buckets.white_blood_cells.unit,
    wbc_morphology: buckets.white_blood_cells.morphology,
    wbc_notes: buckets.white_blood_cells.notes,
    wbc_status: buckets.white_blood_cells.status,
    wbc_accuracy: buckets.white_blood_cells.accuracy,
    
    epithelial_cells_count: buckets.epithelial_cells.count,
    epithelial_cells_unit: buckets.epithelial_cells.unit,
    epithelial_cells_morphology: buckets.epithelial_cells.morphology,
    epithelial_cells_notes: buckets.epithelial_cells.notes,
    epithelial_cells_status: buckets.epithelial_cells.status,
    epithelial_cells_accuracy: buckets.epithelial_cells.accuracy,
    
    crystals_count: buckets.crystals.count,
    crystals_unit: buckets.crystals.unit,
    crystals_morphology: buckets.crystals.morphology,
    crystals_notes: buckets.crystals.notes,
    crystals_status: buckets.crystals.status,
    crystals_accuracy: buckets.crystals.accuracy,
    
    casts_count: buckets.casts.count,
    casts_unit: buckets.casts.unit,
    casts_morphology: buckets.casts.morphology,
    casts_notes: buckets.casts.notes,
    casts_status: buckets.casts.status,
    casts_accuracy: buckets.casts.accuracy,
    
    bacteria_count: buckets.bacteria.count,
    bacteria_unit: buckets.bacteria.unit,
    bacteria_morphology: buckets.bacteria.morphology,
    bacteria_notes: buckets.bacteria.notes,
    bacteria_status: buckets.bacteria.status,
    bacteria_accuracy: buckets.bacteria.accuracy,
    
    yeast_count: buckets.yeast.count,
    yeast_unit: buckets.yeast.unit,
    yeast_morphology: buckets.yeast.morphology,
    yeast_notes: buckets.yeast.notes,
    yeast_status: buckets.yeast.status,
    yeast_accuracy: buckets.yeast.accuracy,
    
    mucus_count: buckets.mucus.count,
    mucus_unit: buckets.mucus.unit,
    mucus_morphology: buckets.mucus.morphology,
    mucus_notes: buckets.mucus.notes,
    mucus_status: buckets.mucus.status,
    mucus_accuracy: buckets.mucus.accuracy,
    
    sperm_count: buckets.sperm.count,
    sperm_unit: buckets.sperm.unit,
    sperm_morphology: buckets.sperm.morphology,
    sperm_notes: buckets.sperm.notes,
    sperm_status: buckets.sperm.status,
    sperm_accuracy: buckets.sperm.accuracy,
    
    parasites_count: buckets.parasites.count,
    parasites_unit: buckets.parasites.unit,
    parasites_morphology: buckets.parasites.morphology,
    parasites_notes: buckets.parasites.notes,
    parasites_status: buckets.parasites.status,
    parasites_accuracy: buckets.parasites.accuracy
  }
}

/**
 * Get bucket display name
 */
export const getBucketDisplayName = (bucketKey: UrinalysisBucketKey): string => {
  return BUCKET_DISPLAY_NAMES[bucketKey]
}

/**
 * Get all bucket keys
 */
export const getBucketKeys = (): UrinalysisBucketKey[] => {
  return Object.keys(DEFAULT_URINALYSIS_BUCKETS) as UrinalysisBucketKey[]
}

/**
 * Validate bucket data
 */
export const validateBucket = (bucket: UrinalysisField): boolean => {
  return (
    typeof bucket.count === 'string' &&
    typeof bucket.unit === 'string' &&
    typeof bucket.morphology === 'string' &&
    typeof bucket.notes === 'string' &&
    ['normal', 'abnormal', 'critical'].includes(bucket.status) &&
    typeof bucket.accuracy === 'number' &&
    bucket.accuracy >= 0 &&
    bucket.accuracy <= 100
  )
}

/**
 * Get bucket status color
 */
export const getBucketStatusColor = (status: string): string => {
  switch (status) {
    case 'normal': return 'text-green-600 bg-green-100'
    case 'abnormal': return 'text-orange-600 bg-orange-100'
    case 'critical': return 'text-red-600 bg-red-100'
    default: return 'text-gray-600 bg-gray-100'
  }
}

/**
 * Get accuracy color
 */
export const getAccuracyColor = (accuracy: number): string => {
  if (accuracy >= 95) return 'text-green-600 bg-green-100'
  if (accuracy >= 90) return 'text-yellow-600 bg-yellow-100'
  if (accuracy >= 80) return 'text-orange-600 bg-orange-100'
  return 'text-red-600 bg-red-100'
}
