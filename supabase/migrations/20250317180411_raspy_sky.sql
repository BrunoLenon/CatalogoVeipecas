/*
  # Revert Company Info Changes

  1. Changes
    - Drop all existing policies
    - Add back basic policies for company info
    - Simplify storage policies
    - Keep essential triggers and constraints

  2. Security
    - Master and admin can manage company info
    - All authenticated users can view company info
    - Basic storage access for images
*/

-- Drop ALL existing policies
DROP POLICY IF EXISTS "company_info_select_all" ON company_info;
DROP POLICY IF EXISTS "company_info_insert_admin" ON company_info;
DROP POLICY IF EXISTS "company_info_update_admin" ON company_info;
DROP POLICY IF EXISTS "company_info_delete_admin" ON company_info;
DROP POLICY IF EXISTS "rls_company_info_select_all_20250317" ON company_info;
DROP POLICY IF EXISTS "rls_company_info_manage_admin_20250317" ON company_info;
DROP POLICY IF EXISTS "rls_company_info_select_all_20250317_v2" ON company_info;
DROP POLICY IF EXISTS "rls_company_info_insert_admin_20250317_v2" ON company_info;
DROP POLICY IF EXISTS "rls_company_info_update_admin_20250317_v2" ON company_info;
DROP POLICY IF EXISTS "rls_company_info_delete_admin_20250317_v2" ON company_info;
DROP POLICY IF EXISTS "rls_company_info_select_all_20250317_v3" ON company_info;
DROP POLICY IF EXISTS "rls_company_info_insert_admin_20250317_v3" ON company_info;
DROP POLICY IF EXISTS "rls_company_info_update_admin_20250317_v3" ON company_info;
DROP POLICY IF EXISTS "rls_company_info_delete_admin_20250317_v3" ON company_info;
DROP POLICY IF EXISTS "rls_company_info_select_all_20250317_v4" ON company_info;
DROP POLICY IF EXISTS "rls_company_info_insert_admin_20250317_v4" ON company_info;
DROP POLICY IF EXISTS "rls_company_info_update_admin_20250317_v4" ON company_info;
DROP POLICY IF EXISTS "rls_company_info_delete_admin_20250317_v4" ON company_info;

-- Drop ALL storage policies
DROP POLICY IF EXISTS "rls_storage_select_images_20250317" ON storage.objects;
DROP POLICY IF EXISTS "rls_storage_insert_images_20250317" ON storage.objects;
DROP POLICY IF EXISTS "rls_storage_update_images_20250317" ON storage.objects;
DROP POLICY IF EXISTS "rls_storage_delete_images_20250317" ON storage.objects;
DROP POLICY IF EXISTS "rls_storage_select_images_20250317_v2" ON storage.objects;
DROP POLICY IF EXISTS "rls_storage_insert_images_20250317_v2" ON storage.objects;
DROP POLICY IF EXISTS "rls_storage_update_images_20250317_v2" ON storage.objects;
DROP POLICY IF EXISTS "rls_storage_delete_images_20250317_v2" ON storage.objects;
DROP POLICY IF EXISTS "rls_storage_select_images_20250317_v3" ON storage.objects;
DROP POLICY IF EXISTS "rls_storage_insert_images_20250317_v3" ON storage.objects;
DROP POLICY IF EXISTS "rls_storage_update_images_20250317_v3" ON storage.objects;
DROP POLICY IF EXISTS "rls_storage_delete_images_20250317_v3" ON storage.objects;

-- Enable RLS
ALTER TABLE company_info ENABLE ROW LEVEL SECURITY;

-- Add simple policies for company_info
CREATE POLICY "allow_read_company_info"
  ON company_info
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "allow_manage_company_info"
  ON company_info
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' IN ('master', 'admin'))
  WITH CHECK (auth.jwt() ->> 'role' IN ('master', 'admin'));

-- Ensure storage bucket exists
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'imagens',
  'imagens',
  true,
  false,
  52428800, -- 50MB
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Add simple storage policies
CREATE POLICY "allow_public_read_images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'imagens');

CREATE POLICY "allow_authenticated_manage_images"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'imagens')
WITH CHECK (bucket_id = 'imagens');