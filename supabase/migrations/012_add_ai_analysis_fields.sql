-- Add AI analysis fields to urine_tests table for storing Gemini AI detection results
-- This migration adds fields to store LPF and HPF sediment detection results

-- Add LPF AI analysis fields to urine_tests table
ALTER TABLE urine_tests 
ADD COLUMN IF NOT EXISTS lpf_ai_epithelial_cells BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS lpf_ai_mucus_threads BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS lpf_ai_casts BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS lpf_ai_squamous_epithelial BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS lpf_ai_abnormal_crystals BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS lpf_ai_confidence INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS lpf_ai_analysis_notes TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS lpf_ai_analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add HPF AI analysis fields to urine_tests table
ALTER TABLE urine_tests 
ADD COLUMN IF NOT EXISTS hpf_ai_rbc BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS hpf_ai_wbc BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS hpf_ai_epithelial_cells BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS hpf_ai_crystals BOOLEAN DEFAULT NULL,do we 
ADD COLUMN IF NOT EXISTS hpf_ai_bacteria BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS hpf_ai_yeast BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS hpf_ai_sperm BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS hpf_ai_parasites BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS hpf_ai_confidence INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS hpf_ai_analysis_notes TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS hpf_ai_analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_urine_tests_lpf_ai_analyzed_at ON urine_tests(lpf_ai_analyzed_at);
CREATE INDEX IF NOT EXISTS idx_urine_tests_hpf_ai_analyzed_at ON urine_tests(hpf_ai_analyzed_at);

-- Add comments for documentation
COMMENT ON COLUMN urine_tests.lpf_ai_epithelial_cells IS 'AI detected epithelial cells in LPF analysis (true/false)';
COMMENT ON COLUMN urine_tests.lpf_ai_mucus_threads IS 'AI detected mucus threads in LPF analysis (true/false)';
COMMENT ON COLUMN urine_tests.lpf_ai_casts IS 'AI detected casts in LPF analysis (true/false)';
COMMENT ON COLUMN urine_tests.lpf_ai_squamous_epithelial IS 'AI detected squamous epithelial in LPF analysis (true/false)';
COMMENT ON COLUMN urine_tests.lpf_ai_abnormal_crystals IS 'AI detected abnormal crystals in LPF analysis (true/false)';
COMMENT ON COLUMN urine_tests.lpf_ai_confidence IS 'AI confidence percentage for LPF analysis (0-100)';
COMMENT ON COLUMN urine_tests.lpf_ai_analysis_notes IS 'AI analysis notes for LPF analysis';
COMMENT ON COLUMN urine_tests.lpf_ai_analyzed_at IS 'Timestamp when LPF AI analysis was completed';

COMMENT ON COLUMN urine_tests.hpf_ai_rbc IS 'AI detected RBC in HPF analysis (true/false)';
COMMENT ON COLUMN urine_tests.hpf_ai_wbc IS 'AI detected WBC in HPF analysis (true/false)';
COMMENT ON COLUMN urine_tests.hpf_ai_epithelial_cells IS 'AI detected epithelial cells in HPF analysis (true/false)';
COMMENT ON COLUMN urine_tests.hpf_ai_crystals IS 'AI detected crystals in HPF analysis (true/false)';
COMMENT ON COLUMN urine_tests.hpf_ai_bacteria IS 'AI detected bacteria in HPF analysis (true/false)';
COMMENT ON COLUMN urine_tests.hpf_ai_yeast IS 'AI detected yeast in HPF analysis (true/false)';
COMMENT ON COLUMN urine_tests.hpf_ai_sperm IS 'AI detected sperm in HPF analysis (true/false)';
COMMENT ON COLUMN urine_tests.hpf_ai_parasites IS 'AI detected parasites in HPF analysis (true/false)';
COMMENT ON COLUMN urine_tests.hpf_ai_confidence IS 'AI confidence percentage for HPF analysis (0-100)';
COMMENT ON COLUMN urine_tests.hpf_ai_analysis_notes IS 'AI analysis notes for HPF analysis';
COMMENT ON COLUMN urine_tests.hpf_ai_analyzed_at IS 'Timestamp when HPF AI analysis was completed';
