/*
  # Fix complaint status values

  1. Changes
    - Update status column constraint to use 'open' instead of 'pending'
    - Update existing 'pending' values to 'open'
  
  2. Notes
    - Matches the expected status values in the application
*/

DO $$
BEGIN
  -- Update any existing 'pending' status to 'open'
  UPDATE complaints SET status = 'open' WHERE status = 'pending';

  -- Drop the old constraint if it exists
  ALTER TABLE complaints DROP CONSTRAINT IF EXISTS complaints_status_check;
  
  -- Add the correct constraint
  ALTER TABLE complaints 
  ADD CONSTRAINT complaints_status_check 
  CHECK (status IN ('open', 'in_progress', 'resolved'));
END $$;