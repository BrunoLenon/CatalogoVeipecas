/*
  # Fix company_info table and policies

  1. Changes
    - Drop existing policies
    - Add new policies for proper access control
    - Add trigger for updated_at
    - Fix column constraints

  2. Security
    - Master and admin can manage company info
    - All authenticated users can view company info
*/

-- Drop existing policies
DROP POLICY IF EXISTS "rls_company_info_select_all_20250317" ON company_info;
DROP POLICY IF EXISTS "rls_company_info_manage_admin_20250317" ON company_info;

-- Enable RLS
ALTER TABLE company_info ENABLE ROW LEVEL SECURITY;

-- Fix column constraints
ALTER TABLE company_info 
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN cnpj SET NOT NULL,
  ALTER COLUMN address DROP NOT NULL,
  ALTER COLUMN phone DROP NOT NULL,
  ALTER COLUMN email DROP NOT NULL,
  ALTER COLUMN website DROP NOT NULL,
  ALTER COLUMN logo_url DROP NOT NULL;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_company_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS company_updated_at ON company_info;
CREATE TRIGGER company_updated_at
  BEFORE UPDATE ON company_info
  FOR EACH ROW
  EXECUTE FUNCTION update_company_updated_at();

-- Add new policies
CREATE POLICY "company_info_select_all"
  ON company_info
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "company_info_insert_admin"
  ON company_info
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() ->> 'role' IN ('master', 'admin'));

CREATE POLICY "company_info_update_admin"
  ON company_info
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'role' IN ('master', 'admin'))
  WITH CHECK (auth.jwt() ->> 'role' IN ('master', 'admin'));

CREATE POLICY "company_info_delete_admin"
  ON company_info
  FOR DELETE
  TO authenticated
  USING (auth.jwt() ->> 'role' IN ('master', 'admin'));