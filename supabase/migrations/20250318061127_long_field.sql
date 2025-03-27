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

CREATE POLICY "allow_insert_custom"
  ON custom
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() ->> 'role')::text IN ('master', 'admin')
  );

CREATE POLICY "allow_update_custom"
  ON custom
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() ->> 'role')::text IN ('master', 'admin')
  )
  WITH CHECK (
    (auth.jwt() ->> 'role')::text IN ('master', 'admin')
  );

CREATE POLICY "allow_delete_custom"
  ON custom
  FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() ->> 'role')::text IN ('master', 'admin')
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