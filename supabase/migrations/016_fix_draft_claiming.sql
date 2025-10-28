-- Fix RLS policy to allow authenticated users to claim draft itineraries
-- Problem: The update policy required auth.uid() = user_id, but drafts have user_id = NULL
-- Solution: Allow authenticated users to update drafts (user_id IS NULL and status = 'draft')

-- Drop the existing update policy
DROP POLICY IF EXISTS "Users can update own itineraries" ON itineraries;

-- Create new update policy that allows:
-- 1. Users to update their own itineraries
-- 2. Authenticated users to claim drafts (user_id IS NULL and status = 'draft')
CREATE POLICY "Users can update own itineraries and claim drafts"
  ON itineraries FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id  -- User owns the itinerary
    OR 
    (user_id IS NULL AND status = 'draft')  -- It's an unclaimed draft
  )
  WITH CHECK (auth.uid() = user_id);  -- After update, must belong to the user

-- Add comment explaining the policy
COMMENT ON POLICY "Users can update own itineraries and claim drafts" ON itineraries IS 
  'Allows authenticated users to update their own itineraries and claim draft itineraries created by anonymous users';




