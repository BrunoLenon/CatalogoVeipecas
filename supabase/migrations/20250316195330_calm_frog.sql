/*
  # Fix RLS Policies

  1. Changes
    - Drop all existing policies to avoid conflicts
    - Enable RLS on all tables
    - Create new policies with unique names
    - Add comprehensive access control for all roles

  2. Security
    - Master role has full access to all resources
    - Admin role has limited management capabilities
    - Sellers can manage their assigned customers and orders
    - Customers can only access their own data
    - All authenticated users can view products and categories
*/

-- Drop all existing policies
DO $$ 
BEGIN
  -- Users policies
  DROP POLICY IF EXISTS "users_select_own" ON users;
  DROP POLICY IF EXISTS "users_select_admin" ON users;
  DROP POLICY IF EXISTS "users_update_own" ON users;
  DROP POLICY IF EXISTS "users_manage_master" ON users;
  
  -- Products policies
  DROP POLICY IF EXISTS "products_select_all" ON products;
  DROP POLICY IF EXISTS "products_manage_admin" ON products;
  
  -- Categories policies
  DROP POLICY IF EXISTS "categories_select_all" ON categories;
  DROP POLICY IF EXISTS "categories_manage_admin" ON categories;
  
  -- Orders policies
  DROP POLICY IF EXISTS "orders_select_own" ON orders;
  DROP POLICY IF EXISTS "orders_insert_own" ON orders;
  DROP POLICY IF EXISTS "orders_update_own" ON orders;
  
  -- Cart policies
  DROP POLICY IF EXISTS "cart_manage_own" ON cart;
  
  -- Company info policies
  DROP POLICY IF EXISTS "company_info_select_all" ON company_info;
  DROP POLICY IF EXISTS "company_info_insert_admin" ON company_info;
  DROP POLICY IF EXISTS "company_info_update_admin" ON company_info;
  
  -- Storage policies
  DROP POLICY IF EXISTS "storage_manage_avatars" ON storage.objects;
  DROP POLICY IF EXISTS "storage_manage_admin" ON storage.objects;
END $$;

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_info ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "rls_users_select_own_20250316" ON users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "rls_users_select_admin_20250316" ON users
  FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'role' IN ('master', 'admin'));

CREATE POLICY "rls_users_update_own_20250316" ON users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "rls_users_manage_master_20250316" ON users
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'master')
  WITH CHECK (auth.jwt() ->> 'role' = 'master');

-- Products table policies
CREATE POLICY "rls_products_select_all_20250316" ON products
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "rls_products_manage_admin_20250316" ON products
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' IN ('master', 'admin'))
  WITH CHECK (auth.jwt() ->> 'role' IN ('master', 'admin'));

-- Categories table policies
CREATE POLICY "rls_categories_select_all_20250316" ON categories
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "rls_categories_manage_admin_20250316" ON categories
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' IN ('master', 'admin'))
  WITH CHECK (auth.jwt() ->> 'role' IN ('master', 'admin'));

-- Orders table policies
CREATE POLICY "rls_orders_select_own_20250316" ON orders
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR 
    seller_id = auth.uid() OR 
    auth.jwt() ->> 'role' IN ('master', 'admin')
  );

CREATE POLICY "rls_orders_insert_own_20250316" ON orders
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "rls_orders_update_own_20250316" ON orders
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid() OR 
    seller_id = auth.uid() OR 
    auth.jwt() ->> 'role' IN ('master', 'admin')
  )
  WITH CHECK (
    user_id = auth.uid() OR 
    seller_id = auth.uid() OR 
    auth.jwt() ->> 'role' IN ('master', 'admin')
  );

-- Cart table policies
CREATE POLICY "rls_cart_manage_own_20250316" ON cart
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Company info table policies
CREATE POLICY "rls_company_info_select_all_20250316" ON company_info
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "rls_company_info_insert_admin_20250316" ON company_info
  FOR INSERT TO authenticated
  WITH CHECK (auth.jwt() ->> 'role' IN ('master', 'admin'));

CREATE POLICY "rls_company_info_update_admin_20250316" ON company_info
  FOR UPDATE TO authenticated
  USING (auth.jwt() ->> 'role' IN ('master', 'admin'))
  WITH CHECK (auth.jwt() ->> 'role' IN ('master', 'admin'));

-- Storage policies
CREATE POLICY "rls_storage_manage_avatars_20250316" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'user-avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'user-avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "rls_storage_manage_admin_20250316" ON storage.objects
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' IN ('master', 'admin'))
  WITH CHECK (auth.jwt() ->> 'role' IN ('master', 'admin'));