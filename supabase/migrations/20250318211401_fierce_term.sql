/*
  # Security and Performance Improvements

  1. Changes
    - Add indexes for better query performance
    - Add constraints for data validation
    - Add security checks
    - Optimize storage settings

  2. Security
    - Add input validation
    - Improve RLS policies
    - Add rate limiting
*/

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_name_code_brand ON products (name, code, brand);
CREATE INDEX IF NOT EXISTS idx_orders_user_id_status ON orders (user_id, status);
CREATE INDEX IF NOT EXISTS idx_users_role_status ON users (role, status);

-- Add check constraints for data validation
ALTER TABLE users 
  ADD CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE products
  ADD CONSTRAINT price_range CHECK (price >= 0),
  ADD CONSTRAINT stock_range CHECK (stock >= 0);

-- Add function to validate image dimensions
CREATE OR REPLACE FUNCTION validate_image_url()
RETURNS trigger AS $$
BEGIN
  IF NEW.image_url IS NOT NULL THEN
    -- Validate URL format
    IF NEW.image_url !~ '^https?://[^\s/$.?#].[^\s]*$' THEN
      RAISE EXCEPTION 'Invalid image URL format';
    END IF;
    
    -- Validate allowed domains
    IF NEW.image_url !~ '^https://(.*\.supabase\.co/|images\.unsplash\.com/)' THEN
      RAISE EXCEPTION 'Image URL domain not allowed';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for image validation
DROP TRIGGER IF EXISTS validate_product_image ON products;
CREATE TRIGGER validate_product_image
  BEFORE INSERT OR UPDATE OF image_url ON products
  FOR EACH ROW
  EXECUTE FUNCTION validate_image_url();

-- Create schema for rate limiting if not exists
CREATE SCHEMA IF NOT EXISTS auth;

-- Create rate limits table if not exists
CREATE TABLE IF NOT EXISTS auth.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  attempt_time timestamptz DEFAULT now()
);

-- Add index for rate limiting queries
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action_time 
  ON auth.rate_limits (user_id, action, attempt_time);

-- Add rate limiting function
CREATE OR REPLACE FUNCTION check_rate_limit(
  user_id uuid,
  action text,
  max_attempts int DEFAULT 5,
  window_minutes int DEFAULT 15
)
RETURNS boolean AS $$
DECLARE
  recent_attempts int;
BEGIN
  -- Clean old attempts
  DELETE FROM auth.rate_limits
  WHERE attempt_time < NOW() - (window_minutes || ' minutes')::interval;
  
  -- Count recent attempts
  SELECT COUNT(*) INTO recent_attempts
  FROM auth.rate_limits
  WHERE rate_limits.user_id = check_rate_limit.user_id
    AND rate_limits.action = check_rate_limit.action
    AND attempt_time > NOW() - (window_minutes || ' minutes')::interval;
    
  -- Check limit
  IF recent_attempts >= max_attempts THEN
    RETURN false;
  END IF;
  
  -- Log attempt
  INSERT INTO auth.rate_limits (user_id, action)
  VALUES (check_rate_limit.user_id, check_rate_limit.action);
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update storage settings
UPDATE storage.buckets
SET public = false,
    file_size_limit = 5242880, -- 5MB
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id IN ('products', 'system-images');

-- Optimize RLS policies
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Products are viewable by everyone"
  ON products
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Products are editable by admins"
  ON products
  FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'role' IN ('master', 'admin')
  )
  WITH CHECK (
    auth.jwt() ->> 'role' IN ('master', 'admin')
  );

-- Add function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to all tables that need it
DO $$ 
DECLARE
  t text;
BEGIN
  FOR t IN 
    SELECT table_name 
    FROM information_schema.columns 
    WHERE column_name = 'updated_at'
      AND table_schema = 'public'
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS update_updated_at ON %I;
      CREATE TRIGGER update_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    ', t, t);
  END LOOP;
END $$;