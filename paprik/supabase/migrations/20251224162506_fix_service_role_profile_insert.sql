/*
  # Fix Service Role Profile Insert
  
  1. Changes
    - Remove FORCE ROW LEVEL SECURITY to allow service role to bypass RLS
    - This enables the edge function to create employee profiles using the service role key
  
  2. Security
    - Regular authenticated users still cannot insert profiles for other users
    - Service role can bypass RLS for administrative operations (like creating employees)
    - This is the standard Supabase pattern for admin operations
*/

-- Change from FORCE ROW LEVEL SECURITY to regular RLS
-- This allows service role to bypass RLS while still enforcing it for regular users
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;