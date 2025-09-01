-- Quick fix for storage RLS policies
-- Run this in your Supabase SQL editor

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own images" ON storage.objects;
DROP POLICY IF EXISTS "Public upload access" ON storage.objects;
DROP POLICY IF EXISTS "Public update access" ON storage.objects;
DROP POLICY IF EXISTS "Public delete access" ON storage.objects;

-- Create new permissive policies for development
CREATE POLICY "Public upload access" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'urine-images');

CREATE POLICY "Public update access" ON storage.objects
FOR UPDATE USING (bucket_id = 'urine-images');

CREATE POLICY "Public delete access" ON storage.objects
FOR DELETE USING (bucket_id = 'urine-images');

-- Verify the bucket exists
SELECT * FROM storage.buckets WHERE name = 'urine-images';
