/*
  # Add Manager Update Policy for Profiles

  1. Changes
    - Add policy allowing managers to update all profiles
    - Managers need this permission to edit employee information

  2. Security
    - Only users with role = 'manager' can update other profiles
    - Employees can still update their own profiles
    - All updates still require authentication
*/

-- Allow managers to update any profile
CREATE POLICY "Managers can update all profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'manager'
    )
  );