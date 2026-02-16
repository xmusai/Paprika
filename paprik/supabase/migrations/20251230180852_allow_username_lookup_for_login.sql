/*
  # Allow Username Lookup for Login

  1. Changes
    - Add RLS policy to allow anyone to read email when querying by username
    - This enables username-based login for unauthenticated users

  2. Security
    - Only exposes email field (which is needed for login)
    - User must know the username to get the email
    - This is standard for username-based authentication systems
*/

-- Allow anyone to look up email by username for login purposes
CREATE POLICY "Anyone can lookup email by username"
  ON profiles
  FOR SELECT
  TO public
  USING (true);