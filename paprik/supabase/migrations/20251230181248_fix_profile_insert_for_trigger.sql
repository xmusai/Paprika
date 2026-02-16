/*
  # Fix Profile INSERT Policy for Trigger-Based Creation

  1. Changes
    - Drop the restrictive INSERT policy that prevents trigger-based inserts
    - The trigger function `handle_new_user()` is SECURITY DEFINER and handles profile creation
    - No direct INSERT access is needed since profiles are only created via auth trigger

  2. Security
    - Profiles can only be created through user registration (trigger)
    - RLS prevents direct INSERT operations
    - Managers use edge functions with service role for employee creation
*/

-- Drop the INSERT policy since profiles are only created via trigger
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;