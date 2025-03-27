/*
  # Criar tabela custom para configurações do sistema

  1. Estrutura
    - Tabela com linha única para configurações
    - Campos obrigatórios e opcionais
    - Validações de formato
    - Trigger para atualização automática de timestamp

  2. Campos Obrigatórios
    - name: Nome do sistema
    - cnpj: CNPJ da empresa
*/

-- Remover tabela se existir
DROP TABLE IF EXISTS custom CASCADE;

-- Criar nova tabela
CREATE TABLE custom (
  -- Identificação
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Informações básicas (obrigatórias)
  name text NOT NULL CHECK (length(trim(name)) > 0),
  cnpj text NOT NULL CHECK (length(trim(cnpj)) > 0),
  
  -- Informações de contato (opcionais)
  address text,
  phone text CHECK (
    phone IS NULL OR 
    phone ~ '^\+?[0-9()\-\s]+$'
  ),
  email text CHECK (
    email IS NULL OR 
    email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  ),
  website text CHECK (
    website IS NULL OR 
    website ~* '^https?://[^\s/$.?#].[^\s]*$'
  ),
  
  -- Mídia
  logo_url text CHECK (
    logo_url IS NULL OR 
    logo_url ~* '^https?://[^\s/$.?#].[^\s]*$'
  ),
  
  -- Metadados
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Garantir que só exista uma linha
  CONSTRAINT custom_single_row CHECK (id = '00000000-0000-0000-0000-000000000001')
);

-- Habilitar RLS
ALTER TABLE custom ENABLE ROW LEVEL SECURITY;

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_custom_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
CREATE TRIGGER custom_updated_at
  BEFORE UPDATE ON custom
  FOR EACH ROW
  EXECUTE FUNCTION update_custom_updated_at();

-- Políticas de acesso
CREATE POLICY "allow_read_custom"
  ON custom
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "allow_manage_custom"
  ON custom
  FOR ALL
  TO authenticated
  USING (
    COALESCE(NULLIF(current_setting('request.jwt.claims', true)::jsonb->>'role', ''), 'customer') IN ('master', 'admin')
  )
  WITH CHECK (
    COALESCE(NULLIF(current_setting('request.jwt.claims', true)::jsonb->>'role', ''), 'customer') IN ('master', 'admin')
  );

-- Inserir dados padrão
INSERT INTO custom (
  id,
  name,
  cnpj,
  address,
  phone,
  email,
  website,
  logo_url
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Sistema de Vendas',
  '12.345.678/0009-00',
  'Av. Exemplo, 1000 - Centro, Cidade - UF, 00000-000',
  '(00) 0000-0000',
  'contato@sistema.com.br',
  'https://www.sistema.com.br',
  'https://images.unsplash.com/photo-1560179707-f14e90ef3623?q=80&w=300'
);

-- Criar bucket para imagens do sistema se não existir
INSERT INTO storage.buckets (
  id,
  name,
  public,
  avif_autodetection,
  file_size_limit,
  allowed_mime_types
) VALUES (
  'system-images',
  'system-images',
  true,
  false,
  5242880, -- 5MB limit
  array['image/jpeg', 'image/png', 'image/webp']::text[]
) ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']::text[];

-- Políticas de storage
CREATE POLICY "allow_public_read_system_images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'system-images');

CREATE POLICY "allow_admin_manage_system_images"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'system-images' AND
    (auth.jwt() ->> 'role')::text IN ('master', 'admin')
  )
  WITH CHECK (
    bucket_id = 'system-images' AND
    (auth.jwt() ->> 'role')::text IN ('master', 'admin')
  );