/*
  # Optimize RLS Policies for Performance
  
  This migration optimizes Row Level Security (RLS) policies across all tables by wrapping
  `auth.uid()` calls in SELECT statements. This prevents the function from being re-evaluated
  for each row, significantly improving query performance at scale.
  
  ## Changes
  
  ### Profiles Table
  - Optimize "Users can insert their own profile" policy
  - Optimize "Users can update their own profile" policy
  
  ### Schedules Table
  - Optimize "Managers can create schedules" policy
  - Optimize "Managers can update schedules" policy
  - Optimize "Managers can delete schedules" policy
  
  ### Announcements Table
  - Optimize "Managers can create announcements" policy
  - Optimize "Managers can update announcements" policy
  - Optimize "Managers can delete announcements" policy
  
  ### Complaints Table
  - Optimize "Authenticated users can create complaints" policy
  - Optimize "Managers can update complaints" policy
  - Optimize "Managers can delete complaints" policy
  
  ## Performance Impact
  
  By wrapping auth functions in SELECT statements, Postgres can evaluate them once per query
  instead of once per row, dramatically improving performance on large datasets.
*/

-- Drop and recreate profiles policies with optimized auth checks
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- Drop and recreate schedules policies with optimized auth checks
DROP POLICY IF EXISTS "Managers can create schedules" ON schedules;
DROP POLICY IF EXISTS "Managers can update schedules" ON schedules;
DROP POLICY IF EXISTS "Managers can delete schedules" ON schedules;

CREATE POLICY "Managers can create schedules"
  ON schedules FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'manager'
    )
  );

CREATE POLICY "Managers can update schedules"
  ON schedules FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'manager'
    )
  );

CREATE POLICY "Managers can delete schedules"
  ON schedules FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'manager'
    )
  );

-- Drop and recreate announcements policies with optimized auth checks
DROP POLICY IF EXISTS "Managers can create announcements" ON announcements;
DROP POLICY IF EXISTS "Managers can update announcements" ON announcements;
DROP POLICY IF EXISTS "Managers can delete announcements" ON announcements;

CREATE POLICY "Managers can create announcements"
  ON announcements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'manager'
    )
  );

CREATE POLICY "Managers can update announcements"
  ON announcements FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'manager'
    )
  );

CREATE POLICY "Managers can delete announcements"
  ON announcements FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'manager'
    )
  );

-- Drop and recreate complaints policies with optimized auth checks
DROP POLICY IF EXISTS "Authenticated users can create complaints" ON complaints;
DROP POLICY IF EXISTS "Managers can update complaints" ON complaints;
DROP POLICY IF EXISTS "Managers can delete complaints" ON complaints;

CREATE POLICY "Authenticated users can create complaints"
  ON complaints FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = submitted_by);

CREATE POLICY "Managers can update complaints"
  ON complaints FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'manager'
    )
  );

CREATE POLICY "Managers can delete complaints"
  ON complaints FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'manager'
    )
  );