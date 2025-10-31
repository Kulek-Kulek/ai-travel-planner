-- Migration: Add admin access to view and manage all profiles
-- Purpose: Allow admins to view all user profiles for user management
-- Also allows public read access to basic profile info (names) for itinerary gallery

-- Drop old policies if they exist (in case migration is re-run)
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Anyone can view basic profile info" ON profiles;

-- Allow anyone (including anonymous) to view basic public profile info
-- This is needed for showing creator names in the public itinerary gallery
CREATE POLICY "Anyone can view basic profile info"
  ON profiles FOR SELECT
  USING (true);

-- Admin can update ALL profiles (for role/tier management)
CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles AS admin_profile
      WHERE admin_profile.id = auth.uid() 
      AND admin_profile.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles AS admin_profile
      WHERE admin_profile.id = auth.uid() 
      AND admin_profile.role = 'admin'
    )
  );

-- Add comment
COMMENT ON TABLE profiles IS 'User profiles with role-based access control. Users can manage their own profile. Basic profile info (names) is publicly readable for itinerary attribution. Admins have full access to all profiles and itineraries.';

