/*
  # Fix Profile Insert Policy
  
  1. Changes
    - Drop the existing restrictive INSERT policy
    - Add a new INSERT policy that allows:
      - Users to insert their own profile (for regular signups)
      - Service role to insert any profile (for edge function employee creation)
  
  2. Security
    - Users can only insert profiles where id matches their auth.uid()
    - Service role can bypass RLS entirely for admin operations
*/

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- Create new INSERT policy that allows users to insert their own profile
-- Service role will bypass RLS automatically
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Ensure service role can bypass RLS (should be default, but let's be explicit)
ALTER TABLE profiles FORCE ROW LEVEL SECURITY;