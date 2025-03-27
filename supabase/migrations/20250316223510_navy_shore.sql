/*
  # Fix password update functionality

  1. Changes
    - Create stored procedure for password updates
    - Add proper error handling
    - Add validation for user permissions

  2. Security
    - Only master and admin users can update passwords
    - Admin cannot update master passwords
    - Uses security definer for proper permission checks
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.update_user_password;

-- Create the stored procedure for password updates
CREATE OR REPLACE FUNCTION public.update_user_password(
  target_user_id uuid,
  new_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_role text;
  v_target_role text;
BEGIN
  -- Get current user's role from JWT
  v_current_role := current_setting('request.jwt.claims', true)::jsonb->>'role';
  
  -- Get target user's role
  SELECT role INTO v_target_role
  FROM users
  WHERE id = target_user_id;

  -- Validate input
  IF new_password IS NULL OR length(new_password) < 6 THEN
    RAISE EXCEPTION 'Invalid password';
  END IF;

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
EXCEPTION
  WHEN others THEN
    RAISE EXCEPTION 'Error updating password: %', SQLERRM;
END;
$$;