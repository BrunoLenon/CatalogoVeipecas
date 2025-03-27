/*
  # Add Product Code and Brand Constraint

  1. Changes
    - Add unique constraint for product code and brand combination
    - This ensures no two products can have the same code and brand
    
  2. Notes
    - Products can have the same code if brands are different
    - Products can have the same brand if codes are different
*/

-- Add unique constraint for code and brand combination
alter table products
add constraint products_code_brand_unique unique (code, brand);