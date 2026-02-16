/*
  # Add Trigger for Automatic Profile Creation
  
  This migration creates a trigger that automatically creates a profile when a new user
  is created in auth.users. This ensures that profiles are always created for new users,
  regardless of how the user is created (via edge function, auth.signUp, etc.).
  
  ## Changes
  
  1. Create a function that handles new user creation
  2. Add a trigger on auth.users that calls this function
  
  ## How it Works
  
  When a new user is created via auth.admin.createUser() with user_metadata containing
  full_name and role, this trigger will automatically create the corresponding profile
  in the profiles table.
  
  ## Security
  
  The function uses SECURITY DEFINER to bypass RLS policies when inserting profiles.
  This is safe because the function is only triggered by user creation in auth.users,
  which is already a secure, authenticated operation.
*/

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
END;
$$;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
