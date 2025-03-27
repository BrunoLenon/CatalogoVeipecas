/*
  # Fix Categories RLS Policies

  1. Security
    - Drop existing policies to avoid conflicts
    - Re-enable RLS on categories table
    - Add policy for admins to manage categories
    - Add policy for public read access
*/

-- Drop existing policies if they exist
drop policy if exists "Admins podem gerenciar categorias" on categories;
drop policy if exists "Leitura pública de categorias" on categories;
drop policy if exists "Admins can manage categories" on categories;
drop policy if exists "Public read access to categories" on categories;

-- Enable RLS
alter table categories enable row level security;

-- Policy for admins to manage categories (CRUD)
create policy "Admins can manage categories"
  on categories
  for all
  to authenticated
  using ((auth.jwt() ->> 'role'::text) in ('master', 'admin'))
  with check ((auth.jwt() ->> 'role'::text) in ('master', 'admin'));

-- Policy for public read access
create policy "Public read access to categories"
  on categories
  for select
  to authenticated
  using (true);