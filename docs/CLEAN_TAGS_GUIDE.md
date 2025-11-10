# Tag Cleanup Guide

This guide helps you clean up existing tags in your database to remove destination-based duplicates and improve tag quality.

## What Was Fixed

### Old Tag System Issues:
❌ Destination names as tags (e.g., "paris", "france", "tokyo")
❌ Duplicate variations (e.g., "10 days" and "10-day-trip")
❌ Too many redundant tags
❌ Inconsistent formatting
❌ Each itinerary created new tag variations independently

### New Tag System:
✅ No destination names (use destination search instead)
✅ Deduplicated tags (only one version)
✅ Focused, useful categories
✅ Consistent format (e.g., "3-5 days", "city break")
✅ **Tag Reuse**: AI checks existing tags and reuses them for consistency
✅ **Smart Selection**: New tags only created when existing ones don't fit

## Tag Categories (New System)

New itineraries will automatically get tags in these categories:

1. **Duration** (pick one):
   - `weekend`
   - `3-5 days`
   - `week-long`
   - `1-2 days`
   - `extended trip`

2. **Trip Type** (1-2 tags):
   - `city break`
   - `beach`
   - `adventure`
   - `cultural`
   - `romantic`
   - `relaxation`
   - `road trip`
   - `backpacking`

3. **Group Size** (pick one):
   - `solo`
   - `couple`
   - `family`
   - `friends`
   - `group`

4. **Interests** (2-3 tags):
   - `food`
   - `history`
   - `art`
   - `nature`
   - `shopping`
   - `nightlife`
   - `museums`
   - `outdoors`
   - `photography`
   - `architecture`
   - `wine`
   - `wellness`

5. **Budget** (pick one):
   - `budget`
   - `mid-range`
   - `luxury`

6. **Special Categories** (if applicable):
   - `family-friendly`
   - `pet-friendly`
   - `accessible`
   - `sustainable`
   - `off-the-beaten-path`

## Automatic Cleanup & Smart Tag Reuse

The new system automatically:
- ✅ **Fetches existing tags** from database before generating new ones
- ✅ **Prioritizes reusing** existing tags when they match the itinerary
- ✅ **Removes destination names** from tags
- ✅ **Deduplicates similar tags** (e.g., keeps "weekend" instead of creating "weekend-trip")
- ✅ **Normalizes tag format** to maintain consistency
- ✅ **Limits to 12 relevant tags** per itinerary
- ✅ **Creates new tags** only when existing ones don't accurately describe the trip

### How Tag Reuse Works

1. **Before generating tags**, the system fetches all unique existing tags from public itineraries
2. **Passes existing tags to AI** with instructions to prioritize them
3. **AI selects matching tags** from existing set when applicable
4. **Only creates new tags** when necessary (e.g., new trip type not seen before)

Example:
```
Existing tags in DB: ["solo", "weekend", "food", "history", "mid-range"]

New itinerary: Solo weekend food tour
AI output: ["solo", "weekend", "food", "mid-range"]  ← All reused!

New itinerary: Skydiving adventure
AI output: ["solo", "weekend", "adventure"]  ← "adventure" is new, rest reused
```

This ensures:
- **Consistency**: All "solo" trips use the same "solo" tag (not "solo-travel", "traveling-solo", etc.)
- **Findability**: Users can filter reliably across all itineraries
- **Clean tag list**: Tag proliferation is prevented

## Manual Database Cleanup (Optional)

If you want to clean up existing itineraries in your database, you have two options:

### Option 1: SQL Script (Quick)

Run this SQL in your Supabase SQL Editor to remove location-based tags:

