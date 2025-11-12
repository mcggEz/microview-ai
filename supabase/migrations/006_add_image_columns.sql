-- Add image columns to urine_tests table
ALTER TABLE urine_tests 
ADD COLUMN IF NOT EXISTS microscopic_images TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS gross_images TEXT[] DEFAULT '{}';

-- Add comments for documentation
COMMENT ON COLUMN urine_tests.microscopic_images IS 'Array of URLs for microscopic images';
COMMENT ON COLUMN urine_tests.gross_images IS 'Array of URLs for gross examination images';

-- Update existing rows to have empty arrays instead of NULL
UPDATE urine_tests 
SET microscopic_images = '{}', gross_images = '{}' 
WHERE microscopic_images IS NULL OR gross_images IS NULL;
