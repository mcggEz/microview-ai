-- Remove sample_id column from urine_tests table
ALTER TABLE urine_tests DROP COLUMN IF EXISTS sample_id;

-- Add comment for documentation
COMMENT ON TABLE urine_tests IS 'Urine test records with sample_id column removed';
