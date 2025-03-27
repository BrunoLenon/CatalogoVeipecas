/*
  # Update Role-Based Permissions

  1. Security Updates
    - Implement role hierarchy:
      - Master: Full access to everything
      - Admin: Manage users (except Master), view/export data
      - Seller: Manage customers/orders, view products/categories
      - Customer: View products/categories, manage cart/orders

  2. Changes
    - Update RLS policies for all tables
    - Add specific role-based permissions
    - Ensure proper access control
*/

-- Drop existing policies
drop policy if exists "Admins can manage categories" on categories;
drop policy if exists "Public read access to categories" on categories;

drop policy if exists "Admins can manage products" on products;
drop policy if exists "Public read access to products" on products;

drop policy if exists "Users can manage own cart" on cart;

drop policy if exists "Users can read own orders" on orders;

drop policy if exists "Admins can manage users" on users;
drop policy if exists "Users can read own data" on users;

-- Categories Policies
create policy "Master and Admin can manage categories"
  on categories
  for all
  to authenticated
  using ((auth.jwt() ->> 'role'::text) in ('master', 'admin'))
  with check ((auth.jwt() ->> 'role'::text) in ('master', 'admin'));

create policy "Authenticated users can view categories"
  on categories
  for select
  to authenticated
  using (true);

-- Products Policies
create policy "Master can manage all products"
  on products
  for all
  to authenticated
  using ((auth.jwt() ->> 'role'::text) = 'master');

create policy "Admin can manage products"
  on products
  for all
  to authenticated
  using ((auth.jwt() ->> 'role'::text) = 'admin')
  with check ((auth.jwt() ->> 'role'::text) = 'admin');

create policy "Authenticated users can view products"
  on products
  for select
  to authenticated
  using (true);

-- Cart Policies
create policy "Users can manage own cart"
  on cart
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Orders Policies
create policy "Master can manage all orders"
  on orders
  for all
  to authenticated
  using ((auth.jwt() ->> 'role'::text) = 'master');

create policy "Admin can view and update orders"
  on orders
  for select
  to authenticated
  using ((auth.jwt() ->> 'role'::text) = 'admin');

create policy "Admin can update orders"
  on orders
  for update
  to authenticated
  using ((auth.jwt() ->> 'role'::text) = 'admin')
  with check ((auth.jwt() ->> 'role'::text) = 'admin');

create policy "Sellers can manage assigned orders"
  on orders
  for all
  to authenticated
  using (
    (auth.jwt() ->> 'role'::text) = 'seller' and
    (seller_id = auth.uid() or seller_id is null)
  )
  with check (
    (auth.jwt() ->> 'role'::text) = 'seller' and
    (seller_id = auth.uid() or seller_id is null)
  );

create policy "Customers can view and manage own orders"
  on orders
  for all
  to authenticated
  using (
    (auth.jwt() ->> 'role'::text) = 'customer' and
    user_id = auth.uid()
  )
  with check (
    (auth.jwt() ->> 'role'::text) = 'customer' and
    user_id = auth.uid()
  );

-- Users Policies
create policy "Master can manage all users"
  on users
  for all
  to authenticated
  using ((auth.jwt() ->> 'role'::text) = 'master');

create policy "Admin can manage non-master users"
  on users
  for all
  to authenticated
  using (
    (auth.jwt() ->> 'role'::text) = 'admin' and
    role != 'master'
  )
  with check (
    (auth.jwt() ->> 'role'::text) = 'admin' and
    role != 'master'
  );

create policy "Sellers can view and manage customers"
  on users
  for all
  to authenticated
  using (
    (auth.jwt() ->> 'role'::text) = 'seller' and
    role = 'customer' and
    seller_id = auth.uid()
  )
  with check (
    (auth.jwt() ->> 'role'::text) = 'seller' and
    role = 'customer' and
    seller_id = auth.uid()
  );

create policy "Users can read own data"
  on users
  for select
  to authenticated
  using (auth.uid() = id);

-- Storage Policies
create policy "Master can manage all files"
  on storage.objects
  for all
  to authenticated
  using ((auth.jwt() ->> 'role'::text) = 'master');

create policy "Admin can manage files"
  on storage.objects
  for all
  to authenticated
  using ((auth.jwt() ->> 'role'::text) = 'admin');

create policy "Public can view files"
  on storage.objects
  for select
  to public
  using (bucket_id in ('products', 'imagens'));