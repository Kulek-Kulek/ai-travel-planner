# Quick Test Guide - Like Feature

## Before You Start

⚠️ **IMPORTANT**: You must apply migrations 011 and 012 first!

See `APPLY_MIGRATION_INSTRUCTIONS.md` for detailed steps.

## Quick Test Steps

### 1. Apply Migrations
Go to Supabase Dashboard → SQL Editor and run both migrations from `APPLY_MIGRATION_INSTRUCTIONS.md`

### 2. Test Gallery View
1. Open your homepage: `http://localhost:3000`
2. Scroll to the itinerary gallery
3. Look for the action button row at the bottom of each card (separate line)
4. You should see 3 buttons: "12 👍" (like), "🔗" (share), "❤️" (bucket list)
5. Click the like button (first one with number and thumbs-up)
6. ✅ Verify:
   - Thumbs-up icon bounces ONCE (not continuously)
   - Count increases by 1 (count is on LEFT of icon)
   - Button turns blue
   - Toast appears: "Thanks for your thumbs up! 👍"
   - Button shows as "Liked"
   - Animation stops after one bounce

### 3. Test Duplicate Prevention
1. Try clicking the same thumbs-up button again
2. ✅ Verify:
   - Button doesn't respond
   - Toast appears: "You already liked this itinerary!"

### 4. Test Persistence
1. Refresh the page
2. ✅ Verify:
   - Like count is still increased
   - Button still shows blue "Liked" state

### 5. Test Detail Page
1. Click "View →" on any itinerary card
2. Look at the top-right of the page header
3. You should see 3 large buttons in a row
4. Click the first button showing count and thumbs-up (e.g., "5 👍")
5. ✅ Verify:
   - Thumbs-up icon bounces once (not continuously)
   - Count increases by 1 (count is on LEFT of icon)
   - Button turns solid blue
   - Toast appears with success message
   - Share and heart buttons are also visible (placeholders)

### 6. Test Anonymous User
1. Open page in incognito/private browsing
2. Try liking an itinerary
3. ✅ Verify:
   - Like button works without being logged in
   - Count persists on refresh

### 7. Test Database
1. Go to Supabase Dashboard → Table Editor
2. Open the `itineraries` table
3. ✅ Verify:
   - New `likes` column exists
   - Like counts match what you see in the UI

## Expected Results

### Gallery Card (New Layout)
```
┌─────────────────────────────────────┐
│ Paris                               │
│ 📅 3 days                           │
│ 👥 2 adults                         │
│ ─────────────────────────────────── │
│                                     │
│ Created: 10/25/2025      View →     │
│ by John Doe                         │
│                                     │
│ [12 👍]  [🔗]  [❤️]                 │
│  ↑ Like  ↑Share ↑Bucket list        │
│  (Action buttons on separate row)   │
└─────────────────────────────────────┘
```

### Detail Page (New Layout)
```
┌─────────────────────────────────────┐
│  Paris          [5 👍] [🔗] [❤️]   │
│   ↑ Title       ↑ Action buttons    │
│                                     │
│  📅 3 days  👥 2 adults             │
└─────────────────────────────────────┘
```

### Key UI Features to Check
- ✅ Like count appears on LEFT of thumbs-up icon
- ✅ Icon bounces ONCE when clicked, then stops
- ✅ Action buttons are in their own row (gallery)
- ✅ Share and heart buttons show "coming soon" toast
- ✅ Hover effects: blue (like), green (share), red (heart)

## Troubleshooting

### Action buttons not visible?
- Did you apply migration 012?
- Check browser console for errors
- Verify TypeScript types are updated
- Look for them in a separate row below creator info

### Icon keeps bouncing continuously?
- This was the old bug - should be fixed now
- Animation should stop after 500ms
- If it continues, check that `justLiked` state is being set/reset

### "Failed to like itinerary" error?
- Check Supabase RLS policies on `itineraries` table
- Verify the `likes` column was created
- Check network tab for API errors

### Like count not persisting?
- Check Supabase database connection
- Verify the `likeItinerary` server action is working
- Check browser console for errors

### "Already liked" message immediately?
- Clear localStorage: `localStorage.clear()`
- Or use incognito mode

### Count appears on right side instead of left?
- Make sure you're running the latest code
- Count should be: `{currentLikes}` THEN thumbs-up icon

## Marketing Query Examples

Once you have some likes, test these queries in Supabase SQL Editor:

### Top 5 Most Liked Itineraries
```sql
SELECT 
  ai_plan->>'city' as city,
  destination,
  likes,
  created_at
FROM itineraries
WHERE is_private = false AND status = 'published'
ORDER BY likes DESC
LIMIT 5;
```

### Total Likes by Destination
```sql
SELECT 
  ai_plan->>'city' as city,
  COUNT(*) as itinerary_count,
  SUM(likes) as total_likes,
  AVG(likes) as avg_likes
FROM itineraries
WHERE is_private = false AND status = 'published'
GROUP BY ai_plan->>'city'
ORDER BY total_likes DESC;
```

## Success Criteria

✅ All tests pass
✅ Like buttons appear in both gallery and detail views
✅ Clicks are registered immediately (optimistic updates)
✅ Duplicate likes are prevented
✅ Data persists in database
✅ Works for both authenticated and anonymous users
✅ Toast notifications appear correctly

## Need Help?

Check the full documentation in:
- `LIKE_FEATURE_IMPLEMENTATION.md` - Complete feature documentation
- `APPLY_MIGRATION_INSTRUCTIONS.md` - Migration steps

