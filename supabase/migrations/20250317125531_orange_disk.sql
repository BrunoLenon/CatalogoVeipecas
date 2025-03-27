/*
  # Add Default Company Information

  1. Changes
    - Adds a function to insert default company information if none exists
    - Inserts sample company data for initial setup

  2. Notes
    - Only inserts if no company info exists
    - Uses safe defaults for all fields
*/

-- Function to insert default company info if none exists
CREATE OR REPLACE FUNCTION insert_default_company_info()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM company_info LIMIT 1) THEN
    INSERT INTO company_info (
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
END;
$$;

-- Execute the function
SELECT insert_default_company_info();