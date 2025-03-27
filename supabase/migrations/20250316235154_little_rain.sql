/*
  # Funções do Carrinho

  1. Funções
    - `add_to_cart`: Função para adicionar produto ao carrinho
    - `update_cart_total`: Função para atualizar o total do carrinho

  2. Notas
    - Validações de estoque
    - Atualização automática do total
    - Tratamento para produtos já existentes no carrinho
*/

-- Função para adicionar produto ao carrinho
CREATE OR REPLACE FUNCTION add_to_cart(
  p_user_id uuid,
  p_product_id uuid,
  p_quantity integer DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cart_id uuid;
  v_product record;
  v_cart_items jsonb;
  v_cart_total numeric;
  v_item_exists boolean := false;
BEGIN
  -- Validar quantidade
  IF p_quantity <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Quantidade deve ser maior que zero'
    );
  END IF;

  -- Buscar dados do produto
  SELECT id, name, price, stock, image_url
  INTO v_product
  FROM products
  WHERE id = p_product_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Produto não encontrado'
    );
  END IF;

  -- Verificar estoque
  IF v_product.stock < p_quantity THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Quantidade maior que o estoque disponível'
    );
  END IF;

  -- Obter ou criar carrinho
  SELECT id, items INTO v_cart_id, v_cart_items
  FROM cart
  WHERE user_id = p_user_id AND is_finalized = false;

  IF NOT FOUND THEN
    INSERT INTO cart (user_id, items, total)
    VALUES (p_user_id, '[]'::jsonb, 0)
    RETURNING id, items INTO v_cart_id, v_cart_items;
  END IF;

  -- Verificar se o produto já existe no carrinho
  SELECT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_cart_items) AS item
    WHERE (item->>'id')::uuid = p_product_id
  ) INTO v_item_exists;

  IF v_item_exists THEN
    -- Atualizar quantidade do item existente
    v_cart_items := (
      SELECT jsonb_agg(
        CASE
          WHEN (item->>'id')::uuid = p_product_id THEN
            jsonb_set(
              item,
              '{quantity}',
              to_jsonb(LEAST(v_product.stock, (item->>'quantity')::integer + p_quantity))
            )
          ELSE item
        END
      )
      FROM jsonb_array_elements(v_cart_items) AS item
    );
  ELSE
    -- Adicionar novo item
    v_cart_items := v_cart_items || jsonb_build_object(
      'id', v_product.id,
      'name', v_product.name,
      'price', v_product.price,
      'quantity', p_quantity,
      'stock', v_product.stock,
      'image_url', v_product.image_url
    );
  END IF;

  -- Calcular novo total
  SELECT COALESCE(SUM((item->>'price')::numeric * (item->>'quantity')::integer), 0)
  INTO v_cart_total
  FROM jsonb_array_elements(v_cart_items) AS item;

  -- Atualizar carrinho
  UPDATE cart
  SET
    items = v_cart_items,
    total = v_cart_total,
    saved_at = NOW()
  WHERE id = v_cart_id;

  RETURN jsonb_build_object(
    'success', true,
    'cart_id', v_cart_id,
    'total', v_cart_total,
    'items', v_cart_items
  );
EXCEPTION
  WHEN others THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;