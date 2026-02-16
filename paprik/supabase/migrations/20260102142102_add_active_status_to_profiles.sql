/*
  # Add Active Status to Profiles

  1. Changes
    - Add `is_active` column to `profiles` table
      - Default value: true
      - Type: boolean
      - Used to track if an employee account is active or deactivated
    
  2. Notes
    - Deactivated employees cannot log in
    - Their future shifts will be unassigned when deactivated
    - Existing employees are set to active by default
*/

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL;