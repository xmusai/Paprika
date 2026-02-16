/*
  # Remove FORCE Row Level Security from Profiles
  
  1. Changes
    - Explicitly remove FORCE ROW LEVEL SECURITY from profiles table
    - Keep regular RLS enabled for authenticated users
    - Allow service role to bypass RLS for admin operations
  
  2. Security
    - Regular authenticated users are still protected by RLS policies
    - Service role (used by edge functions) can bypass RLS for creating employees
    - This is the standard Supabase security pattern for admin operations
*/

-- Explicitly remove FORCE RLS while keeping RLS enabled
ALTER TABLE profiles NO FORCE ROW LEVEL SECURITY;