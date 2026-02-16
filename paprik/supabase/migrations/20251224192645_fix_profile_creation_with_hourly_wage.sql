/*
  # Fix Profile Creation with Hourly Wage
  
  This migration updates the trigger function to properly handle hourly_wage
  from user_metadata and ensures the trigger can bypass RLS policies.
  
  ## Changes
  
  1. Update handle_new_user() function to extract hourly_wage from user_metadata
  2. Ensure the trigger properly bypasses RLS policies
  3. Add better error handling
  
  ## Security
  
  The function uses SECURITY DEFINER and is owned by postgres, which allows it
  to bypass RLS policies when creating profiles. This is safe because:
  - Only triggered by user creation in auth.users
  - User creation is controlled by authenticated edge function
  - Only managers can create new employees via the edge function
*/

-- Drop existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Update the function to include hourly_wage
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  v_hourly_wage numeric;
BEGIN
  -- Extract hourly_wage from metadata, default to 15.00 if not provided
  v_hourly_wage := COALESCE(
    (NEW.raw_user_meta_data->>'hourly_wage')::numeric,
    15.00
  );

  -- Insert the profile, bypassing RLS due to SECURITY DEFINER
  INSERT INTO public.profiles (id, email, full_name, role, hourly_wage)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee'),
    v_hourly_wage
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    role = COALESCE(EXCLUDED.role, profiles.role),
    hourly_wage = COALESCE(EXCLUDED.hourly_wage, profiles.hourly_wage);
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error details but don't fail user creation
  RAISE WARNING 'Profile creation failed for user % (email: %): %', NEW.id, NEW.email, SQLERRM;
  RETURN NEW;
END;
$$;

-- Ensure the function is owned by postgres to bypass RLS
ALTER FUNCTION handle_new_user() OWNER TO postgres;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
