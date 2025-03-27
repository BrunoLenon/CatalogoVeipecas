/*
  # Fix password update permissions

  1. Changes
    - Create function to handle password updates with proper permissions
    - Master can update any user's password
    - Admin can update passwords of sellers and customers only
    - Uses proper JWT claims access
    - Adds input validation and error handling

  2. Security
    - Uses security definer for proper permission enforcement
    - Validates password requirements
    - Proper error handling and feedback
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
  v_current_role := nullif(current_setting('request.jwt.claim.role', true), '')::text;
  
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
  ELSIF v_current_role = 'admin' AND v_target_role NOT IN ('master', 'admin') THEN
    -- Admin can update only seller and customer passwords
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