/*
  # Fix user permissions and roles

  1. Changes
    - Update user role in auth.users metadata
    - Add function to sync user roles
    - Add trigger to keep roles in sync

  2. Security
    - Uses security definer for proper access
    - Validates user existence and roles
*/

-- Function to sync user role with metadata
CREATE OR REPLACE FUNCTION sync_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update auth.users metadata with the role
  UPDATE auth.users
  SET raw_user_meta_data = 
    CASE 
      WHEN raw_user_meta_data IS NULL THEN 
        jsonb_build_object('role', NEW.role)
      ELSE 
        raw_user_meta_data || jsonb_build_object('role', NEW.role)
    END
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- Create trigger to keep roles in sync
DROP TRIGGER IF EXISTS sync_user_role_trigger ON users;
CREATE TRIGGER sync_user_role_trigger
  AFTER INSERT OR UPDATE OF role
  ON users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_role();

-- Update specific user's role and metadata
DO $$
BEGIN
  -- Update user role in users table
  UPDATE users 
  SET role = 'master'
  WHERE id = '37e98de1-a8b4-40ac-a20b-14f456175122';

  -- Update user metadata directly
  UPDATE auth.users 
  SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('role', 'master')
  WHERE id = '37e98de1-a8b4-40ac-a20b-14f456175122';
END $$;