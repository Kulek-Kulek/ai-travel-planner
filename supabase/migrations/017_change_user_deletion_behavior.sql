-- Migration: Change user deletion behavior to preserve itineraries
-- Purpose: When a user is deleted, keep their itineraries but set user_id to NULL
--          This preserves public content while removing user association

-- ============================================================
-- Fix itineraries foreign key constraint
-- ============================================================

-- Drop existing foreign key constraint
ALTER TABLE itineraries 
DROP CONSTRAINT IF EXISTS itineraries_user_id_fkey;

-- Add new constraint with SET NULL instead of CASCADE
ALTER TABLE itineraries
ADD CONSTRAINT itineraries_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE SET NULL;

COMMENT ON CONSTRAINT itineraries_user_id_fkey ON itineraries IS 
  'Sets user_id to NULL when user is deleted, preserving itineraries';

-- ============================================================
-- Fix bucket_list foreign key constraint
-- ============================================================

ALTER TABLE bucket_list
DROP CONSTRAINT IF EXISTS bucket_list_user_id_fkey;

ALTER TABLE bucket_list
ADD CONSTRAINT bucket_list_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;  -- Keep CASCADE for bucket list (personal data)

-- ============================================================
-- Create deleted_users table for audit trail
-- ============================================================

CREATE TABLE IF NOT EXISTS deleted_users (
  id UUID PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  subscription_tier TEXT,
  deleted_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_reason TEXT,
  itineraries_count INTEGER,
  plans_created_count INTEGER
);

COMMENT ON TABLE deleted_users IS 'Audit trail of deleted users for analytics and support';

-- ============================================================
-- Create function to archive user data before deletion
-- ============================================================

CREATE OR REPLACE FUNCTION archive_deleted_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_itinerary_count INTEGER;
BEGIN
  -- Count itineraries
  SELECT COUNT(*) INTO v_itinerary_count
  FROM itineraries
  WHERE user_id = OLD.id;
  
  -- Get profile data and archive
  INSERT INTO deleted_users (
    id, 
    email, 
    full_name, 
    subscription_tier,
    itineraries_count,
    plans_created_count
  )
  SELECT 
    OLD.id,
    OLD.email,
    p.full_name,
    p.subscription_tier,
    v_itinerary_count,
    COALESCE(p.plans_created_count, 0)
  FROM profiles p
  WHERE p.id = OLD.id;
  
  RETURN OLD;
END;
$$;

-- Create trigger on auth.users deletion
DROP TRIGGER IF EXISTS archive_user_before_delete ON auth.users;
CREATE TRIGGER archive_user_before_delete
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION archive_deleted_user();

COMMENT ON FUNCTION archive_deleted_user IS 'Archives user data before deletion for audit trail';

-- ============================================================
-- Update itineraries to anonymize when user is deleted
-- ============================================================

-- For itineraries that lose their user (user_id becomes NULL),
-- we can optionally mark them as "Anonymous" in a creator_name column

-- Add creator_name column if it doesn't exist
ALTER TABLE itineraries 
ADD COLUMN IF NOT EXISTS creator_name TEXT;

-- Create function to set creator name to "Anonymous" when user is deleted
CREATE OR REPLACE FUNCTION anonymize_orphaned_itinerary()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If user_id changed from something to NULL
  IF OLD.user_id IS NOT NULL AND NEW.user_id IS NULL THEN
    NEW.creator_name = 'Anonymous User';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS anonymize_itinerary_on_user_delete ON itineraries;
CREATE TRIGGER anonymize_itinerary_on_user_delete
  BEFORE UPDATE OF user_id ON itineraries
  FOR EACH ROW
  EXECUTE FUNCTION anonymize_orphaned_itinerary();

COMMENT ON FUNCTION anonymize_orphaned_itinerary IS 'Sets creator_name to Anonymous when user is deleted';

