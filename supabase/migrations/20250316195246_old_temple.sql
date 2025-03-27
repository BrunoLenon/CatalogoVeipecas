/*
  # Correção de políticas RLS duplicadas

  1. Remover todas as políticas existentes
  2. Recriar políticas com nomes únicos
  3. Garantir que todas as tabelas tenham RLS habilitado
*/

-- Remover todas as políticas existentes
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Master and admin can view all users" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Master can manage all users" ON users;
DROP POLICY IF EXISTS "Anyone can view products" ON products;
DROP POLICY IF EXISTS "Master and admin can manage products" ON products;
DROP POLICY IF EXISTS "Anyone can view categories" ON categories;
DROP POLICY IF EXISTS "Master and admin can manage categories" ON categories;
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Users can create orders" ON orders;
DROP POLICY IF EXISTS "Users can update own orders" ON orders;
DROP POLICY IF EXISTS "Users can manage own cart" ON cart;
DROP POLICY IF EXISTS "Anyone can view company info" ON company_info;
DROP POLICY IF EXISTS "Master and admin can manage company info" ON company_info;
DROP POLICY IF EXISTS "Master and admin can update company info" ON company_info;
DROP POLICY IF EXISTS "Users can manage own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Master and admin can manage all images" ON storage.objects;

-- Garantir que RLS está habilitado em todas as tabelas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_info ENABLE ROW LEVEL SECURITY;

-- Políticas para Users
CREATE POLICY "users_select_own" ON users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "users_select_admin" ON users
  FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'role' IN ('master', 'admin'));

CREATE POLICY "users_update_own" ON users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users_manage_master" ON users
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'master')
  WITH CHECK (auth.jwt() ->> 'role' = 'master');

-- Políticas para Products
CREATE POLICY "products_select_all" ON products
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "products_manage_admin" ON products
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' IN ('master', 'admin'))
  WITH CHECK (auth.jwt() ->> 'role' IN ('master', 'admin'));

-- Políticas para Categories
CREATE POLICY "categories_select_all" ON categories
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "categories_manage_admin" ON categories
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' IN ('master', 'admin'))
  WITH CHECK (auth.jwt() ->> 'role' IN ('master', 'admin'));

-- Políticas para Orders
CREATE POLICY "orders_select_own" ON orders
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR 
    seller_id = auth.uid() OR 
    auth.jwt() ->> 'role' IN ('master', 'admin')
  );

CREATE POLICY "orders_insert_own" ON orders
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "orders_update_own" ON orders
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

-- Políticas para Cart
CREATE POLICY "cart_manage_own" ON cart
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Políticas para Company Info
CREATE POLICY "company_info_select_all" ON company_info
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "company_info_insert_admin" ON company_info
  FOR INSERT TO authenticated
  WITH CHECK (auth.jwt() ->> 'role' IN ('master', 'admin'));

CREATE POLICY "company_info_update_admin" ON company_info
  FOR UPDATE TO authenticated
  USING (auth.jwt() ->> 'role' IN ('master', 'admin'))
  WITH CHECK (auth.jwt() ->> 'role' IN ('master', 'admin'));

-- Políticas para Storage
CREATE POLICY "storage_manage_avatars" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'user-avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'user-avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "storage_manage_admin" ON storage.objects
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' IN ('master', 'admin'))
  WITH CHECK (auth.jwt() ->> 'role' IN ('master', 'admin'));