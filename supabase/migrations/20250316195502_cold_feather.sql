/*
  # Fix Categories RLS Policies

  1. Changes
    - Drop existing categories policies
    - Create new policies with proper permissions
    - Ensure master and admin can manage categories
    - Allow all authenticated users to view categories

  2. Security
    - Master and admin roles can manage (create, update, delete) categories
    - All authenticated users can view categories
*/

-- Drop existing categories policies
DROP POLICY IF EXISTS "rls_categories_select_all_20250316" ON categories;
DROP POLICY IF EXISTS "rls_categories_manage_admin_20250316" ON categories;

-- Create new policies for categories
CREATE POLICY "rls_categories_select_all_20250317"
  ON categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "rls_categories_insert_admin_20250317"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() ->> 'role' IN ('master', 'admin'));

CREATE POLICY "rls_categories_update_admin_20250317"
  ON categories FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'role' IN ('master', 'admin'))
  WITH CHECK (auth.jwt() ->> 'role' IN ('master', 'admin'));

CREATE POLICY "rls_categories_delete_admin_20250317"
  ON categories FOR DELETE
  TO authenticated
  USING (auth.jwt() ->> 'role' IN ('master', 'admin'));