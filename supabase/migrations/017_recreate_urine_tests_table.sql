-- Recreate urine_tests table with all essential fields
-- This migration recreates the table that was accidentally deleted

-- Ensure UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Recreate urine_tests table with all fields used in the application
CREATE TABLE IF NOT EXISTS urine_tests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_code VARCHAR(50) UNIQUE NOT NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,

  -- Report metadata (used in UI)
  collection_time TIME,
  analysis_date DATE NOT NULL,
  technician VARCHAR(255),
  status VARCHAR(20) CHECK (status IN ('pending', 'in_progress', 'completed', 'reviewed')) DEFAULT 'pending',

  -- Image arrays (used in UI)
  microscopic_images TEXT[] DEFAULT '{}',
  hpf_images TEXT[] DEFAULT '{}',
  lpf_images TEXT[] DEFAULT '{}',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tests_patient_id ON urine_tests(patient_id);
CREATE INDEX IF NOT EXISTS idx_tests_analysis_date ON urine_tests(analysis_date);
CREATE INDEX IF NOT EXISTS idx_tests_status ON urine_tests(status);
CREATE INDEX IF NOT EXISTS idx_tests_test_code ON urine_tests(test_code);

-- Create or replace updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_urine_tests_updated_at ON urine_tests;
CREATE TRIGGER update_urine_tests_updated_at
BEFORE UPDATE ON urine_tests
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE urine_tests IS 'Urine test records - metadata and image arrays. AI analysis results are stored in image_analysis table.';
COMMENT ON COLUMN urine_tests.test_code IS 'Unique test identifier in format YYYYMMDD-HH-MM-N';
COMMENT ON COLUMN urine_tests.analysis_date IS 'Date when the urine analysis was performed';
COMMENT ON COLUMN urine_tests.status IS 'Test status: pending, in_progress, completed, reviewed';
COMMENT ON COLUMN urine_tests.collection_time IS 'Time when urine sample was collected';
COMMENT ON COLUMN urine_tests.technician IS 'Name of the lab technician performing the analysis';
COMMENT ON COLUMN urine_tests.microscopic_images IS 'Array of URLs for microscopic images';
COMMENT ON COLUMN urine_tests.hpf_images IS 'Array of URLs for High Power Field (HPF) microscopic images';
COMMENT ON COLUMN urine_tests.lpf_images IS 'Array of URLs for Low Power Field (LPF) microscopic images';

-- Add foreign key constraint to image_analysis table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'image_analysis') THEN
    -- Drop existing foreign key if it exists
    ALTER TABLE image_analysis DROP CONSTRAINT IF EXISTS image_analysis_test_id_fkey;
    
    -- Delete orphaned rows from image_analysis that reference non-existent tests
    DELETE FROM image_analysis 
    WHERE test_id NOT IN (SELECT id FROM urine_tests);
    
    -- Add foreign key constraint
    ALTER TABLE image_analysis 
    ADD CONSTRAINT image_analysis_test_id_fkey 
    FOREIGN KEY (test_id) 
    REFERENCES urine_tests(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

