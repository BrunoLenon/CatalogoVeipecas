/*
  # Update User Role to Master

  1. Changes
    - Update user role to 'master' in users table
    - Add comment explaining the change

  2. Security
    - Only updates specific user by ID
    - Maintains existing RLS policies
*/

-- Update user role to master
update users 
set role = 'master'::user_role
where id = '37e98de1-a8b4-40ac-a20b-14f456175122';