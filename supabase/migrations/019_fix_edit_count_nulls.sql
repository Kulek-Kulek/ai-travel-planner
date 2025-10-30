-- Migration: Fix NULL edit_count values in existing itineraries
-- Sets edit_count to 0 for all existing itineraries where it's NULL
-- This ensures the edit limit validation works correctly for free tier users

-- Update existing rows with NULL edit_count to 0
UPDATE itineraries 
SET edit_count = 0 
WHERE edit_count IS NULL;

-- Add comment
COMMENT ON COLUMN itineraries.edit_count IS 'Number of times this itinerary has been edited/regenerated (0 = never edited)';

