/*
  # Add Open Shifts Support

  ## Changes Made
  
  1. Schema Changes
    - Modify `schedules.employee_id` to allow NULL values for open shifts
    - Open shifts (employee_id IS NULL) can be claimed by any employee
  
  2. Security Changes
    - Add policy for employees to claim open shifts
    - Employees can UPDATE schedules where employee_id is NULL to assign themselves
    - Once claimed, the shift becomes a regular assigned shift
  
  ## Notes
  - Open shifts will be displayed in a distinct color on the calendar
  - When an employee claims an open shift, it automatically assigns them to it
  - Only managers can create open shifts
  - Employees cannot unclaim a shift once taken
*/

-- Allow employee_id to be nullable for open shifts
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schedules' AND column_name = 'employee_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE schedules ALTER COLUMN employee_id DROP NOT NULL;
  END IF;
END $$;

-- Drop existing policy that might conflict
DROP POLICY IF EXISTS "Employees can claim open shifts" ON schedules;

-- Add policy for employees to claim open shifts
CREATE POLICY "Employees can claim open shifts"
  ON schedules FOR UPDATE
  TO authenticated
  USING (employee_id IS NULL)
  WITH CHECK (
    auth.uid() = employee_id AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'employee'
    )
  );