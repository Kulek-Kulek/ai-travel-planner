# Tag Cleanup Tool - User Guide

A simple admin tool to clean existing tags in your database by removing destination names and deduplicating similar variations.

## Access

**URL**: `/admin/tag-cleanup`

**Requirements**: Admin access only

## Features

### 1. **Preview Mode** 👁️
- Shows what WOULD be cleaned without making changes
- Displays count of itineraries that would be updated
- Shows total tags that would be removed
- Outputs detailed logs to browser console

### 2. **Clean Mode** 🧹
- Actually updates the database
- Removes destination-based tags
- Deduplicates similar variations
- Shows results summary

## What Gets Cleaned

### ❌ Removed Tags

The tool removes:
- **Destination names**: paris, tokyo, new york, rome, etc.
- **Countries**: france, japan, usa, italy, spain, etc.
- **Continents & regions**: europe, asia, north america, etc.
- **Generic location words**: city, town, island, country, etc.
- **Common cities**: 100+ major cities worldwide

### ✅ Kept & Improved Tags

The tool keeps and deduplicates:
- **Duration**: weekend, 3-5 days, week-long
- **Trip type**: city break, beach, adventure, romantic, cultural
- **Group size**: solo, couple, family, friends
- **Interests**: food, history, art, nature, photography
- **Budget**: budget, mid-range, luxury
- **Special**: family-friendly, sustainable, etc.

### 🔄 Deduplication Examples

- `["10 days", "10-day-trip", "10 day trip"]` → `["week-long"]`
- `["city break", "city-break", "citybreak"]` → `["city break"]`
- `["solo travel", "solo trip", "solo"]` → `["solo"]`

## How to Use

### Step 1: Navigate to Tool

1. Go to **Admin Dashboard** (`/admin/itineraries`)
2. Click **"Clean Tags"** button in the top right
3. You'll see the Tag Cleanup Tool page

### Step 2: Preview Changes (Recommended)

1. Click **"Preview Changes"** button
2. Wait for processing (may take a few seconds)
3. See results:
   - Number of itineraries that would be updated
   - Total tags that would be removed
4. **Check browser console** (F12) for detailed logs:
   ```
   Would clean abc123: 9 → 5 tags
     Removed: paris, france, europe, 10-day-trip
   Would clean def456: 12 → 7 tags
     Removed: tokyo, japan, asia, 2 weeks, two-week-trip
   ```

### Step 3: Run Cleanup

1. Click **"Clean All Tags"** button
2. Confirm the action (cannot be easily undone!)
3. Wait for processing
4. See success message with results
5. Check browser console for detailed logs

### Step 4: Verify Results

1. Go back to **Admin Dashboard**
2. Click on some itineraries
3. Verify tags look clean and useful
4. Check the public gallery filters to see improved tag list

## Safety Features

- ✅ **Admin-only access**: Only admins can run cleanup
- ✅ **Preview mode**: Test before applying changes
- ✅ **Confirmation dialog**: Must confirm before cleaning
- ✅ **Detailed logging**: Full transparency in console
- ✅ **Non-destructive**: Only updates tags, doesn't delete itineraries

## Example Transformation

### Before Cleanup

```json
{
  "id": "abc123",
  "destination": "Paris",
  "tags": [
    "paris",
    "france",
    "europe",
    "10 days",
    "10-day-trip",
    "romantic",
    "couple",
    "city break",
    "city-break",
    "food",
    "art",
    "history"
  ]
}
```

### After Cleanup

```json
{
  "id": "abc123",
  "destination": "Paris",
  "tags": [
    "week-long",
    "romantic",
    "couple",
    "city break",
    "food",
    "art",
    "history"
  ]
}
```

**Result**: 12 tags → 7 tags (removed 5 redundant tags)

## When to Use

### ✅ Good Times to Run Cleanup

- After importing legacy data
- After changing tag generation logic
- When you notice too many location-based tags in filters
- When users report confusing or duplicate filter options
- After initial setup with test data

### ❌ Don't Run Cleanup

- While users are actively creating itineraries (low risk, but avoid anyway)
- If you're unsure about the results (preview first!)
- Without checking preview results first

## Troubleshooting

### "Unauthorized" Error
- **Solution**: Make sure you're logged in as an admin
- Check your `profiles` table has `is_admin = true`

### Preview Shows No Changes
- **Good news**: Your tags are already clean!
- All itineraries already have proper tags without destinations

### Too Many Tags Removed
- **Review**: Check the preview console logs
- **Verify**: Make sure destination search is working (tags don't need destinations)
- **Remember**: Destination names aren't needed as tags (users search by destination)

### Need to Undo Changes
- **Option 1**: Re-generate itineraries (tags will be recreated)
- **Option 2**: Restore from database backup (if you made one)
- **Option 3**: Manually edit tags in database for specific itineraries

## Technical Details

### Server Actions

- **`previewTagCleanup()`**: Simulates cleanup without changing database
- **`cleanAllTags()`**: Performs actual cleanup and updates database

### Logic

1. Fetches all itineraries with tags
2. For each itinerary:
   - Filters out destination-related tags
   - Removes common countries/cities
   - Deduplicates similar variations
   - Normalizes format
3. Only updates itineraries where tags actually changed
4. Returns statistics on changes made

### Performance

- Handles hundreds of itineraries efficiently
- Processes sequentially to avoid overwhelming database
- Logs progress for monitoring
- Typically completes in 5-15 seconds

## Best Practices

1. **Always preview first** before running cleanup
2. **Check console logs** to understand what will change
3. **Run during low-traffic times** if you have many itineraries
4. **Verify results** after cleanup by checking a few itineraries
5. **Consider database backup** before first run (optional but safe)

## Future Improvements

Potential enhancements:
- Batch processing with progress bar
- Undo functionality
- Selective cleanup (by date range or specific tags)
- Scheduled automatic cleanup
- Tag usage statistics before/after

## Summary

The Tag Cleanup Tool:
- ✅ Removes destination names from tags
- ✅ Deduplicates similar tag variations
- ✅ Makes filters more useful and consistent
- ✅ Improves user experience when searching
- ✅ Maintains tag quality over time
- ✅ Easy to use with preview mode
- ✅ Safe with admin-only access

Your tag filters will be clean, consistent, and much more useful! 🎉


