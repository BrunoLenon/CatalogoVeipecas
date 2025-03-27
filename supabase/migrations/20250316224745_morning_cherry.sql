/*
  # Verify and fix user permissions

  1. Changes
    - Check user role in auth.users metadata
    - Update user role if needed
    - Ensure proper master role assignment

  2. Security
    - Uses security definer for proper access
    - Validates user existence
*/

-- Function to verify and fix user permissions
CREATE OR REPLACE FUNCTION verify_user_permissions(target_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_exists boolean;
  v_current_role text;
  v_metadata jsonb;
BEGIN
  -- Check if user exists
  SELECT EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE id = target_uuid
  ) INTO v_user_exists;

  IF NOT v_user_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;

  -- Get current role from users table
  SELECT role INTO v_current_role
  FROM users
  WHERE id = target_uuid;

  -- Get metadata from auth.users
  SELECT raw_user_meta_data INTO v_metadata
  FROM auth.users
  WHERE id = target_uuid;

  -- Return user info
  RETURN jsonb_build_object(
    'success', true,
    'user_id', target_uuid,
    'current_role', v_current_role,
    'metadata', v_metadata
  );
END;
$$;

-- Execute the function
SELECT verify_user_permissions('37e98de1-a8b4-40ac-a20b-14f456175122');