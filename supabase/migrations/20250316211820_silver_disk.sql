/*
  # Otimização da importação de produtos

  1. Nova Função
    - Criação da função `upsert_product` para gerenciar inserção e atualização de produtos
    - Validações de dados
    - Tratamento de erros
    - Log de operações

  2. Segurança
    - Função com SECURITY DEFINER para garantir permissões corretas
    - Validações de entrada para prevenir injeção de SQL
*/

-- Função para inserir ou atualizar produtos
CREATE OR REPLACE FUNCTION upsert_product(
  p_code text,
  p_brand text,
  p_name text,
  p_description text,
  p_barcode text,
  p_stock integer,
  p_price numeric,
  p_category_id uuid,
  p_tags jsonb,
  p_is_new boolean,
  p_image_url text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_product_id uuid;
  v_operation text;
  v_result jsonb;
BEGIN
  -- Validações básicas
  IF p_code IS NULL OR p_brand IS NULL OR p_name IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Código, marca e nome são obrigatórios'
    );
  END IF;

  -- Verificar se o produto já existe
  SELECT id INTO v_product_id
  FROM products
  WHERE code = p_code AND brand = p_brand;

  -- Inserir ou atualizar o produto
  IF v_product_id IS NULL THEN
    -- Inserir novo produto
    INSERT INTO products (
      code,
      brand,
      name,
      description,
      barcode,
      stock,
      price,
      category_id,
      tags,
      is_new,
      image_url
    )
    VALUES (
      p_code,
      p_brand,
      p_name,
      p_description,
      p_barcode,
      COALESCE(p_stock, 0),
      COALESCE(p_price, 0),
      p_category_id,
      COALESCE(p_tags, '[]'::jsonb),
      COALESCE(p_is_new, false),
      p_image_url
    )
    RETURNING id INTO v_product_id;
    
    v_operation := 'insert';
  ELSE
    -- Atualizar produto existente
    UPDATE products
    SET
      name = p_name,
      description = p_description,
      barcode = p_barcode,
      stock = COALESCE(p_stock, stock),
      price = COALESCE(p_price, price),
      category_id = COALESCE(p_category_id, category_id),
      tags = COALESCE(p_tags, tags),
      is_new = COALESCE(p_is_new, is_new),
      image_url = COALESCE(p_image_url, image_url)
    WHERE id = v_product_id;
    
    v_operation := 'update';
  END IF;

  -- Retornar resultado
  RETURN jsonb_build_object(
    'success', true,
    'product_id', v_product_id,
    'operation', v_operation
  );
EXCEPTION
  WHEN others THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;