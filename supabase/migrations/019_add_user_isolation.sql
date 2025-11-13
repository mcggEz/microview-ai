-- Add med_tech_id to patients and urine_tests tables for user data isolation
-- This ensures each user can only see and modify their own data

-- Add med_tech_id to patients table
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS med_tech_id UUID REFERENCES med_tech(id) ON DELETE CASCADE;

-- Add med_tech_id to urine_tests table
ALTER TABLE urine_tests 
ADD COLUMN IF NOT EXISTS med_tech_id UUID REFERENCES med_tech(id) ON DELETE CASCADE;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_patients_med_tech_id ON patients(med_tech_id);
CREATE INDEX IF NOT EXISTS idx_urine_tests_med_tech_id ON urine_tests(med_tech_id);

-- Add comments for documentation
COMMENT ON COLUMN patients.med_tech_id IS 'Foreign key to med_tech table - isolates patient data by user';
COMMENT ON COLUMN urine_tests.med_tech_id IS 'Foreign key to med_tech table - isolates test data by user';

