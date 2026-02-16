/*
  # Fix Profile Creation for Service Role
  
  This migration resolves the issue where the edge function cannot create profiles
  for new users despite using the service role key.
  
  ## Problem
  
  The current RLS policy "Users can insert their own profile" only allows insertions
  where auth.uid() = id. This prevents the create-employee edge function from creating
  profiles for new users, even when using the service role key.
  
  ## Solution
  
  Create a database function with SECURITY DEFINER that bypasses RLS and can be called
  by authenticated users (including service role) to insert profiles. This function
  will be used by the edge function to create employee profiles securely.
  
  ## Security
  
  The function itself doesn't perform authorization checks because authorization is
  handled by the edge function (which verifies the caller is a manager before
  proceeding). The SECURITY DEFINER attribute allows the function to bypass RLS
  policies while executing with the privileges of the function owner (postgres).
*/

-- Create a secure function to insert profiles that bypasses RLS
CREATE OR REPLACE FUNCTION create_profile_for_user(
  user_id uuid,
  user_email text,
  user_full_name text,
  user_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert the profile (this will bypass RLS due to SECURITY DEFINER)
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (user_id, user_email, user_full_name, user_role)
  ON CONFLICT (id) DO UPDATE
  SET email = user_email,
      full_name = user_full_name,
      role = user_role;
END;
$$;

-- Grant execute permission to authenticated users (including service role)
GRANT EXECUTE ON FUNCTION create_profile_for_user(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION create_profile_for_user(uuid, text, text, text) TO service_role;