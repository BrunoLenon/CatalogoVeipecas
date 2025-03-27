-- Create new storage bucket for system images
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
) ON CONFLICT DO NOTHING;

-- Create storage policies for system images
CREATE POLICY "Public can view system images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'system-images');

CREATE POLICY "Only admins can manage system images"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'system-images' AND
    COALESCE(NULLIF(current_setting('request.jwt.claims', true)::jsonb->>'role', ''), 'customer') IN ('master', 'admin')
  )
  WITH CHECK (
    bucket_id = 'system-images' AND
    COALESCE(NULLIF(current_setting('request.jwt.claims', true)::jsonb->>'role', ''), 'customer') IN ('master', 'admin')
  );