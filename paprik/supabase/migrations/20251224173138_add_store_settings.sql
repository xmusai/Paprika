/*
  # Add Store Settings Table

  1. New Tables
    - `store_settings`
      - `id` (uuid, primary key)
      - `daily_payroll_limit` (numeric) - Maximum daily payroll amount in euros
      - `updated_at` (timestamptz) - Last update timestamp
      - `updated_by` (uuid) - Manager who last updated the settings

  2. Security
    - Enable RLS on `store_settings` table
    - Add policy for managers to read store settings
    - Add policy for managers to update store settings

  3. Notes
    - Store settings is a single-row table for global app configuration
    - Only managers can view and modify settings
*/

CREATE TABLE IF NOT EXISTS store_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_payroll_limit numeric DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can read store settings"
  ON store_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'manager'
    )
  );

CREATE POLICY "Managers can update store settings"
  ON store_settings
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

CREATE POLICY "Managers can insert store settings"
  ON store_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'manager'
    )
  );

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM store_settings LIMIT 1) THEN
    INSERT INTO store_settings (daily_payroll_limit) VALUES (500.00);
  END IF;
END $$;
