/*
  # Configuração de Storage e Políticas

  1. Buckets
    - Criar bucket 'products' para armazenamento de imagens de produtos
  
  2. Políticas
    - Permitir acesso público para leitura de arquivos
    - Restringir upload/delete para usuários autenticados
*/

-- Criar bucket products se não existir
insert into storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
values (
  'products',
  'products',
  true,
  false,
  52428800, -- 50MB
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[]
)
on conflict (id) do nothing;

-- Política para objetos (arquivos)
create policy "Acesso público para visualização de arquivos"
on storage.objects
for select
to public
using (bucket_id = 'products');

create policy "Usuários autenticados podem fazer upload de arquivos"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'products');

create policy "Usuários autenticados podem atualizar seus arquivos"
on storage.objects
for update
to authenticated
using (bucket_id = 'products')
with check (bucket_id = 'products');

create policy "Usuários autenticados podem deletar seus arquivos"
on storage.objects
for delete
to authenticated
using (bucket_id = 'products');