-- Migration: Add draft status and session tracking
-- Purpose: Enable users to save draft itineraries before signing in

-- Drop existing constraint if it exists
ALTER TABLE itineraries 
DROP CONSTRAINT IF EXISTS itineraries_status_check;

-- Update status column to support both draft/published AND active/completed
-- This combines migration 003 (active/completed) with draft/published
ALTER TABLE itineraries 
ALTER COLUMN status DROP DEFAULT,
ALTER COLUMN status TYPE TEXT;

-- Add new combined constraint
ALTER TABLE itineraries 
ADD CONSTRAINT itineraries_status_check CHECK (status IN ('draft', 'published', 'active', 'completed', 'archived'));

-- Set default to published for new records
ALTER TABLE itineraries 
ALTER COLUMN status SET DEFAULT 'published'::text;

-- Add session_id for unauthenticated draft tracking
ALTER TABLE itineraries
ADD COLUMN IF NOT EXISTS session_id TEXT;

-- Create index for faster draft queries
CREATE INDEX IF NOT EXISTS idx_itineraries_status ON itineraries(status);
CREATE INDEX IF NOT EXISTS idx_itineraries_session_id ON itineraries(session_id);

-- Add comment
COMMENT ON COLUMN itineraries.status IS 'Status: draft (temporary), published (saved), active (upcoming trip), completed (finished trip), archived (old)';
COMMENT ON COLUMN itineraries.session_id IS 'Temporary session ID for anonymous draft tracking before sign-in';
