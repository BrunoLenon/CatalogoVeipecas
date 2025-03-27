/*
  # Add user password management function

  1. Changes
    - Add function to verify if a user can update another user's password
    - Add policy for password updates

  2. Security
    - Master can update any user's password
    - Admin can update non-master users' passwords
    - Regular users cannot update others' passwords
*/

-- Function to verify if user can update password
CREATE OR REPLACE FUNCTION auth.can_update_user_password(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_role text;
  target_role text;
BEGIN
  -- Get current user's role
  SELECT (jwt() ->> 'role') INTO current_role;
  
  -- Get target user's role
  SELECT role INTO target_role
  FROM auth.users
  WHERE id = target_user_id;
  
  -- Master can update any password
  IF current_role = 'master' THEN
    RETURN true;
  END IF;
  
  -- Admin can update non-master passwords
  IF current_role = 'admin' AND target_role != 'master' THEN
    RETURN true;
  END IF;
  
  -- Other cases not allowed
  RETURN false;
END;
$$;

-- Add policy for password updates
CREATE POLICY "rls_users_update_password_admin_20250317"
  ON auth.users
  FOR UPDATE
  TO authenticated
  USING (auth.can_update_user_password(id))
  WITH CHECK (auth.can_update_user_password(id));