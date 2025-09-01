# Supabase Storage Setup Guide

## 🗂️ Storage Bucket Configuration

### 1. Create Storage Bucket

You need to create a storage bucket in your Supabase project to store urinalysis images.

#### Option A: Using Supabase Dashboard

1. **Go to your Supabase project dashboard**
2. **Navigate to Storage** in the left sidebar
3. **Click "Create a new bucket"**
4. **Configure the bucket:**
   - **Name**: `urine-images`
   - **Public bucket**: ✅ Check this (for public image access)
   - **File size limit**: `10MB` (or your preferred limit)
   - **Allowed MIME types**: `image/*`

#### Option B: Using SQL Commands

Run these SQL commands in your Supabase SQL editor:

```sql
-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'urine-images',
  'urine-images',
  true,
  10485760, -- 10MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
);

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
```

**Note**: These policies allow public access for development. For production, you should implement proper authentication and more restrictive policies.

### 2. Verify Bucket Creation

After creating the bucket, you can verify it exists by:

1. **Checking the Storage section** in your Supabase dashboard
2. **Running this SQL query:**
   ```sql
   SELECT * FROM storage.buckets WHERE name = 'urine-images';
   ```

### 3. Test Image Upload

Once the bucket is created, test the image upload functionality:

1. **Go to your application**
2. **Try uploading an image** in the report page
3. **Check the browser console** for any errors
4. **Verify the image appears** in the Supabase Storage dashboard

### 4. Troubleshooting

#### Common Issues:

1. **"Bucket not found" error**
   - Ensure the bucket name is exactly `urine-images`
   - Check that the bucket was created successfully

2. **"Permission denied" error**
   - Verify the storage policies are set correctly
   - Check that your user is authenticated

3. **"File size too large" error**
   - Increase the file size limit in bucket settings
   - Or compress the image before upload

4. **"Invalid MIME type" error**
   - Add the required MIME type to the bucket's allowed types
   - Or ensure you're uploading a valid image file

### 5. Environment Variables

Make sure your environment variables are set correctly:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 6. Bucket Structure

The application will organize images in this structure:

```
urine-images/
├── test-id-1/
│   ├── microscopic_2024-01-01T10-30-00.jpg
│   └── gross_2024-01-01T10-35-00.jpg
├── test-id-2/
│   ├── microscopic_2024-01-02T14-20-00.jpg
│   └── gross_2024-01-02T14-25-00.jpg
└── ...
```

### 7. Security Considerations

- **Public bucket**: Images are publicly accessible (required for display)
- **Authenticated uploads**: Only authenticated users can upload
- **File size limits**: Prevents abuse
- **MIME type restrictions**: Ensures only images are uploaded

### 8. Alternative Bucket Names

If you want to use a different bucket name, update the code in `src/lib/api.ts`:

```typescript
// Change this line in uploadImageToStorage function
.from('urine-images') // Change to your preferred name
```

## 🎯 Next Steps

1. **Create the storage bucket** using one of the methods above
2. **Test image upload** functionality
3. **Verify images are stored** and accessible
4. **Check that the application** can display uploaded images

If you continue to have issues, check the Supabase logs in your project dashboard for more detailed error information.
