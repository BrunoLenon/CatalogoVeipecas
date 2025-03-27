/*
  # Security improvements for cart and auth functions

  1. Changes
    - Add SECURITY INVOKER to cart functions
    - Add explicit auth checks
    - Add rate limiting for auth functions
    - Improve error handling
*/

-- Drop existing function
DROP FUNCTION IF EXISTS public.get_or_create_cart;

-- Recreate with security improvements
CREATE OR REPLACE FUNCTION public.get_or_create_cart(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_cart_id uuid;
  v_user_id uuid;
BEGIN
  -- Verificar se o usuário está autenticado
  v_user_id := auth.uid();
  
  -- Verificar se o usuário está tentando acessar seu próprio carrinho
  IF v_user_id IS NULL OR v_user_id != p_user_id THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  -- Tentar encontrar carrinho existente não finalizado
  SELECT id INTO v_cart_id
  FROM cart
  WHERE user_id = p_user_id 
    AND is_finalized = false
  LIMIT 1;

  -- Se não encontrar, criar novo carrinho
  IF v_cart_id IS NULL THEN
    INSERT INTO cart (user_id, items, total)
    VALUES (p_user_id, '[]'::jsonb, 0)
    RETURNING id INTO v_cart_id;
  END IF;

  RETURN v_cart_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao acessar carrinho: %', SQLERRM;
END;
$$;

-- Criar função para rate limiting
CREATE OR REPLACE FUNCTION auth.check_rate_limit(
  p_user_id text,
  p_action text,
  p_max_attempts integer DEFAULT 5,
  p_window_minutes integer DEFAULT 30
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_attempts integer;
BEGIN
  -- Limpar tentativas antigas
  DELETE FROM auth.rate_limits
  WHERE user_id = p_user_id
    AND action = p_action
    AND attempt_time < NOW() - (p_window_minutes || ' minutes')::interval;

  -- Contar tentativas recentes
  SELECT COUNT(*) INTO v_attempts
  FROM auth.rate_limits
  WHERE user_id = p_user_id
    AND action = p_action
    AND attempt_time >= NOW() - (p_window_minutes || ' minutes')::interval;

  -- Verificar limite
  IF v_attempts >= p_max_attempts THEN
    RETURN false;
  END IF;

  -- Registrar nova tentativa
  INSERT INTO auth.rate_limits (user_id, action, attempt_time)
  VALUES (p_user_id, p_action, NOW());

  RETURN true;
END;
$$;

-- Criar tabela para rate limiting se não existir
CREATE TABLE IF NOT EXISTS auth.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  action text NOT NULL,
  attempt_time timestamptz NOT NULL DEFAULT now()
);

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action
  ON auth.rate_limits (user_id, action, attempt_time);

-- Adicionar política RLS para rate_limits
ALTER TABLE auth.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Apenas serviço pode acessar rate limits"
  ON auth.rate_limits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);