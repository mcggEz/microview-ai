-- Remove old AI analysis fields from urine_tests table
-- These fields are now stored in the image_analysis table instead

-- Remove LPF AI analysis fields from urine_tests table
ALTER TABLE urine_tests 
DROP COLUMN IF EXISTS lpf_ai_epithelial_cells,
DROP COLUMN IF EXISTS lpf_ai_mucus_threads,
DROP COLUMN IF EXISTS lpf_ai_casts,
DROP COLUMN IF EXISTS lpf_ai_squamous_epithelial,
DROP COLUMN IF EXISTS lpf_ai_abnormal_crystals,
DROP COLUMN IF EXISTS lpf_ai_confidence,
DROP COLUMN IF EXISTS lpf_ai_analysis_notes,
DROP COLUMN IF EXISTS lpf_ai_analyzed_at;

-- Remove HPF AI analysis fields from urine_tests table
ALTER TABLE urine_tests 
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

-- Drop the old indexes
DROP INDEX IF EXISTS idx_urine_tests_lpf_ai_analyzed_at;
DROP INDEX IF EXISTS idx_urine_tests_hpf_ai_analyzed_at;
