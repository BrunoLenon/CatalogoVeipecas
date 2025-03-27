/*
  # Fix storage policies for images

  1. Changes
    - Drop existing policies to avoid conflicts
    - Create bucket if not exists
    - Add new policies with proper checks
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read access for images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update their images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete their images" ON storage.objects;

-- Create bucket if not exists
insert into storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
values (
  'imagens',
  'imagens',
  true,
  false,
  52428800, -- 50MB
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[]
)
on conflict (id) do nothing;

-- Public read access policy
create policy "rls_storage_select_images_20250317"
on storage.objects
for select
to public
using (bucket_id = 'imagens');

-- Authenticated users upload policy
create policy "rls_storage_insert_images_20250317"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'imagens');

-- Authenticated users update policy
create policy "rls_storage_update_images_20250317"
on storage.objects
for update
to authenticated
using (bucket_id = 'imagens')
with check (bucket_id = 'imagens');

-- Authenticated users delete policy
create policy "rls_storage_delete_images_20250317"
on storage.objects
for delete
to authenticated
using (bucket_id = 'imagens');