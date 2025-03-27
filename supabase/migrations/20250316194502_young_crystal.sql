/*
  # Ajustes de RLS para company_info e cart

  1. Políticas
    - Adiciona políticas RLS para company_info permitindo:
      - Leitura pública
      - Gerenciamento apenas por master e admin
    - Adiciona política para criar carrinho automaticamente

  2. Funções
    - Adiciona função para criar carrinho automaticamente quando não existir
*/

-- Habilitar RLS para company_info
ALTER TABLE company_info ENABLE ROW LEVEL SECURITY;

-- Política de leitura pública para company_info
CREATE POLICY "Permitir leitura pública de company_info"
  ON company_info
  FOR SELECT
  TO authenticated
  USING (true);

-- Política para gerenciamento de company_info (master e admin)
CREATE POLICY "Apenas master e admin podem gerenciar company_info"
  ON company_info
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' IN ('master', 'admin'))
  WITH CHECK (auth.jwt() ->> 'role' IN ('master', 'admin'));

-- Função para criar carrinho automaticamente
CREATE OR REPLACE FUNCTION public.get_or_create_cart(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cart_id uuid;
BEGIN
  -- Tentar encontrar carrinho existente não finalizado
  SELECT id INTO v_cart_id
  FROM cart
  WHERE user_id = p_user_id AND is_finalized = false
  LIMIT 1;

  -- Se não encontrar, criar novo carrinho
  IF v_cart_id IS NULL THEN
    INSERT INTO cart (user_id, items, total)
    VALUES (p_user_id, '[]'::jsonb, 0)
    RETURNING id INTO v_cart_id;
  END IF;

  RETURN v_cart_id;
END;
$$;