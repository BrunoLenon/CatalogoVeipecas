/*
  # Fix Custom Table RLS Policies

  1. Changes
    - Drop existing policies
    - Add new policies with proper role checks
    - Fix storage policies
    - Ensure proper access control

  2. Security
    - Master and admin can manage settings
    - All authenticated users can view settings
*/

-- Drop existing policies
DROP POLICY IF EXISTS "allow_read_custom" ON custom;
DROP POLICY IF EXISTS "allow_manage_custom" ON custom;

-- Re-enable RLS
ALTER TABLE custom ENABLE ROW LEVEL SECURITY;

-- Add new policies with proper role checks
CREATE POLICY "allow_read_custom"
  ON custom
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "allow_manage_custom"
  ON custom
  FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = ANY (ARRAY['master', 'admin'])
  )
  WITH CHECK (
    auth.jwt() ->> 'role' = ANY (ARRAY['master', 'admin'])
  );

-- Drop existing storage policies
DROP POLICY IF EXISTS "allow_read_system_images" ON storage.objects;
DROP POLICY IF EXISTS "allow_manage_system_images" ON storage.objects;

-- Create storage policies
CREATE POLICY "allow_read_system_images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'system-images');

CREATE POLICY "allow_manage_system_images"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'system-images' AND
    auth.jwt() ->> 'role' = ANY (ARRAY['master', 'admin'])
  )
  WITH CHECK (
    bucket_id = 'system-images' AND
    auth.jwt() ->> 'role' = ANY (ARRAY['master', 'admin'])
  );

-- Ensure default row exists
INSERT INTO custom (
  id,
  name,
  cnpj
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Sistema de Vendas',
  '12.345.678/0009-00'
) ON CONFLICT (id) DO NOTHING;