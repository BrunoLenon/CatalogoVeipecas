/*
  # Fix User Role Type and RLS Policies

  1. Changes
    - Create user_role type if not exists
    - Update RLS policies to use proper role checks
    - Fix company settings table and policies

  2. Security
    - Ensure proper role type exists
    - Fix role checks in policies
*/

-- Create user_role type if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('master', 'admin', 'seller', 'customer');
  END IF;
END $$;

-- Drop existing policies
DROP POLICY IF EXISTS "allow_read_company_settings" ON company_settings;
DROP POLICY IF EXISTS "allow_manage_company_settings" ON company_settings;

-- Drop and recreate table to ensure clean state
DROP TABLE IF EXISTS company_settings;
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
  -- Ensure only one row exists
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

-- Add RLS policies with proper role checks
CREATE POLICY "allow_read_company_settings"
  ON company_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "allow_manage_company_settings"
  ON company_settings
  FOR ALL
  TO authenticated
  USING (
    (current_setting('request.jwt.claims', true)::jsonb->>'role')::user_role IN ('master', 'admin')
  )
  WITH CHECK (
    (current_setting('request.jwt.claims', true)::jsonb->>'role')::user_role IN ('master', 'admin')
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