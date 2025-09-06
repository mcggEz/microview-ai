-- Add AI count fields for Strasinger quantitation table
-- These fields will store the AI-generated counts for each sediment type

ALTER TABLE urine_tests
ADD COLUMN IF NOT EXISTS ai_epithelial_cells_count VARCHAR(50) DEFAULT '0 (None)',
ADD COLUMN IF NOT EXISTS ai_crystals_normal_count VARCHAR(50) DEFAULT '0 (None)',
ADD COLUMN IF NOT EXISTS ai_bacteria_count VARCHAR(50) DEFAULT '0 (None)',
ADD COLUMN IF NOT EXISTS ai_mucus_threads_count VARCHAR(50) DEFAULT '0 (None)',
ADD COLUMN IF NOT EXISTS ai_casts_count VARCHAR(50) DEFAULT '0 (None)',
ADD COLUMN IF NOT EXISTS ai_rbcs_count VARCHAR(50) DEFAULT '0 (None)',
ADD COLUMN IF NOT EXISTS ai_wbcs_count VARCHAR(50) DEFAULT '0 (None)',
ADD COLUMN IF NOT EXISTS ai_squamous_epithelial_cells_count VARCHAR(50) DEFAULT '0 (None)',
ADD COLUMN IF NOT EXISTS ai_transitional_epithelial_cells_count VARCHAR(50) DEFAULT '0 (None)',
ADD COLUMN IF NOT EXISTS ai_renal_tubular_epithelial_cells_count VARCHAR(50) DEFAULT '0 (None)',
ADD COLUMN IF NOT EXISTS ai_oval_fat_bodies_count VARCHAR(50) DEFAULT '0 (None)',
ADD COLUMN IF NOT EXISTS ai_abnormal_crystals_casts_count VARCHAR(50) DEFAULT '0 (None)';

-- Add comments for documentation
COMMENT ON COLUMN urine_tests.ai_epithelial_cells_count IS 'AI-generated count for epithelial cells (per LPF)';
COMMENT ON COLUMN urine_tests.ai_crystals_normal_count IS 'AI-generated count for normal crystals (per HPF)';
COMMENT ON COLUMN urine_tests.ai_bacteria_count IS 'AI-generated count for bacteria (per HPF)';
COMMENT ON COLUMN urine_tests.ai_mucus_threads_count IS 'AI-generated count for mucus threads (per LPF)';
COMMENT ON COLUMN urine_tests.ai_casts_count IS 'AI-generated count for casts (per LPF)';
COMMENT ON COLUMN urine_tests.ai_rbcs_count IS 'AI-generated count for red blood cells (per HPF)';
COMMENT ON COLUMN urine_tests.ai_wbcs_count IS 'AI-generated count for white blood cells (per HPF)';
COMMENT ON COLUMN urine_tests.ai_squamous_epithelial_cells_count IS 'AI-generated count for squamous epithelial cells (per LPF)';
COMMENT ON COLUMN urine_tests.ai_transitional_epithelial_cells_count IS 'AI-generated count for transitional epithelial cells, yeasts, Trichomonas (per HPF)';
COMMENT ON COLUMN urine_tests.ai_renal_tubular_epithelial_cells_count IS 'AI-generated count for renal tubular epithelial cells (per 10 HPFs)';
COMMENT ON COLUMN urine_tests.ai_oval_fat_bodies_count IS 'AI-generated count for oval fat bodies (per HPF)';
COMMENT ON COLUMN urine_tests.ai_abnormal_crystals_casts_count IS 'AI-generated count for abnormal crystals and casts (per LPF)';

-- Update existing records to have default values
UPDATE urine_tests
SET 
  ai_epithelial_cells_count = '0 (None)',
  ai_crystals_normal_count = '0 (None)',
  ai_bacteria_count = '0 (None)',
  ai_mucus_threads_count = '0 (None)',
  ai_casts_count = '0 (None)',
  ai_rbcs_count = '0 (None)',
  ai_wbcs_count = '0 (None)',
  ai_squamous_epithelial_cells_count = '0 (None)',
  ai_transitional_epithelial_cells_count = '0 (None)',
  ai_renal_tubular_epithelial_cells_count = '0 (None)',
  ai_oval_fat_bodies_count = '0 (None)',
  ai_abnormal_crystals_casts_count = '0 (None)'
WHERE ai_epithelial_cells_count IS NULL;
