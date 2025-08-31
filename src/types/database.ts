export type Gender = 'male' | 'female' | 'other'
export type ReportStatus = 'pending' | 'in_progress' | 'completed' | 'reviewed'
export type ResultStatus = 'normal' | 'abnormal' | 'critical'

export interface Patient {
  id: string
  patient_id: string
  name: string
  age: number
  gender: Gender
  created_at: string
  updated_at: string
}

export interface UrineTest {
  id: string
  test_code: string
  patient_id: string

  sample_id?: string
  collection_time?: string
  analysis_date: string
  technician?: string
  status: ReportStatus

  rbc_count?: string
  rbc_unit?: string
  rbc_morphology?: string
  rbc_notes?: string
  rbc_status?: ResultStatus
  rbc_accuracy?: number

  wbc_count?: string
  wbc_unit?: string
  wbc_morphology?: string
  wbc_notes?: string
  wbc_status?: ResultStatus
  wbc_accuracy?: number

  epithelial_cells_count?: string
  epithelial_cells_unit?: string
  epithelial_cells_morphology?: string
  epithelial_cells_notes?: string
  epithelial_cells_status?: ResultStatus
  epithelial_cells_accuracy?: number

  crystals_count?: string
  crystals_unit?: string
  crystals_morphology?: string
  crystals_notes?: string
  crystals_status?: ResultStatus
  crystals_accuracy?: number

  casts_count?: string
  casts_unit?: string
  casts_morphology?: string
  casts_notes?: string
  casts_status?: ResultStatus
  casts_accuracy?: number

  bacteria_count?: string
  bacteria_unit?: string
  bacteria_morphology?: string
  bacteria_notes?: string
  bacteria_status?: ResultStatus
  bacteria_accuracy?: number

  yeast_count?: string
  yeast_unit?: string
  yeast_morphology?: string
  yeast_notes?: string
  yeast_status?: ResultStatus
  yeast_accuracy?: number

  mucus_count?: string
  mucus_unit?: string
  mucus_morphology?: string
  mucus_notes?: string
  mucus_status?: ResultStatus
  mucus_accuracy?: number

  sperm_count?: string
  sperm_unit?: string
  sperm_morphology?: string
  sperm_notes?: string
  sperm_status?: ResultStatus
  sperm_accuracy?: number

  parasites_count?: string
  parasites_unit?: string
  parasites_morphology?: string
  parasites_notes?: string
  parasites_status?: ResultStatus
  parasites_accuracy?: number

  // Image fields
  image_1_url?: string
  image_1_description?: string
  image_2_url?: string
  image_2_description?: string
  image_3_url?: string
  image_3_description?: string
  image_4_url?: string
  image_4_description?: string

  // Dynamic image arrays
  microscopic_images?: string[]
  gross_images?: string[]

  created_at: string
  updated_at: string
}
