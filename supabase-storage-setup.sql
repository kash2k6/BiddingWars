-- Supabase Storage Setup for Digital Product Uploads
-- Run this in your Supabase SQL editor

-- Create storage bucket for digital assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'digital-assets', 
  'digital-assets', 
  false, 
  104857600, -- 100MB limit
  ARRAY[
    'application/pdf',
    'application/zip',
    'application/x-rar-compressed',
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/json',
    'application/xml'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for auction images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'auction-images', 
  'auction-images', 
  true, -- Public for viewing auction images
  10485760, -- 10MB limit
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Create storage policies for digital assets
-- Only authenticated users can upload digital assets
CREATE POLICY "Only authenticated users can upload digital assets" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'digital-assets' 
    AND auth.role() = 'authenticated'
  );

-- Only auction winners can download digital assets
CREATE POLICY "Only auction winners can download digital assets" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'digital-assets'
    AND EXISTS (
      SELECT 1 FROM auctions 
      WHERE auctions.digital_file_path = storage.objects.name
      AND auctions.winner_user_id = auth.uid()::text
    )
  );

-- Auction creators can view their own uploaded files
CREATE POLICY "Auction creators can view their uploaded files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'digital-assets'
    AND EXISTS (
      SELECT 1 FROM auctions 
      WHERE auctions.digital_file_path = storage.objects.name
      AND auctions.created_by_user_id = auth.uid()::text
    )
  );

-- Users can update their own uploaded files (for editing auctions)
CREATE POLICY "Users can update their uploaded files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'digital-assets'
    AND EXISTS (
      SELECT 1 FROM auctions 
      WHERE auctions.digital_file_path = storage.objects.name
      AND auctions.created_by_user_id = auth.uid()::text
    )
  );

-- Users can delete their own uploaded files
CREATE POLICY "Users can delete their uploaded files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'digital-assets'
    AND EXISTS (
      SELECT 1 FROM auctions 
      WHERE auctions.digital_file_path = storage.objects.name
      AND auctions.created_by_user_id = auth.uid()::text
    )
  );

-- Create storage policies for auction images
-- Only authenticated users can upload auction images
CREATE POLICY "Only authenticated users can upload auction images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'auction-images' 
    AND auth.role() = 'authenticated'
  );

-- Anyone can view auction images (public bucket)
CREATE POLICY "Anyone can view auction images" ON storage.objects
  FOR SELECT USING (bucket_id = 'auction-images');

-- Users can update their own uploaded images
CREATE POLICY "Users can update their auction images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'auction-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own uploaded images
CREATE POLICY "Users can delete their auction images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'auction-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Verify the buckets were created
SELECT * FROM storage.buckets WHERE id IN ('digital-assets', 'auction-images');
