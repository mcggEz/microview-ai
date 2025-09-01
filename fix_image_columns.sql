-- Quick fix: Add missing image columns to urine_tests table
-- Run this in your Supabase SQL editor

-- Add the missing columns
ALTER TABLE urine_tests 
ADD COLUMN IF NOT EXISTS microscopic_images TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS gross_images TEXT[] DEFAULT '{}';

-- Update existing rows to have empty arrays
UPDATE urine_tests 
SET microscopic_images = '{}', gross_images = '{}' 
WHERE microscopic_images IS NULL OR gross_images IS NULL;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'urine_tests' 
AND column_name IN ('microscopic_images', 'gross_images');
