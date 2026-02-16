/*
  # Initial Database Schema

  Creates the complete database schema for the employee management system.

  ## New Tables
  
  ### profiles
  - `id` (uuid, primary key) - Links to auth.users
  - `email` (text, unique, required) - User's email address
  - `full_name` (text, required) - User's full name
  - `role` (text, required) - Either 'employee' or 'manager'
  - `created_at` (timestamptz) - Account creation timestamp
  
  ### schedules
  - `id` (uuid, primary key) - Unique schedule entry ID
  - `employee_id` (uuid, required) - References profiles.id
  - `date` (date, required) - Scheduled work date
  - `start_time` (time, required) - Shift start time
  - `end_time` (time, required) - Shift end time
  - `shift_role` (text, required) - Role for this shift (kitchen/delivery/cashier/manager)
  - `notes` (text) - Optional notes about the shift
  - `created_by` (uuid, required) - Manager who created the schedule
  - `created_at` (timestamptz) - Schedule creation timestamp
  
  ### announcements
  - `id` (uuid, primary key) - Unique announcement ID
  - `title` (text, required) - Announcement title
  - `content` (text, required) - Announcement content
  - `category` (text, required) - Category (general/hours/emergency/rules)
  - `priority` (text) - Priority level (normal/high/urgent)
  - `created_by` (uuid, required) - Manager who created the announcement
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  
  ### complaints
  - `id` (uuid, primary key) - Unique complaint ID
  - `title` (text, required) - Complaint title
  - `description` (text, required) - Detailed description
  - `category` (text, required) - Category (equipment/supplies/pos/other)
  - `urgency` (text, required) - Urgency level (low/medium/high/critical)
  - `status` (text) - Status (open/in_progress/resolved)
  - `submitted_by` (uuid, required) - Employee who submitted
  - `resolved_by` (uuid, nullable) - Manager who resolved it
  - `created_at` (timestamptz) - Submission timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Security
  
  All tables have Row Level Security (RLS) enabled with restrictive policies:
  
  - **profiles**: Users can view all profiles but only update their own
  - **schedules**: All authenticated users can view schedules; only managers can create/update/delete
  - **announcements**: All authenticated users can view; only managers can create/update/delete
  - **complaints**: Users can view all complaints and create new ones; only managers can update/delete
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('employee', 'manager')),
  created_at timestamptz DEFAULT now()
);

-- Create schedules table
CREATE TABLE IF NOT EXISTS schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  shift_role text NOT NULL CHECK (shift_role IN ('kitchen', 'delivery', 'cashier', 'manager')),
  notes text DEFAULT '',
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL CHECK (category IN ('general', 'hours', 'emergency', 'rules')),
  priority text DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'urgent')),
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create complaints table
CREATE TABLE IF NOT EXISTS complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL CHECK (category IN ('equipment', 'supplies', 'pos', 'other')),
  urgency text NOT NULL CHECK (urgency IN ('low', 'medium', 'high', 'critical')),
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  submitted_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  resolved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for foreign keys
CREATE INDEX IF NOT EXISTS schedules_employee_id_idx ON schedules(employee_id);
CREATE INDEX IF NOT EXISTS schedules_created_by_idx ON schedules(created_by);
CREATE INDEX IF NOT EXISTS schedules_date_idx ON schedules(date);
CREATE INDEX IF NOT EXISTS announcements_created_by_idx ON announcements(created_by);
CREATE INDEX IF NOT EXISTS complaints_submitted_by_idx ON complaints(submitted_by);
CREATE INDEX IF NOT EXISTS complaints_resolved_by_idx ON complaints(resolved_by);
CREATE INDEX IF NOT EXISTS complaints_status_idx ON complaints(status);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Authenticated users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Schedules policies
CREATE POLICY "Authenticated users can view all schedules"
  ON schedules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers can create schedules"
  ON schedules FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'manager'
    )
  );

CREATE POLICY "Managers can update schedules"
  ON schedules FOR UPDATE
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

CREATE POLICY "Managers can delete schedules"
  ON schedules FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'manager'
    )
  );

-- Announcements policies
CREATE POLICY "Authenticated users can view all announcements"
  ON announcements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers can create announcements"
  ON announcements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'manager'
    )
  );

CREATE POLICY "Managers can update announcements"
  ON announcements FOR UPDATE
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

CREATE POLICY "Managers can delete announcements"
  ON announcements FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'manager'
    )
  );

-- Complaints policies
CREATE POLICY "Authenticated users can view all complaints"
  ON complaints FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create complaints"
  ON complaints FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "Managers can update complaints"
  ON complaints FOR UPDATE
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

CREATE POLICY "Managers can delete complaints"
  ON complaints FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'manager'
    )
  );