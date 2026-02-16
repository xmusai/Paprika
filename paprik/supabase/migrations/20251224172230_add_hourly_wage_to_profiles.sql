/*
  # Add hourly wage to profiles table

  1. Changes
    - Add `hourly_wage` column to `profiles` table
      - Type: numeric(10,2) for precise decimal values
      - Default: 15.00 (minimum wage placeholder)
      - Not null to ensure all employees have a wage
  
  2. Notes
    - Existing profiles will get default $15.00/hour
    - Managers can update this value as needed
    - Used for payroll calculations
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'hourly_wage'
  ) THEN
    ALTER TABLE profiles 
    ADD COLUMN hourly_wage numeric(10,2) DEFAULT 15.00 NOT NULL
    CHECK (hourly_wage >= 0);
  END IF;
END $$;