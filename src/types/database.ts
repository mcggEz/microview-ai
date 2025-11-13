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
  med_tech_id?: string // User who owns this patient
  created_at: string
  updated_at: string
}

export interface UrineTest {
  id: string
  test_code: string
  patient_id: string
  med_tech_id?: string // User who owns this test

  collection_time?: string
  analysis_date: string
  technician?: string
  status: ReportStatus

  // Image arrays (used in UI)
  microscopic_images?: string[]
  hpf_images?: string[]
  lpf_images?: string[]



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

export interface ImageAnalysis {
  id: string
  test_id: string
  power_mode: PowerMode
  image_index: number
  image_url: string
  
  // LPF sediment detection results (counts)
  lpf_epithelial_cells?: number
  lpf_mucus_threads?: number
  lpf_casts?: number
  lpf_squamous_epithelial?: number
  lpf_abnormal_crystals?: number
  
  // HPF sediment detection results (counts)
  hpf_rbc?: number
  hpf_wbc?: number
  hpf_epithelial_cells?: number
  hpf_crystals?: number
  hpf_bacteria?: number
  hpf_yeast?: number
  hpf_sperm?: number
  hpf_parasites?: number
  
  // Analysis metadata
  confidence?: number
  analysis_notes?: string
  analyzed_at: string
  created_at: string
  updated_at: string
}

export interface MedTechUser {
  id: string
  email: string
  password_hash: string
  full_name?: string
  is_active: boolean
  role: string
  created_at: string
  updated_at: string
}
