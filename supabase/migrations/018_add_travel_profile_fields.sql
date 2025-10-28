-- Migration: Add travel profile fields for AI-generated personality profiles
-- This enables the agentic travel profile quiz system

-- Add new columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS travel_personality TEXT,
ADD COLUMN IF NOT EXISTS profile_summary TEXT,
ADD COLUMN IF NOT EXISTS accommodation_preferences TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS activity_preferences TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS dining_preferences TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS social_preferences TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS quiz_responses JSONB,
ADD COLUMN IF NOT EXISTS quiz_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS profile_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS profile_confidence_score DECIMAL(3,2) CHECK (profile_confidence_score >= 0 AND profile_confidence_score <= 1);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_quiz_completed 
ON profiles(quiz_completed_at) 
WHERE quiz_completed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_travel_personality 
ON profiles(travel_personality)
WHERE travel_personality IS NOT NULL;

-- Add helpful comments
COMMENT ON COLUMN profiles.travel_personality IS 'AI-generated travel archetype (e.g., "The Sunset Chaser")';
COMMENT ON COLUMN profiles.profile_summary IS 'Engaging 1-paragraph summary of user''s travel personality';
COMMENT ON COLUMN profiles.activity_preferences IS 'Specific activities user loves (e.g., "street food tours", "sunrise hikes")';
COMMENT ON COLUMN profiles.dining_preferences IS 'Dining style preferences (e.g., "local gems", "street food hunter")';
COMMENT ON COLUMN profiles.social_preferences IS 'Social interaction preferences during travel';
COMMENT ON COLUMN profiles.quiz_responses IS 'Raw quiz answers in JSONB format for profile regeneration';
COMMENT ON COLUMN profiles.quiz_completed_at IS 'Timestamp when user completed the travel personality quiz';
COMMENT ON COLUMN profiles.profile_version IS 'Version number of profile generation algorithm (for A/B testing)';
COMMENT ON COLUMN profiles.profile_confidence_score IS 'AI confidence score in profile accuracy (0-1 scale)';

-- Grant necessary permissions (already handled by RLS policies, but confirming)
-- RLS policies from previous migrations already cover these new columns

