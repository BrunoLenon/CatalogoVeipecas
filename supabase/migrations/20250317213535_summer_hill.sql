/*
  # Fix company_info policies

  1. Changes
    - Drop existing policies if they exist
    - Add new simplified policies
    - Fix storage policies
    - Add proper checks to avoid "already exists" errors

  2. Security
    - Master and admin can manage company info
    - All authenticated users can view company info
*/

-- Drop ALL existing policies
DO $$ 
BEGIN
  -- Drop company_info policies
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
  DROP POLICY IF EXISTS "allow_read_company_info" ON company_info;
  DROP POLICY IF EXISTS "allow_manage_company_info" ON company_info;

  -- Drop storage policies
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
  DROP POLICY IF EXISTS "allow_public_read_images" ON storage.objects;
  DROP POLICY IF EXISTS "allow_authenticated_manage_images" ON storage.objects;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Enable RLS
ALTER TABLE company_info ENABLE ROW LEVEL SECURITY;

-- Add company_info policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'company_info' AND policyname = 'rls_company_info_select_all_20250317_v5'
  ) THEN
    CREATE POLICY "rls_company_info_select_all_20250317_v5"
      ON company_info
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'company_info' AND policyname = 'rls_company_info_manage_admin_20250317_v5'
  ) THEN
    CREATE POLICY "rls_company_info_manage_admin_20250317_v5"
      ON company_info
      FOR ALL
      TO authenticated
      USING (auth.jwt() ->> 'role' IN ('master', 'admin'))
      WITH CHECK (auth.jwt() ->> 'role' IN ('master', 'admin'));
  END IF;
END $$;

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

-- Add storage policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'rls_storage_select_images_20250317_v5'
  ) THEN
    CREATE POLICY "rls_storage_select_images_20250317_v5"
      ON storage.objects
      FOR SELECT
      TO public
      USING (bucket_id = 'imagens');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'rls_storage_manage_images_20250317_v5'
  ) THEN
    CREATE POLICY "rls_storage_manage_images_20250317_v5"
      ON storage.objects
      FOR ALL
      TO authenticated
      USING (bucket_id = 'imagens')
      WITH CHECK (bucket_id = 'imagens');
  END IF;
END $$;