/*
  # Fix company settings table and policies

  1. Changes
    - Drop old table and policies
    - Create new table with TEXT columns
    - Add proper RLS policies
    - Add trigger for updated_at
    - Insert default data

  2. Security
    - Master and admin can manage settings
    - All authenticated users can view settings
*/

-- Drop old table and its policies
DROP TABLE IF EXISTS company_info;

-- Create new table with proper column types
CREATE TABLE IF NOT EXISTS company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  cnpj text NOT NULL,
  address text,
  phone text,
  email text,
  website text,
  logo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "rls_company_settings_select_all_20250317" ON company_settings;
DROP POLICY IF EXISTS "rls_company_settings_manage_admin_20250317" ON company_settings;

-- Create updated_at trigger function
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

-- Add RLS policies with unique names
CREATE POLICY "rls_company_settings_select_all_20250317_v2"
  ON company_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "rls_company_settings_manage_admin_20250317_v2"
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
WHERE NOT EXISTS (SELECT 1 FROM company_settings LIMIT 1);