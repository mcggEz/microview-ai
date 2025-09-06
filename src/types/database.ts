export type Gender = 'male' | 'female' | 'other'
export type ReportStatus = 'pending' | 'in_progress' | 'completed' | 'reviewed'
export type ResultStatus = 'normal' | 'abnormal' | 'critical'
export type PowerMode = 'LPF' | 'HPF'


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

  collection_time?: string
  analysis_date: string
  technician?: string
  status: ReportStatus

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
  hpf_images?: string[]
  lpf_images?: string[]

  // AI-generated counts for Strasinger quantitation table
  ai_epithelial_cells_count?: string
  ai_crystals_normal_count?: string
  ai_bacteria_count?: string
  ai_mucus_threads_count?: string
  ai_casts_count?: string
  ai_rbcs_count?: string
  ai_wbcs_count?: string
  ai_squamous_epithelial_cells_count?: string
  ai_transitional_epithelial_cells_count?: string
  ai_renal_tubular_epithelial_cells_count?: string
  ai_oval_fat_bodies_count?: string
  ai_abnormal_crystals_casts_count?: string

  created_at: string
  updated_at: string
}

export interface SedimentAnalysis {
  id: string
  test_id: string
  power_mode: PowerMode
  field_index: number
  region_index: number
  
  // LPF sediment types
  epithelial_cells: string
  mucus_threads: string
  casts: string
  squamous_epithelial: string
  abnormal_crystals: string
  
  // HPF sediment types
  crystals_normal: string
  bacteria: string
  rbcs: string
  wbcs: string
  transitional_yeasts_trichomonas: string
  renal_tubular_epithelial: string
  oval_fat_bodies: string
  
  created_at: string
  updated_at: string
}
