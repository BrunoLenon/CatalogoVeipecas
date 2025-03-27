/*
  # Sincronização de Dados do Usuário

  1. Funções
    - `sync_user_data`: Função para sincronizar dados entre users e auth.users
    - `update_user`: Função para atualizar dados do usuário mantendo a sincronização

  2. Triggers
    - Trigger para manter os dados sincronizados após updates na tabela users

  3. Notas
    - As funções são SECURITY DEFINER para garantir acesso ao schema auth
    - Inclui validações de permissões baseadas no papel do usuário
*/

-- Função para sincronizar dados do usuário
CREATE OR REPLACE FUNCTION sync_user_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Atualizar metadados no auth.users
  UPDATE auth.users
  SET 
    raw_user_meta_data = jsonb_build_object(
      'role', NEW.role,
      'name', NEW.name,
      'cnpj_cpf', NEW.cnpj_cpf,
      'seller_id', NEW.seller_id,
      'status', NEW.status
    ),
    email = NEW.email,
    updated_at = NOW()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- Função para atualizar usuário
CREATE OR REPLACE FUNCTION update_user(
  user_id uuid,
  user_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_role text;
  v_target_role text;
  v_result jsonb;
BEGIN
  -- Obter papel do usuário atual
  v_current_role := nullif(current_setting('request.jwt.claim.role', true), '')::text;
  
  -- Obter papel do usuário alvo
  SELECT role INTO v_target_role
  FROM users
  WHERE id = user_id;

  -- Validar permissões
  IF v_current_role = 'master' THEN
    -- Master pode atualizar qualquer usuário
    NULL;
  ELSIF v_current_role = 'admin' AND v_target_role NOT IN ('master', 'admin') THEN
    -- Admin pode atualizar apenas vendedores e clientes
    NULL;
  ELSIF user_id = auth.uid() THEN
    -- Usuário pode atualizar seus próprios dados básicos
    IF (user_data->>'role') IS NOT NULL OR (user_data->>'status') IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Não é permitido alterar papel ou status'
      );
    END IF;
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Sem permissão para atualizar este usuário'
    );
  END IF;

  -- Atualizar dados na tabela users
  UPDATE users
  SET
    name = COALESCE((user_data->>'name'), name),
    email = COALESCE((user_data->>'email'), email),
    role = COALESCE((user_data->>'role')::user_role, role),
    cnpj_cpf = COALESCE((user_data->>'cnpj_cpf'), cnpj_cpf),
    seller_id = COALESCE((user_data->>'seller_id')::uuid, seller_id),
    status = COALESCE((user_data->>'status')::boolean, status),
    avatar_url = COALESCE((user_data->>'avatar_url'), avatar_url)
  WHERE id = user_id
  RETURNING jsonb_build_object(
    'id', id,
    'name', name,
    'email', email,
    'role', role,
    'cnpj_cpf', cnpj_cpf,
    'seller_id', seller_id,
    'status', status,
    'avatar_url', avatar_url
  ) INTO v_result;

  RETURN jsonb_build_object(
    'success', true,
    'data', v_result
  );
EXCEPTION
  WHEN others THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Criar ou recriar trigger para sincronização
DROP TRIGGER IF EXISTS sync_user_data_trigger ON users;
CREATE TRIGGER sync_user_data_trigger
  AFTER UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_data();

-- Sincronizar dados existentes
DO $$
BEGIN
  UPDATE auth.users
  SET raw_user_meta_data = (
    SELECT jsonb_build_object(
      'role', role,
      'name', name,
      'cnpj_cpf', cnpj_cpf,
      'seller_id', seller_id,
      'status', status
    )
    FROM users
    WHERE users.id = auth.users.id
  )
  WHERE id IN (SELECT id FROM users);
END;
$$;