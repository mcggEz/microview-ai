-- Create storage bucket for urine images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'urine-images',
  'urine-images',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Create policy to allow authenticated users to upload images
CREATE POLICY "Allow authenticated users to upload images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'urine-images' AND
  auth.role() = 'authenticated'
);

-- Create policy to allow public read access to images
CREATE POLICY "Allow public read access to images" ON storage.objects
FOR SELECT USING (
  bucket_id = 'urine-images'
);

-- Create policy to allow authenticated users to update their own images
CREATE POLICY "Allow authenticated users to update images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'urine-images' AND
  auth.role() = 'authenticated'
);

-- Create policy to allow authenticated users to delete their own images
CREATE POLICY "Allow authenticated users to delete images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'urine-images' AND
  auth.role() = 'authenticated'
);
