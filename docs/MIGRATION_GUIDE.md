# Database Migration Guide

## Problem: Missing Database Columns

If you see errors like:
```
Could not find the 'has_accessibility_needs' column of 'itineraries' in the schema cache
```

This means your database needs to be migrated.

## Quick Fix: Apply Migrations via Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **SQL Editor**
4. Copy and paste this SQL:

```sql
-- Check if columns already exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'itineraries' 
AND column_name IN ('start_date', 'end_date', 'children', 'child_ages', 'has_accessibility_needs')
ORDER BY column_name;

-- If any columns are missing, run these:

-- Migration 006: Add dates and children (if not exists)
ALTER TABLE itineraries
ADD COLUMN IF NOT EXISTS start_date date,
ADD COLUMN IF NOT EXISTS end_date date,
ADD COLUMN IF NOT EXISTS children integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS child_ages integer[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS itineraries_start_date_idx ON itineraries(start_date);

COMMENT ON COLUMN itineraries.start_date IS 'Optional start date of the trip';
COMMENT ON COLUMN itineraries.end_date IS 'Optional end date of the trip';
COMMENT ON COLUMN itineraries.children IS 'Number of children (0-17 years old)';
COMMENT ON COLUMN itineraries.child_ages IS 'Array of children ages';

-- Migration 007: Add accessibility flag (if not exists)
ALTER TABLE itineraries
ADD COLUMN IF NOT EXISTS has_accessibility_needs boolean DEFAULT false;

COMMENT ON COLUMN itineraries.has_accessibility_needs IS 'Whether the trip requires accessibility accommodations';

-- Verify all columns now exist
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'itineraries' 
ORDER BY ordinal_position;
```

5. Click **Run** or press `Ctrl+Enter`
6. You should see a list of all columns including the new ones

## Proper Way: Use Supabase CLI (For Future Migrations)

### Setup

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project (get project ID from Supabase dashboard URL)
supabase link --project-ref YOUR_PROJECT_ID
```

### Apply Migrations

```bash
# Push all migrations to production
supabase db push

# Or apply specific migration
supabase db push --file supabase/migrations/007_add_accessibility_flag.sql
```

## After Migration

1. **Restart your Vercel deployment** (if on Vercel) to clear any caches
2. **Clear browser cache** and reload
3. **Test creating an itinerary** without being logged in

## Expected Columns in `itineraries` Table

After all migrations, your table should have:

- `id` (uuid, primary key)
- `user_id` (uuid, nullable - NULL for anonymous)
- `destination` (text)
- `days` (integer)
- `travelers` (integer)
- `notes` (text, nullable)
- `ai_plan` (jsonb)
- `tags` (text[])
- `is_private` (boolean)
- `status` (text, nullable)
- `image_url` (text, nullable)
- `image_photographer` (text, nullable)
- `image_photographer_url` (text, nullable)
- `start_date` (date, nullable) ← Should exist after migration 006
- `end_date` (date, nullable) ← Should exist after migration 006
- `children` (integer, default 0) ← Should exist after migration 006
- `child_ages` (integer[], default '{}') ← Should exist after migration 006
- `has_accessibility_needs` (boolean, default false) ← Should exist after migration 007
- `created_at` (timestamp with time zone)
- `updated_at` (timestamp with time zone)

## Troubleshooting

### Still getting errors after migration?

1. Check if migration was successful:
   ```sql
   SELECT * FROM information_schema.columns 
   WHERE table_name = 'itineraries';
   ```

2. Reload schema cache (Supabase Dashboard → API → Reload Schema Cache)

3. Restart your application

### RLS Policy Issues?

If you get "row-level security policy" errors:

```sql
-- Check existing policies
SELECT * FROM pg_policies WHERE tablename = 'itineraries';

-- Ensure anonymous users can create public itineraries
CREATE POLICY IF NOT EXISTS "Anonymous users can create public itineraries"
  ON itineraries FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL AND is_private = false);
```

