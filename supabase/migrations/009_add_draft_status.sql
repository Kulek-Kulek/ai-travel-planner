-- Migration: Add draft status and session tracking
-- Purpose: Enable users to save draft itineraries before signing in

-- Add status column to itineraries (draft or published)
ALTER TABLE itineraries 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published'));

-- Fix default if it was set incorrectly
ALTER TABLE itineraries 
ALTER COLUMN status SET DEFAULT 'published'::text;

-- Add session_id for unauthenticated draft tracking
ALTER TABLE itineraries
ADD COLUMN IF NOT EXISTS session_id TEXT;

-- Create index for faster draft queries
CREATE INDEX IF NOT EXISTS idx_itineraries_status ON itineraries(status);
CREATE INDEX IF NOT EXISTS idx_itineraries_session_id ON itineraries(session_id);

-- Add comment
COMMENT ON COLUMN itineraries.status IS 'draft for temporary plans before user signs in, published for saved itineraries';
COMMENT ON COLUMN itineraries.session_id IS 'Temporary session ID for anonymous draft tracking before sign-in';
