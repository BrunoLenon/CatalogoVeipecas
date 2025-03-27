-- Drop existing storage policies
DROP POLICY IF EXISTS "allow_read_system_images" ON storage.objects;
DROP POLICY IF EXISTS "allow_manage_system_images" ON storage.objects;

-- Create system-images bucket if not exists
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
  true, -- Make bucket public
  false,
  5242880, -- 5MB limit
  array['image/jpeg', 'image/png', 'image/webp']::text[]
) ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']::text[];

-- Create storage policies
CREATE POLICY "allow_public_read_system_images_v2"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'system-images');

CREATE POLICY "allow_admin_manage_system_images_v2"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'system-images' AND
    auth.jwt() ->> 'role' IN ('master', 'admin')
  )
  WITH CHECK (
    bucket_id = 'system-images' AND
    auth.jwt() ->> 'role' IN ('master', 'admin')
  );