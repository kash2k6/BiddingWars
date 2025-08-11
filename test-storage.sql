-- Test and Create Storage Buckets
-- Run this in your Supabase SQL editor

-- Check if buckets exist
SELECT * FROM storage.buckets WHERE id IN ('auction-images', 'digital-assets');

-- Create auction-images bucket if it doesn't exist
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

-- Create digital-assets bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'digital-assets', 
  'digital-assets', 
  false, 
  104857600, -- 100MB limit
  ARRAY[
    'application/pdf', 'application/zip', 'application/x-rar-compressed',
    'video/mp4', 'video/quicktime', 'video/x-msvideo',
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'application/json', 'application/xml'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Verify buckets were created
SELECT * FROM storage.buckets WHERE id IN ('auction-images', 'digital-assets');
