# Migration 019: Fix Edit Count NULL Values

## ⚠️ CRITICAL FIX - Run Immediately

This migration fixes a bug where existing itineraries have `NULL` values for `edit_count`, allowing free tier users to bypass edit limits and potentially cause unlimited AI costs.

## What This Fixes

**Before:** Free tier users could edit itineraries endlessly because NULL edit_count wasn't being properly checked.

**After:** All itineraries will have `edit_count = 0`, and the limit of 1 edit per plan for free tier will be enforced.

## How to Run

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the contents of `supabase/migrations/019_fix_edit_count_nulls.sql`
5. Click **Run** or press `Ctrl/Cmd + Enter`
6. Verify the output shows successful update

### Option 2: Supabase CLI

```bash
cd travel-planner
supabase db push
```

## Verification

After running the migration, verify it worked:

```sql
-- Check that no NULL edit_count values remain
SELECT COUNT(*) FROM itineraries WHERE edit_count IS NULL;
-- Should return 0

-- Check that existing itineraries now have edit_count = 0
SELECT id, destination, edit_count FROM itineraries LIMIT 10;
-- All should show edit_count = 0 (unless already edited)
```

## Additional Changes in This Update

### Added Logging

The code now logs edit attempts to help debug:
- `🔍 Free tier edit check` - Shows current edit count before validation
- `❌ Edit blocked` - When limit is reached
- `✅ Edit allowed` - When edit is permitted
- `📝 Incrementing edit_count` - When edit count is updated

### What to Watch For

Monitor your server logs for:
- Users hitting edit limits (expected for free tier after 1 edit)
- Any errors updating edit_count
- Unexpected edit counts (should always be 0 or 1 for free tier)

## Impact

- **Free tier users:** Can now only edit each plan once (as intended)
- **Paid tier users:** No change (unlimited edits)
- **Cost protection:** Prevents abuse of AI regeneration on free tier

## Rollback

If you need to rollback (not recommended):

```sql
-- Remove the NOT NULL constraint (not applicable, we're just updating values)
-- This migration is safe and doesn't change schema
```

This migration only updates data, not schema, so it's very safe to run.

