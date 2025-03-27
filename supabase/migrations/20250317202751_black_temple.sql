/*
  # Update add_to_cart function

  1. Changes
    - Remove stock quantity validation from add_to_cart function
    - Allow any quantity to be added to cart regardless of stock
    - Keep all other validations and functionality intact

  2. Security
    - Maintain existing RLS policies
    - Function remains security definer
*/

-- Drop existing function
DROP FUNCTION IF EXISTS add_to_cart;

-- Recreate function without stock validation
CREATE OR REPLACE FUNCTION add_to_cart(
  p_user_id uuid,
  p_product_id uuid,
  p_quantity integer
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
  v_item_exists boolean;
  v_updated_items jsonb;
  v_total numeric(10,2);
BEGIN
  -- Validate inputs
  IF p_quantity < 1 THEN
    RETURN json_build_object('success', false, 'error', 'Quantidade deve ser maior que zero');
  END IF;

  -- Get product details
  SELECT id, name, price, image_url INTO v_product
  FROM products
  WHERE id = p_product_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Produto não encontrado');
  END IF;

  -- Get or create cart
  SELECT id, items INTO v_cart_id, v_cart_items
  FROM cart
  WHERE user_id = p_user_id AND is_finalized = false;

  IF NOT FOUND THEN
    INSERT INTO cart (user_id, items, total)
    VALUES (p_user_id, '[]'::jsonb, 0)
    RETURNING id, items INTO v_cart_id, v_cart_items;
  END IF;

  -- Check if product already exists in cart
  SELECT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_cart_items) AS item
    WHERE (item->>'id')::uuid = p_product_id
  ) INTO v_item_exists;

  -- Update cart items
  IF v_item_exists THEN
    -- Update existing item quantity
    v_updated_items := (
      SELECT jsonb_agg(
        CASE
          WHEN (item->>'id')::uuid = p_product_id THEN
            jsonb_build_object(
              'id', item->>'id',
              'name', v_product.name,
              'quantity', p_quantity,
              'price', v_product.price,
              'image_url', v_product.image_url
            )
          ELSE item
        END
      )
      FROM jsonb_array_elements(v_cart_items) AS item
    );
  ELSE
    -- Add new item
    v_updated_items := v_cart_items || jsonb_build_object(
      'id', v_product.id,
      'name', v_product.name,
      'quantity', p_quantity,
      'price', v_product.price,
      'image_url', v_product.image_url
    );
  END IF;

  -- Calculate new total
  SELECT COALESCE(SUM((item->>'price')::numeric * (item->>'quantity')::integer), 0)
  INTO v_total
  FROM jsonb_array_elements(v_updated_items) AS item;

  -- Update cart
  UPDATE cart
  SET 
    items = v_updated_items,
    total = v_total,
    saved_at = NOW()
  WHERE id = v_cart_id;

  RETURN json_build_object('success', true);
EXCEPTION
  WHEN others THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;