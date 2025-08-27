-- Add image fields to urine_tests table for dynamic microscopic images

-- Add image fields to urine_tests table
ALTER TABLE urine_tests 
ADD COLUMN image_1_url TEXT,
ADD COLUMN image_1_description TEXT,
ADD COLUMN image_2_url TEXT,
ADD COLUMN image_2_description TEXT,
ADD COLUMN image_3_url TEXT,
ADD COLUMN image_3_description TEXT,
ADD COLUMN image_4_url TEXT,
ADD COLUMN image_4_description TEXT;

-- Add comments for documentation
COMMENT ON COLUMN urine_tests.image_1_url IS 'URL or path to first microscopic image';
COMMENT ON COLUMN urine_tests.image_1_description IS 'Description of first microscopic image';
COMMENT ON COLUMN urine_tests.image_2_url IS 'URL or path to second microscopic image';
COMMENT ON COLUMN urine_tests.image_2_description IS 'Description of second microscopic image';
COMMENT ON COLUMN urine_tests.image_3_url IS 'URL or path to third microscopic image';
COMMENT ON COLUMN urine_tests.image_3_description IS 'Description of third microscopic image';
COMMENT ON COLUMN urine_tests.image_4_url IS 'URL or path to fourth microscopic image';
COMMENT ON COLUMN urine_tests.image_4_description IS 'Description of fourth microscopic image';
