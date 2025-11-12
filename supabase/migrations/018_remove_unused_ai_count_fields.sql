-- Remove ALL unused columns from urine_tests table
-- This migration removes fields that are not used in the UI or essential functions
-- The actual displayed results come from image_analysis table

-- Remove AI count fields (stored but never displayed - results come from image_analysis)
ALTER TABLE urine_tests 
DROP COLUMN IF EXISTS ai_epithelial_cells_count,
DROP COLUMN IF EXISTS ai_crystals_normal_count,
DROP COLUMN IF EXISTS ai_bacteria_count,
DROP COLUMN IF EXISTS ai_mucus_threads_count,
DROP COLUMN IF EXISTS ai_casts_count,
DROP COLUMN IF EXISTS ai_rbcs_count,
DROP COLUMN IF EXISTS ai_wbcs_count,
DROP COLUMN IF EXISTS ai_squamous_epithelial_cells_count,
DROP COLUMN IF EXISTS ai_transitional_epithelial_cells_count,
DROP COLUMN IF EXISTS ai_renal_tubular_epithelial_cells_count,
DROP COLUMN IF EXISTS ai_oval_fat_bodies_count,
DROP COLUMN IF EXISTS ai_abnormal_crystals_casts_count;

-- Remove AI analysis fields (not used - all analysis is in image_analysis table)
ALTER TABLE urine_tests 
DROP COLUMN IF EXISTS lpf_ai_epithelial_cells,
DROP COLUMN IF EXISTS lpf_ai_mucus_threads,
DROP COLUMN IF EXISTS lpf_ai_casts,
DROP COLUMN IF EXISTS lpf_ai_squamous_epithelial,
DROP COLUMN IF EXISTS lpf_ai_abnormal_crystals,
DROP COLUMN IF EXISTS lpf_ai_confidence,
DROP COLUMN IF EXISTS lpf_ai_analysis_notes,
DROP COLUMN IF EXISTS lpf_ai_analyzed_at,
DROP COLUMN IF EXISTS hpf_ai_rbc,
DROP COLUMN IF EXISTS hpf_ai_wbc,
DROP COLUMN IF EXISTS hpf_ai_epithelial_cells,
DROP COLUMN IF EXISTS hpf_ai_crystals,
DROP COLUMN IF EXISTS hpf_ai_bacteria,
DROP COLUMN IF EXISTS hpf_ai_yeast,
DROP COLUMN IF EXISTS hpf_ai_sperm,
DROP COLUMN IF EXISTS hpf_ai_parasites,
DROP COLUMN IF EXISTS hpf_ai_confidence,
DROP COLUMN IF EXISTS hpf_ai_analysis_notes,
DROP COLUMN IF EXISTS hpf_ai_analyzed_at;

-- Remove old individual image fields (not displayed in UI)
-- These were only used in deleteTest function, which we'll update to only use arrays
ALTER TABLE urine_tests 
DROP COLUMN IF EXISTS image_1_url,
DROP COLUMN IF EXISTS image_1_description,
DROP COLUMN IF EXISTS image_2_url,
DROP COLUMN IF EXISTS image_2_description,
DROP COLUMN IF EXISTS image_3_url,
DROP COLUMN IF EXISTS image_3_description,
DROP COLUMN IF EXISTS image_4_url,
DROP COLUMN IF EXISTS image_4_description;

-- Remove gross_images (not displayed in UI)
ALTER TABLE urine_tests DROP COLUMN IF EXISTS gross_images;

-- Drop indexes that are no longer needed
DROP INDEX IF EXISTS idx_urine_tests_lpf_ai_analyzed_at;
DROP INDEX IF EXISTS idx_urine_tests_hpf_ai_analyzed_at;

-- Update comment
COMMENT ON TABLE urine_tests IS 'Urine test records - metadata and image arrays. AI analysis results are stored in image_analysis table.';

