/*
  # Fix Company Settings Table and Policies

  1. Changes
    - Drop existing table and policies
    - Create new table with proper constraints
    - Add RLS policies for proper access control
    - Add trigger for updated_at
    - Insert default data

  2. Security
    - Master and admin can manage settings
    - All authenticated users can view settings
*/

-- Drop existing table if exists
DROP TABLE IF EXISTS company_settings;

-- Create new table with proper constraints
CREATE TABLE company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  cnpj text NOT NULL,
  address text,
  phone text,
  email text,
  website text,
  logo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  -- Ensure only one row can exist
  CONSTRAINT company_settings_single_row UNIQUE (id)
);

-- Enable RLS
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_company_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS company_settings_updated_at ON company_settings;
CREATE TRIGGER company_settings_updated_at
  BEFORE UPDATE ON company_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_company_settings_updated_at();

-- Add RLS policies
CREATE POLICY "rls_company_settings_select_all_20250317_v6"
  ON company_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "rls_company_settings_manage_admin_20250317_v6"
  ON company_settings
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' IN ('master', 'admin'))
  WITH CHECK (auth.jwt() ->> 'role' IN ('master', 'admin'));

-- Insert default data if table is empty
INSERT INTO company_settings (
  name,
  cnpj,
  address,
  phone,
  email,
  website,
  logo_url
)
SELECT
  'Empresa Modelo LTDA',
  '00.000.000/0001-00',
  'Av. Exemplo, 1000 - Centro, Cidade - UF, 00000-000',
  '(00) 0000-0000',
  'contato@empresa-modelo.com.br',
  'https://www.empresa-modelo.com.br',
  'https://images.unsplash.com/photo-1560179707-f14e90ef3623?q=80&w=300'
WHERE NOT EXISTS (SELECT 1 FROM company_settings);

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
CREATE POLICY "rls_storage_select_images_20250317_v6"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'imagens');

CREATE POLICY "rls_storage_manage_images_20250317_v6"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'imagens' AND
  (auth.jwt() ->> 'role' IN ('master', 'admin'))
)
WITH CHECK (
  bucket_id = 'imagens' AND
  (auth.jwt() ->> 'role' IN ('master', 'admin'))
);