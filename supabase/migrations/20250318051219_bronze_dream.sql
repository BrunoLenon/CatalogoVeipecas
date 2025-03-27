-- Drop existing storage policies to avoid conflicts
DROP POLICY IF EXISTS "rls_storage_select_system_images_20250318" ON storage.objects;
DROP POLICY IF EXISTS "rls_storage_insert_system_images_20250318" ON storage.objects;
DROP POLICY IF EXISTS "rls_storage_update_system_images_20250318" ON storage.objects;
DROP POLICY IF EXISTS "rls_storage_delete_system_images_20250318" ON storage.objects;

-- Ensure storage bucket exists with correct permissions
INSERT INTO storage.buckets (
  id,
  name,
  public,
  avif_autodetection,
  file_size_limit,
  allowed_mime_types
) VALUES (
  'system-images',
  'system-images',
  true,
  false,
  5242880, -- 5MB limit
  array['image/jpeg', 'image/png', 'image/webp']::text[]
) ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']::text[];

-- Create storage policies with proper role checks
CREATE POLICY "rls_storage_select_system_images_20250318_v2"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'system-images');

CREATE POLICY "rls_storage_manage_system_images_20250318"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (bucket_id = 'system-images')
  WITH CHECK (bucket_id = 'system-images');