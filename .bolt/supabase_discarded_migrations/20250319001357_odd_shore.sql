/*
  # Estrutura Inicial do Banco de Dados

  1. Tipos Enumerados
    - user_role: Papéis de usuário (master, admin, seller, customer)
    - order_status: Status dos pedidos (pending, processing, completed, cancelled)

  2. Tabelas
    - users: Usuários do sistema
    - products: Produtos
    - categories: Categorias de produtos
    - orders: Pedidos
    - cart: Carrinho de compras
    - custom: Configurações do sistema

  3. Segurança
    - RLS (Row Level Security) em todas as tabelas
    - Políticas de acesso por papel
    - Validações e constraints

  4. Índices e Otimizações
    - Índices para campos frequentemente consultados
    - Constraints para integridade dos dados
*/

-- Criar tipos enumerados
CREATE TYPE user_role AS ENUM ('master', 'admin', 'seller', 'customer');
CREATE TYPE order_status AS ENUM ('pending', 'processing', 'completed', 'cancelled');

-- Criar tabela de usuários
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'customer',
  cnpj_cpf text NOT NULL UNIQUE,
  seller_id uuid REFERENCES users(id),
  status boolean DEFAULT true,
  last_login timestamptz,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Criar tabela de categorias
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Criar tabela de produtos
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  code text NOT NULL,
  barcode text UNIQUE,
  brand text NOT NULL,
  stock integer DEFAULT 0,
  price numeric(10,2),
  category_id uuid REFERENCES categories(id),
  tags jsonb DEFAULT '[]'::jsonb,
  is_new boolean DEFAULT true,
  image_url text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT products_code_brand_unique UNIQUE (code, brand),
  CONSTRAINT price_range CHECK (price >= 0),
  CONSTRAINT stock_range CHECK (stock >= 0)
);

-- Criar tabela de pedidos
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  user_id uuid REFERENCES users(id) NOT NULL,
  seller_id uuid REFERENCES users(id),
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total numeric(10,2),
  status order_status DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Criar tabela de carrinho
CREATE TABLE cart (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  items jsonb DEFAULT '[]'::jsonb,
  total numeric(10,2),
  saved_at timestamptz DEFAULT now(),
  is_finalized boolean DEFAULT false
);

-- Criar tabela de configurações do sistema
CREATE TABLE custom (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) > 0),
  cnpj text NOT NULL CHECK (length(trim(cnpj)) > 0),
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
  logo_url text CHECK (
    logo_url IS NULL OR 
    logo_url ~* '^https?://[^\s/$.?#].[^\s]*$'
  ),
  favicon_url text CHECK (
    favicon_url IS NULL OR 
    favicon_url ~* '^https?://[^\s/$.?#].[^\s]*$'
  ),
  site_title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT custom_single_row CHECK (id = '00000000-0000-0000-0000-000000000001')
);

-- Criar índices para otimização
CREATE INDEX idx_products_name_code_brand ON products (name, code, brand);
CREATE INDEX idx_orders_user_id_status ON orders (user_id, status);
CREATE INDEX idx_users_role_status ON users (role, status);

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_custom_updated_at
  BEFORE UPDATE ON custom
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Função para validar URLs de imagem
CREATE OR REPLACE FUNCTION validate_image_url()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.image_url IS NOT NULL THEN
    IF NEW.image_url !~ '^https?://[^\s/$.?#].[^\s]*$' THEN
      RAISE EXCEPTION 'Invalid image URL format';
    END IF;
    
    IF NEW.image_url !~ '^https://(.*\.supabase\.co/|images\.unsplash\.com/)' THEN
      RAISE EXCEPTION 'Image URL domain not allowed';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar imagens
CREATE TRIGGER validate_product_image
  BEFORE INSERT OR UPDATE OF image_url ON products
  FOR EACH ROW
  EXECUTE FUNCTION validate_image_url();

-- Habilitar RLS em todas as tabelas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para users
CREATE POLICY "rls_users_select_all_20250319"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR auth.jwt()->>'role' IN ('master', 'admin')
    OR (
      auth.jwt()->>'role' = 'seller' 
      AND role = 'customer' 
      AND seller_id = auth.uid()
    )
  );

CREATE POLICY "rls_users_manage_admin_20250319"
  ON users
  FOR ALL
  TO authenticated
  USING (
    auth.role() = 'service_role'
    OR auth.jwt()->>'role' = 'master'
    OR (
      auth.jwt()->>'role' = 'admin' 
      AND role != 'master'
    )
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR auth.jwt()->>'role' = 'master'
    OR (
      auth.jwt()->>'role' = 'admin' 
      AND role != 'master'
    )
  );

-- Políticas RLS para categories
CREATE POLICY "rls_categories_select_all_20250319"
  ON categories
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "rls_categories_manage_admin_20250319"
  ON categories
  FOR ALL
  TO authenticated
  USING (auth.jwt()->>'role' IN ('master', 'admin'))
  WITH CHECK (auth.jwt()->>'role' IN ('master', 'admin'));

-- Políticas RLS para products
CREATE POLICY "rls_products_select_all_20250319"
  ON products
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "rls_products_manage_admin_20250319"
  ON products
  FOR ALL
  TO authenticated
  USING (auth.jwt()->>'role' IN ('master', 'admin'))
  WITH CHECK (auth.jwt()->>'role' IN ('master', 'admin'));

-- Políticas RLS para orders
CREATE POLICY "rls_orders_select_own_20250319"
  ON orders
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR seller_id = auth.uid()
    OR auth.jwt()->>'role' IN ('master', 'admin')
  );

CREATE POLICY "rls_orders_manage_own_20250319"
  ON orders
  FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid()
    OR seller_id = auth.uid()
    OR auth.jwt()->>'role' IN ('master', 'admin')
  )
  WITH CHECK (
    user_id = auth.uid()
    OR seller_id = auth.uid()
    OR auth.jwt()->>'role' IN ('master', 'admin')
  );

-- Políticas RLS para cart
CREATE POLICY "rls_cart_manage_own_20250319"
  ON cart
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Políticas RLS para custom
CREATE POLICY "rls_custom_select_all_20250319"
  ON custom
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "rls_custom_manage_admin_20250319"
  ON custom
  FOR ALL
  TO authenticated
  USING (auth.jwt()->>'role' IN ('master', 'admin'))
  WITH CHECK (auth.jwt()->>'role' IN ('master', 'admin'));

-- Criar bucket para imagens do sistema
INSERT INTO storage.buckets (
  id,
  name,
  public,
  avif_autodetection,
  file_size_limit,
  allowed_mime_types
) VALUES (
  'system-images',
  'system-images',
  true,
  false,
  5242880, -- 5MB
  array['image/jpeg', 'image/png', 'image/webp']::text[]
) ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']::text[];

-- Políticas de storage
CREATE POLICY "rls_storage_select_images_20250319"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'system-images');

CREATE POLICY "rls_storage_manage_images_20250319"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'system-images'
    AND auth.jwt()->>'role' IN ('master', 'admin')
  )
  WITH CHECK (
    bucket_id = 'system-images'
    AND auth.jwt()->>'role' IN ('master', 'admin')
  );

-- Inserir dados iniciais
INSERT INTO custom (
  id,
  name,
  cnpj,
  site_title
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Sistema de Vendas',
  '00.000.000/0001-00',
  'Sistema de Vendas'
) ON CONFLICT (id) DO NOTHING;