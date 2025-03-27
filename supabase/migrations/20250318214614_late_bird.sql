/*
  # Fix Users Table RLS Policies

  1. Changes
    - Drop existing policies
    - Add new policies with proper role checks
    - Fix permissions for user management
    - Ensure proper access control

  2. Security
    - Master can manage all users
    - Admin can manage non-master users
    - Users can view their own data
*/

-- Drop existing policies
DROP POLICY IF EXISTS "rls_users_select_own_20250316" ON users;
DROP POLICY IF EXISTS "rls_users_select_admin_20250316" ON users;
DROP POLICY IF EXISTS "rls_users_update_own_20250316" ON users;
DROP POLICY IF EXISTS "rls_users_manage_master_20250316" ON users;

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Add new policies with proper role checks
CREATE POLICY "rls_users_select_all_20250318"
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

CREATE POLICY "rls_users_insert_admin_20250318"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Master can insert any user
    auth.jwt()->>'role' = 'master'
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

CREATE POLICY "rls_users_update_admin_20250318"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    -- Users can update their own non-sensitive data
    auth.uid() = id
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
    -- Users can update their own non-sensitive data
    auth.uid() = id
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

CREATE POLICY "rls_users_delete_admin_20250318"
  ON users
  FOR DELETE
  TO authenticated
  USING (
    -- Master can delete any user
    auth.jwt()->>'role' = 'master'
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