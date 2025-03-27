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
    auth.role() IN ('service_role') OR
    auth.jwt()->>'role' IN ('master', 'admin')
  )
  WITH CHECK (
    auth.role() IN ('service_role') OR
    auth.jwt()->>'role' IN ('master', 'admin')
  );

-- Ensure default row exists
INSERT INTO custom (
  id,
  name,
  cnpj,
  site_title
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Sistema de Vendas',
  '12.345.678/0009-00',
  'Sistema de Vendas'
) ON CONFLICT (id) DO UPDATE SET
  updated_at = now();