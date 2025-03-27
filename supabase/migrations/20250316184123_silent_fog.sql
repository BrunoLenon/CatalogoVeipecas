/*
  # Adicionar políticas RLS para a tabela categories

  1. Segurança
    - Habilitar RLS na tabela categories
    - Adicionar política para admins gerenciarem categorias
    - Adicionar política para leitura pública de categorias
*/

-- Habilitar RLS
alter table categories enable row level security;

-- Política para admins gerenciarem categorias (CRUD completo)
create policy "Admins podem gerenciar categorias"
  on categories
  for all
  to authenticated
  using ((auth.jwt() ->> 'role'::text) = ANY (ARRAY['master'::text, 'admin'::text]));

-- Política para leitura pública de categorias (todos os usuários autenticados)
create policy "Leitura pública de categorias"
  on categories
  for select
  to authenticated
  using (true);