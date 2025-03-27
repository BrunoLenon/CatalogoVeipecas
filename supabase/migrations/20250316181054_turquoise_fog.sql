/*
  # Storage Policies for Images

  1. New Bucket
    - Create 'imagens' bucket for storing product images
    - Set size limit to 50MB
    - Allow only image file types

  2. Security
    - Enable public read access
    - Allow authenticated users to upload/manage files
    - Set proper RLS policies
*/

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
create policy "Public read access for images"
on storage.objects
for select
to public
using (bucket_id = 'imagens');

-- Authenticated users upload policy
create policy "Authenticated users can upload images"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'imagens');

-- Authenticated users update policy
create policy "Authenticated users can update their images"
on storage.objects
for update
to authenticated
using (bucket_id = 'imagens')
with check (bucket_id = 'imagens');

-- Authenticated users delete policy
create policy "Authenticated users can delete their images"
on storage.objects
for delete
to authenticated
using (bucket_id = 'imagens');