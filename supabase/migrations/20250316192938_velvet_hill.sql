/*
  # Update Categories RLS Policies

  1. Changes
    - Drop existing policies to avoid conflicts
    - Create new policy for MASTER role to manage categories
    - Create new policy for authenticated users to view categories

  2. Security
    - Only MASTER role can create/update/delete categories
    - All authenticated users can view categories
*/

-- Drop existing policies to avoid conflicts
drop policy if exists "Master can manage categories" on categories;
drop policy if exists "Authenticated users can view categories" on categories;

-- Categories Policies
create policy "Master can manage categories"
  on categories
  for all
  to authenticated
  using ((auth.jwt() ->> 'role'::text) = 'master')
  with check ((auth.jwt() ->> 'role'::text) = 'master');

create policy "Authenticated users can view categories"
  on categories
  for select
  to authenticated
  using (true);