/*
  # Fix Categories RLS Policies

  1. Security Updates
    - Fix RLS policies for categories table
    - Ensure proper access for master and admin roles
    - Allow read access for all authenticated users

  2. Changes
    - Drop existing policies to avoid conflicts
    - Create new policies with correct permissions
*/

-- Drop existing policies to avoid conflicts
drop policy if exists "Master and Admin can manage categories" on categories;
drop policy if exists "Authenticated users can view categories" on categories;

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