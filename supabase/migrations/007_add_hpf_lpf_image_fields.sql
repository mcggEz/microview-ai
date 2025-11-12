-- Add HPF and LPF image columns to urine_tests table
ALTER TABLE urine_tests 
ADD COLUMN IF NOT EXISTS hpf_images TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS lpf_images TEXT[] DEFAULT '{}';

-- Add comments for documentation
COMMENT ON COLUMN urine_tests.hpf_images IS 'Array of URLs for High Power Field (HPF) microscopic images';
COMMENT ON COLUMN urine_tests.lpf_images IS 'Array of URLs for Low Power Field (LPF) microscopic images';

-- Update existing rows to have empty arrays instead of NULL
UPDATE urine_tests 
SET hpf_images = '{}', lpf_images = '{}' 
WHERE hpf_images IS NULL OR lpf_images IS NULL;
