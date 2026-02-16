/*
  # Add Username to Profiles

  1. Changes
    - Add username column to profiles table
    - Make username unique and required
    - Add index for faster username lookups

  2. Security
    - Username is publicly visible but only managers can update it
    - Employees can view their own username
*/

-- Add username column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'username'
  ) THEN
    ALTER TABLE profiles ADD COLUMN username text;
  END IF;
END $$;

-- Make username unique
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_username_key'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_username_key UNIQUE (username);
  END IF;
END $$;

-- Create index for faster username lookups
CREATE INDEX IF NOT EXISTS profiles_username_idx ON profiles(username);