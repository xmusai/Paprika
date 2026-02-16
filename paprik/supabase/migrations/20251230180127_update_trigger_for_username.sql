/*
  # Update Profile Creation Trigger for Username

  1. Changes
    - Update handle_new_user() function to include username field
    - Extracts username from user_metadata when creating profiles

  2. Notes
    - Username comes from user_metadata during signup
    - Falls back to email prefix if no username provided
*/

-- Update function to handle new user creation with username
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, full_name, role, hourly_wage)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', LOWER(SPLIT_PART(NEW.email, '@', 1))),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee'),
    COALESCE((NEW.raw_user_meta_data->>'hourly_wage')::numeric, 15.00)
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    username = COALESCE(EXCLUDED.username, profiles.username),
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    role = COALESCE(EXCLUDED.role, profiles.role),
    hourly_wage = COALESCE(EXCLUDED.hourly_wage, profiles.hourly_wage);
  
  RETURN NEW;
END;
$$;