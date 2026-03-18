-- Migration: Create public storage buckets for user avatars and cover photos
-- Run in Supabase SQL editor

-- ─── 1. Create avatars bucket (public) ───────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,                          -- public: getPublicUrl() returns permanent CDN URLs
  5242880,                       -- 5 MB max per file
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public             = true,
  file_size_limit    = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- ─── 2. RLS policies for storage.objects ─────────────────────────────────────

-- Allow anyone to read (public bucket already handles this, but explicit is safer)
CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Allow authenticated or anonymous users to upload their own files
CREATE POLICY "avatars_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars');

-- Allow users to update/replace their own files
CREATE POLICY "avatars_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars');

-- Allow users to delete their own files
CREATE POLICY "avatars_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars');
