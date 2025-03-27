/*
  # Criar nova tabela company_settings
  
  1. Mudanças
    - Criar nova tabela para configurações da empresa
    - Adicionar trigger para atualização automática do updated_at
    - Configurar políticas de acesso RLS
    - Migrar dados existentes se houver
  
  2. Segurança
    - Leitura permitida para todos usuários autenticados
    - Inserção, atualização e exclusão apenas para master e admin
*/

-- Criar nova tabela
CREATE TABLE IF NOT EXISTS company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  cnpj text NOT NULL,
  address text,
  phone varchar,
  email varchar,
  website varchar,
  logo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_company_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para atualizar updated_at
CREATE TRIGGER company_settings_updated_at
  BEFORE UPDATE ON company_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_company_settings_updated_at();

-- Adicionar políticas de acesso
-- Leitura para todos autenticados
CREATE POLICY "rls_company_settings_select_all_20250317"
  ON company_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Gerenciamento apenas para master e admin
CREATE POLICY "rls_company_settings_manage_admin_20250317"
  ON company_settings
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' IN ('master', 'admin'))
  WITH CHECK (auth.jwt() ->> 'role' IN ('master', 'admin'));

-- Migrar dados da tabela antiga se existirem
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'company_info'
  ) THEN
    INSERT INTO company_settings (
      name,
      cnpj,
      address,
      phone,
      email,
      website,
      logo_url
    )
    SELECT 
      name,
      cnpj,
      address,
      phone,
      email,
      website,
      logo_url
    FROM company_info
    WHERE NOT EXISTS (SELECT 1 FROM company_settings LIMIT 1);
  END IF;
END $$;

-- Inserir dados padrão se não existirem dados
INSERT INTO company_settings (
  name,
  cnpj,
  address,
  phone,
  email,
  website,
  logo_url
)
SELECT
  'Empresa Modelo LTDA',
  '00.000.000/0001-00',
  'Av. Exemplo, 1000 - Centro, Cidade - UF, 00000-000',
  '(00) 0000-0000',
  'contato@empresa-modelo.com.br',
  'https://www.empresa-modelo.com.br',
  'https://images.unsplash.com/photo-1560179707-f14e90ef3623?q=80&w=300'
WHERE NOT EXISTS (SELECT 1 FROM company_settings LIMIT 1);