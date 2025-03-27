-- Drop existing policies
DROP POLICY IF EXISTS "rls_users_select_all_20250318" ON users;
DROP POLICY IF EXISTS "rls_users_select_own_20250316" ON users;
DROP POLICY IF EXISTS "rls_users_select_admin_20250316" ON users;
DROP POLICY IF EXISTS "rls_users_update_own_20250316" ON users;
DROP POLICY IF EXISTS "rls_users_manage_master_20250316" ON users;
DROP POLICY IF EXISTS "rls_users_insert_admin_20250318" ON users;
DROP POLICY IF EXISTS "rls_users_update_admin_20250318" ON users;
DROP POLICY IF EXISTS "rls_users_delete_admin_20250318" ON users;

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Add new policies with proper role checks and unique names
CREATE POLICY "rls_users_select_all_20250318_v2"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    -- Users can view their own data
    auth.uid() = id
    -- Master and admin can view all users
    OR auth.jwt()->>'role' IN ('master', 'admin')
    -- Sellers can view their customers
    OR (
      auth.jwt()->>'role' = 'seller' 
      AND role = 'customer' 
      AND seller_id = auth.uid()
    )
  );

CREATE POLICY "rls_users_insert_admin_20250318_v2"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Service role can insert any user
    auth.role() = 'service_role'
    -- Master can insert any user
    OR auth.jwt()->>'role' = 'master'
    -- Admin can insert non-master users
    OR (
      auth.jwt()->>'role' = 'admin' 
      AND role != 'master'
    )
    -- Sellers can insert customers assigned to them
    OR (
      auth.jwt()->>'role' = 'seller'
      AND role = 'customer'
      AND seller_id = auth.uid()
    )
  );

CREATE POLICY "rls_users_update_admin_20250318_v2"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    -- Service role can update any user
    auth.role() = 'service_role'
    -- Users can update their own data
    OR auth.uid() = id
    -- Master can update any user
    OR auth.jwt()->>'role' = 'master'
    -- Admin can update non-master users
    OR (
      auth.jwt()->>'role' = 'admin' 
      AND role != 'master'
    )
    -- Sellers can update their customers
    OR (
      auth.jwt()->>'role' = 'seller'
      AND role = 'customer'
      AND seller_id = auth.uid()
    )
  )
  WITH CHECK (
    -- Service role can update any user
    auth.role() = 'service_role'
    -- Users can update their own data
    OR auth.uid() = id
    -- Master can update any user
    OR auth.jwt()->>'role' = 'master'
    -- Admin can update non-master users
    OR (
      auth.jwt()->>'role' = 'admin' 
      AND role != 'master'
    )
    -- Sellers can update their customers
    OR (
      auth.jwt()->>'role' = 'seller'
      AND role = 'customer'
      AND seller_id = auth.uid()
    )
  );

CREATE POLICY "rls_users_delete_admin_20250318_v2"
  ON users
  FOR DELETE
  TO authenticated
  USING (
    -- Service role can delete any user
    auth.role() = 'service_role'
    -- Master can delete any user
    OR auth.jwt()->>'role' = 'master'
    -- Admin can delete non-master users
    OR (
      auth.jwt()->>'role' = 'admin' 
      AND role != 'master'
    )
    -- Sellers can delete their customers
    OR (
      auth.jwt()->>'role' = 'seller'
      AND role = 'customer'
      AND seller_id = auth.uid()
    )
  );