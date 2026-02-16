/*
  # Add status field to complaints table

  1. Changes
    - Add `status` column to `complaints` table
      - Type: text with check constraint
      - Default: 'pending'
      - Allowed values: 'pending', 'in_progress', 'resolved'
    - Add index on status for faster filtering
  
  2. Notes
    - Existing complaints will automatically get 'pending' status
    - Managers can update status to track complaint resolution
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'complaints' AND column_name = 'status'
  ) THEN
    ALTER TABLE complaints 
    ADD COLUMN status text DEFAULT 'pending' NOT NULL
    CHECK (status IN ('pending', 'in_progress', 'resolved'));

    CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
  END IF;
END $$;