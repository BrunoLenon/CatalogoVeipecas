-- Drop existing storage policies to avoid conflicts
DROP POLICY IF EXISTS "Public can view system images" ON storage.objects;
DROP POLICY IF EXISTS "Only admins can manage system images" ON storage.objects;

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
CREATE POLICY "rls_storage_select_system_images_20250318"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'system-images');

CREATE POLICY "rls_storage_insert_system_images_20250318"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'system-images' AND
    (auth.jwt() ->> 'role')::text IN ('master', 'admin')
  );

CREATE POLICY "rls_storage_update_system_images_20250318"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'system-images' AND
    (auth.jwt() ->> 'role')::text IN ('master', 'admin')
  )
  WITH CHECK (
    bucket_id = 'system-images' AND
    (auth.jwt() ->> 'role')::text IN ('master', 'admin')
  );

CREATE POLICY "rls_storage_delete_system_images_20250318"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'system-images' AND
    (auth.jwt() ->> 'role')::text IN ('master', 'admin')
  );