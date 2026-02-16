/*
  # Set Default Usernames for Existing Users

  1. Changes
    - Generate usernames for existing users from their email addresses
    - Make username column required (NOT NULL)

  2. Notes
    - Uses email prefix as username
    - Adds numbers if duplicates exist
*/

-- Update existing profiles to have usernames based on their email
UPDATE profiles
SET username = LOWER(SPLIT_PART(email, '@', 1))
WHERE username IS NULL;

-- Handle any potential duplicates by appending the row number
WITH numbered_profiles AS (
  SELECT 
    id,
    username,
    ROW_NUMBER() OVER (PARTITION BY username ORDER BY created_at) as rn
  FROM profiles
)
UPDATE profiles
SET username = CONCAT(profiles.username, numbered_profiles.rn)
FROM numbered_profiles
WHERE profiles.id = numbered_profiles.id
  AND numbered_profiles.rn > 1;

-- Make username column required
ALTER TABLE profiles ALTER COLUMN username SET NOT NULL;