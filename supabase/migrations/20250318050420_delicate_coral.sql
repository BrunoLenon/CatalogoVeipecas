-- Remover tabela e políticas existentes
DROP TABLE IF EXISTS company_settings CASCADE;

-- Criar nova tabela otimizada
CREATE TABLE company_settings (
  -- Identificação
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Informações básicas (obrigatórias)
  name text NOT NULL CHECK (length(trim(name)) > 0),
  cnpj text NOT NULL CHECK (length(trim(cnpj)) > 0),
  
  -- Informações de contato (opcionais)
  address text,
  phone text,
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
  CONSTRAINT company_settings_single_row UNIQUE (id),
  
  -- Validações adicionais
  CONSTRAINT valid_phone CHECK (
    phone IS NULL OR 
    phone ~ '^\+?[0-9()\-\s]+$'
  )
);

-- Habilitar RLS
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Função para atualizar updated_at com validação
CREATE OR REPLACE FUNCTION update_company_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Validar campos obrigatórios
  IF length(trim(NEW.name)) = 0 THEN
    RAISE EXCEPTION 'Nome da empresa não pode estar vazio';
  END IF;
  
  IF length(trim(NEW.cnpj)) = 0 THEN
    RAISE EXCEPTION 'CNPJ não pode estar vazio';
  END IF;
  
  -- Atualizar timestamp
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
CREATE TRIGGER company_settings_updated_at
  BEFORE UPDATE ON company_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_company_settings_updated_at();

-- Políticas de acesso otimizadas
CREATE POLICY "allow_read_company_settings"
  ON company_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "allow_manage_company_settings"
  ON company_settings
  FOR ALL
  TO authenticated
  USING (
    COALESCE(
      NULLIF(current_setting('request.jwt.claims', true)::jsonb->>'role', ''),
      'customer'
    ) IN ('master', 'admin')
  )
  WITH CHECK (
    COALESCE(
      NULLIF(current_setting('request.jwt.claims', true)::jsonb->>'role', ''),
      'customer'
    ) IN ('master', 'admin')
  );

-- Inserir dados padrão com validação
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM company_settings) THEN
    INSERT INTO company_settings (
      name,
      cnpj,
      address,
      phone,
      email,
      website,
      logo_url
    ) VALUES (
      'Empresa Modelo LTDA',
      '00.000.000/0001-00',
      'Av. Exemplo, 1000 - Centro, Cidade - UF, 00000-000',
      '(00) 0000-0000',
      'contato@empresa-modelo.com.br',
      'https://www.empresa-modelo.com.br',
      'https://images.unsplash.com/photo-1560179707-f14e90ef3623?q=80&w=300'
    );
  END IF;
END $$;