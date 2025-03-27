/*
  # Update Categories RLS Policies

  1. Security Updates
    - Only MASTER role can create/update/delete categories
    - All authenticated users can view categories

  2. Changes
    - Drop existing policies to avoid conflicts
    - Create new policy for MASTER role management
    - Create new policy for authenticated users read access
*/

-- Drop existing policies to avoid conflicts
drop policy if exists "Master and Admin can manage categories" on categories;
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