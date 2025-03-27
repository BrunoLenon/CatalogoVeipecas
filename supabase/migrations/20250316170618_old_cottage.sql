/*
  # Initial Schema Setup

  1. Tables
    - users
    - products
    - categories
    - orders
    - cart
    - company_info

  2. Security
    - Enable RLS on all tables
    - Add policies for each table
*/

-- Create enum types
CREATE TYPE user_role AS ENUM ('master', 'admin', 'seller', 'customer');
CREATE TYPE order_status AS ENUM ('pending', 'processing', 'completed', 'cancelled');

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar NOT NULL,
  email varchar UNIQUE NOT NULL,
  password_hash varchar NOT NULL,
  role user_role NOT NULL DEFAULT 'customer',
  cnpj_cpf varchar UNIQUE NOT NULL,
  seller_id uuid REFERENCES users(id),
  status boolean DEFAULT true,
  last_login timestamptz,
  avatar_url varchar,
  created_at timestamptz DEFAULT now()
);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar NOT NULL,
  parent_id uuid REFERENCES categories(id),
  created_at timestamptz DEFAULT now()
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar NOT NULL,
  description text,
  code varchar NOT NULL,
  barcode varchar UNIQUE,
  brand varchar NOT NULL,
  stock integer DEFAULT 0,
  price numeric(10,2),
  category_id uuid REFERENCES categories(id),
  tags jsonb DEFAULT '[]'::jsonb,
  is_new boolean DEFAULT true,
  image_url varchar,
  created_at timestamptz DEFAULT now(),
  UNIQUE(code, brand)
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number varchar UNIQUE NOT NULL,
  user_id uuid REFERENCES users(id) NOT NULL,
  seller_id uuid REFERENCES users(id),
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total numeric(10,2),
  status order_status DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Create cart table
CREATE TABLE IF NOT EXISTS cart (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  items jsonb DEFAULT '[]'::jsonb,
  total numeric(10,2),
  saved_at timestamptz DEFAULT now(),
  is_finalized boolean DEFAULT false
);

-- Create company_info table
CREATE TABLE IF NOT EXISTS company_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar NOT NULL,
  cnpj varchar UNIQUE NOT NULL,
  address varchar,
  phone varchar,
  email varchar,
  website varchar,
  logo_url varchar,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_info ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own data" ON users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can manage users" ON users
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' IN ('master', 'admin'));

CREATE POLICY "Public read access to categories" ON categories
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage categories" ON categories
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' IN ('master', 'admin'));

CREATE POLICY "Public read access to products" ON products
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage products" ON products
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' IN ('master', 'admin'));

CREATE POLICY "Users can read own orders" ON orders
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own cart" ON cart
  FOR ALL TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Public read access to company info" ON company_info
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage company info" ON company_info
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' IN ('master', 'admin'));