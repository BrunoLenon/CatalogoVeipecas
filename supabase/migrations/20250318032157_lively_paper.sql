/*
  # Fix Company Settings Policies and Constraints

  1. Changes
    - Drop existing table and policies
    - Create new table with proper constraints
    - Add RLS policies with correct permissions
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

-- Add RLS policies
CREATE POLICY "rls_company_settings_select_all_20250318"
  ON company_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "rls_company_settings_insert_admin_20250318"
  ON company_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt() ->> 'role' IN ('master', 'admin')
  );

CREATE POLICY "rls_company_settings_update_admin_20250318"
  ON company_settings
  FOR UPDATE
  TO authenticated
  USING (
    auth.jwt() ->> 'role' IN ('master', 'admin')
  )
  WITH CHECK (
    auth.jwt() ->> 'role' IN ('master', 'admin')
  );

CREATE POLICY "rls_company_settings_delete_admin_20250318"
  ON company_settings
  FOR DELETE
  TO authenticated
  USING (
    auth.jwt() ->> 'role' IN ('master', 'admin')
  );

-- Insert default data
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