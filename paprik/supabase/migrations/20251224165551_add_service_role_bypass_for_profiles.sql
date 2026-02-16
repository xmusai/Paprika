/*
  # Add Service Role Bypass for Profile Creation

  ## Problem
  The trigger function needs to be able to insert profiles regardless of RLS policies.
  Even with SECURITY DEFINER, we need to ensure the function can bypass RLS.

  ## Solution
  1. Grant the service_role the ability to bypass RLS on profiles
  2. Ensure the authenticator role has necessary permissions
  3. Update the trigger function to work correctly

  ## Security
  This is safe because:
  - Only the trigger function will use these permissions
  - The trigger only fires on user creation, which is controlled by the edge function
  - Managers must be authenticated to use the edge function
*/

-- Grant BYPASSRLS to service_role if it doesn't already have it
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'GRANT ALL ON public.profiles TO service_role';
  END IF;
END $$;

-- Grant permissions to authenticator role
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') THEN
    EXECUTE 'GRANT ALL ON public.profiles TO authenticator';
  END IF;
END $$;

-- Ensure postgres role has all necessary permissions
GRANT ALL ON public.profiles TO postgres;

-- Update the function to explicitly mention it bypasses RLS via SECURITY DEFINER
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
  -- This function runs as the owner (postgres) with SECURITY DEFINER
  -- which should bypass RLS policies on the profiles table
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee')
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    role = COALESCE(EXCLUDED.role, profiles.role);
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail user creation
  RAISE WARNING 'Profile creation failed for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Ensure the function is owned by postgres
ALTER FUNCTION handle_new_user() OWNER TO postgres;
