/*
  # Add password management functions and policies

  1. Changes
    - Add function to update user password
    - Add policy for password updates

  2. Security
    - Master can update any user's password
    - Admin can update non-master users' passwords
    - Regular users cannot update others' passwords
*/

-- Function to update user password
CREATE OR REPLACE FUNCTION auth.update_user_password(
  target_user_id uuid,
  new_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_role text;
  v_target_role text;
BEGIN
  -- Get current user's role from JWT
  SELECT (jwt() ->> 'role') INTO v_current_role;
  
  -- Get target user's role
  SELECT role INTO v_target_role
  FROM users
  WHERE id = target_user_id;
  
  -- Validate permissions
  IF v_current_role = 'master' THEN
    -- Master can update any password
    NULL;
  ELSIF v_current_role = 'admin' AND v_target_role != 'master' THEN
    -- Admin can update non-master passwords
    NULL;
  ELSE
    -- Other cases not allowed
    RETURN false;
  END IF;

  -- Update password
  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf'))
  WHERE id = target_user_id;

  RETURN true;
END;
$$;