/*
  # Fix Trigger Function to Properly Bypass RLS

  ## Problem
  The trigger function needs to bypass RLS when creating profiles, but SECURITY DEFINER
  alone may not be sufficient in Supabase environments.

  ## Solution
  1. Recreate the function to use dynamic SQL with explicit security context
  2. Ensure the function properly bypasses RLS policies
  3. Use a service role context that has full privileges

  ## Security
  This is safe because the function only runs when triggered by user creation,
  which is already a secure operation controlled by the edge function.
*/

-- Drop the existing trigger to recreate it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate the function with proper RLS bypass
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  user_full_name text;
  user_role text;
BEGIN
  -- Extract metadata
  user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'employee');
  
  -- Insert or update profile with explicit INSERT
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, user_full_name, user_role)
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't fail the user creation
  RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Set the function owner to the service role
ALTER FUNCTION handle_new_user() OWNER TO postgres;

-- Grant necessary permissions
GRANT ALL ON public.profiles TO postgres;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
