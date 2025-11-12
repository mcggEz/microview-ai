-- Create storage bucket for urinalysis images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'urine-images',
  'urine-images',
  true,
  10485760, -- 10MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Create storage policy for public read access
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'urine-images');

-- Create storage policy for public upload (for development/testing)
CREATE POLICY "Public upload access" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'urine-images');

-- Create storage policy for public update access
CREATE POLICY "Public update access" ON storage.objects
FOR UPDATE USING (bucket_id = 'urine-images');

-- Create storage policy for public delete access
CREATE POLICY "Public delete access" ON storage.objects
FOR DELETE USING (bucket_id = 'urine-images');