```sql
-- Backup first (optional but recommended)
CREATE TABLE itineraries_backup AS SELECT * FROM itineraries;

-- Common destination/location words to remove
WITH location_tags AS (
  SELECT DISTINCT unnest(tags) as tag
  FROM itineraries
  WHERE tags && ARRAY[
    'paris', 'france', 'tokyo', 'japan', 'london', 'uk', 'rome', 'italy',
    'barcelona', 'spain', 'berlin', 'germany', 'amsterdam', 'netherlands',
    'new york', 'usa', 'los angeles', 'san francisco', 'chicago',
    'sydney', 'australia', 'melbourne', 'bangkok', 'thailand',
    'dubai', 'uae', 'singapore', 'hong kong', 'seoul', 'korea',
    'europe', 'asia', 'america', 'africa', 'oceania',
    'city', 'town', 'island', 'country', 'region'
  ]
)

-- Remove location tags from all itineraries
UPDATE itineraries
SET tags = (
  SELECT array_agg(tag)
  FROM unnest(tags) tag
  WHERE tag NOT IN (SELECT tag FROM location_tags)
)
WHERE array_length(tags, 1) > 0;

-- Remove null arrays
UPDATE itineraries
SET tags = ARRAY[]::text[]
WHERE tags IS NULL;
```

### Option 2: Regenerate All Tags (Thorough but requires credits)

Create a script to regenerate tags for existing itineraries:

```typescript
// scripts/regenerate-tags.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Need service role
);

async function regenerateAllTags() {
  // Get all itineraries
  const { data: itineraries } = await supabase
    .from('itineraries')
    .select('id, destination, ai_plan');
  
  if (!itineraries) return;
  
  console.log(`Processing ${itineraries.length} itineraries...`);
  
  for (const itinerary of itineraries) {
    try {
      // Parse AI plan
      const aiPlan = JSON.parse(itinerary.ai_plan);
      
      // Generate new tags (you'd need to call your AI tag generation)
      // This is just a simplified example
      const newTags = generateSimpleTags(itinerary, aiPlan);
      
      // Update itinerary
      await supabase
        .from('itineraries')
        .update({ tags: newTags })
        .eq('id', itinerary.id);
      
      console.log(`✓ Updated ${itinerary.id}`);
    } catch (error) {
      console.error(`✗ Failed ${itinerary.id}:`, error);
    }
  }
  
  console.log('Done!');
}

function generateSimpleTags(itinerary: any, aiPlan: any): string[] {
  // Simplified tag generation (no AI calls)
  const tags: string[] = [];
  
  // Duration tags based on days
  const days = aiPlan.days?.length || 0;
  if (days <= 2) tags.push('weekend');
  else if (days <= 5) tags.push('3-5 days');
  else if (days <= 7) tags.push('week-long');
  else tags.push('extended trip');
  
  // Add generic tags
  tags.push('cultural', 'mid-range');
  
  return tags;
}

regenerateAllTags();
```

Run it:
```bash
npx tsx scripts/regenerate-tags.ts
```

## Testing New Tags

1. **Create a new itinerary** after the code changes
2. **Check the tags** - they should NOT include destination names
3. **Verify deduplication** - no similar variations
4. **Confirm filtering works** - tags appear in gallery filter

Example good tags for "Paris, 5 days, couple, romantic trip":
```json
[
  "3-5 days",
  "couple",
  "romantic",
  "city break",
  "cultural",
  "food",
  "art",
  "mid-range"
]
```

## Monitoring Tag Quality

After cleanup, check your tags:

```sql
-- See all unique tags
SELECT DISTINCT unnest(tags) as tag
FROM itineraries
ORDER BY tag;

-- Count tag usage
SELECT unnest(tags) as tag, COUNT(*) as count
FROM itineraries
GROUP BY tag
ORDER BY count DESC;

-- Find itineraries with destination in tags (should be none)
SELECT id, destination, tags
FROM itineraries
WHERE destination ILIKE ANY(
  SELECT '%' || unnest(tags) || '%'
  FROM itineraries
);
```

## Rolling Back (If Needed)

If you made a backup:

```sql
-- Restore from backup
UPDATE itineraries i
SET tags = b.tags
FROM itineraries_backup b
WHERE i.id = b.id;

-- Drop backup
DROP TABLE itineraries_backup;
```

## Summary

✅ **For New Itineraries**: Tags are automatically clean (no action needed)
✅ **For Existing Itineraries**: Run SQL cleanup or wait for natural refresh
✅ **Tag Quality**: Much better filtering experience for users
✅ **Destination Search**: Use the search box instead of destination tags

Your filters will now show useful categories like "solo", "weekend", "adventure", "food" instead of city names! 🎉

