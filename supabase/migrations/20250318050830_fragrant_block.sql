-- Drop existing tables and types if they exist
DROP TABLE IF EXISTS company_info CASCADE;

-- Create new company_info table
CREATE TABLE company_info (
  -- Primary key and row limit
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  CONSTRAINT single_row CHECK (id = '00000000-0000-0000-0000-000000000001'),
  
  -- Basic information
  name text NOT NULL CHECK (length(trim(name)) > 0),
  cnpj text NOT NULL CHECK (length(trim(cnpj)) > 0),
  
  -- Contact information
  address text,
  phone text CHECK (phone IS NULL OR phone ~ '^\+?[0-9()\-\s]+$'),
  email text CHECK (
    email IS NULL OR 
    email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  ),
  website text CHECK (
    website IS NULL OR 
    website ~* '^https?://[^\s/$.?#].[^\s]*$'
  ),
  
  -- Media
  logo_url text CHECK (
    logo_url IS NULL OR 
    logo_url ~* '^https?://[^\s/$.?#].[^\s]*$'
  ),
  
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_company_info_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for timestamp update
CREATE TRIGGER update_company_info_timestamp
  BEFORE UPDATE ON company_info
  FOR EACH ROW
  EXECUTE FUNCTION update_company_info_timestamp();

-- Enable RLS
ALTER TABLE company_info ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow public read of company info"
  ON company_info
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow admin manage company info"
  ON company_info
  FOR ALL
  TO authenticated
  USING (
    COALESCE(NULLIF(current_setting('request.jwt.claims', true)::jsonb->>'role', ''), 'customer') IN ('master', 'admin')
  )
  WITH CHECK (
    COALESCE(NULLIF(current_setting('request.jwt.claims', true)::jsonb->>'role', ''), 'customer') IN ('master', 'admin')
  );

-- Insert default row with fixed ID
INSERT INTO company_info (
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
  'Empresa Modelo LTDA',
  '00.000.000/0001-00',
  'Av. Exemplo, 1000 - Centro, Cidade - UF, 00000-000',
  '(00) 0000-0000',
  'contato@empresa-modelo.com.br',
  'https://www.empresa-modelo.com.br',
  'https://images.unsplash.com/photo-1560179707-f14e90ef3623?q=80&w=300'
);