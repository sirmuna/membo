-- ============================================
-- MEMBO V1 - Avatar Storage Setup
-- ============================================
-- Run this in Supabase SQL Editor to set up avatar storage
-- ============================================

-- STEP 1: Create the avatars storage bucket
-- This bucket will store user avatar images

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,  -- Public bucket so avatars can be displayed
  5242880,  -- 5MB file size limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- STEP 2: Enable RLS on the avatars bucket
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- STEP 3: Create RLS policies for avatars bucket

-- Policy: Users can upload their own avatars
-- File path pattern: {user_id}/{filename}
CREATE POLICY "Users can upload their own avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can view their own avatars
CREATE POLICY "Users can view their own avatars"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Public can read all avatars (needed for display)
CREATE POLICY "Public can view avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Policy: Users can delete their own avatars
CREATE POLICY "Users can delete their own avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- STEP 4: Verify the bucket was created
SELECT * FROM storage.buckets WHERE id = 'avatars';

-- STEP 5: Verify RLS policies
SELECT
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects'
AND schemaname = 'storage'
AND policyname LIKE '%avatar%';

-- ============================================
-- USAGE NOTES:
-- ============================================
-- File naming convention: {user_id}/{unique_filename}.{ext}
-- Example: 550e8400-e29b-41d4-a716-446655440000/avatar-123456.jpg
--
-- The foldername() function extracts the first part of the path
-- This ensures users can only access files in their own folder
--
-- Public read access allows avatars to be displayed without authentication
-- ============================================
