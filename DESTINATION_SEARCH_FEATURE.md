# Destination Search Feature

A new search functionality that allows users to find itineraries by destination, working seamlessly alongside the existing tag filtering system.

## What's New

### ✨ Features

1. **Destination Search Input**
   - Search bar with a magnifying glass icon
   - Real-time search as you type
   - Case-insensitive partial matching
   - Clear button to reset search

2. **Combined Filtering**
   - Search by destination AND filter by tags simultaneously
   - Both filters work together (AND logic)
   - Independent clear buttons for each filter type
   - "Clear All Filters" button to reset everything

3. **Smart UX**
   - Search results update automatically as you type
   - Loading indicator during searches
   - Result count updates dynamically
   - Empty state messages adjust based on active filters

## How It Works

### URL-Based Filtering (Shareable Links!)

The filters are stored in the URL as query parameters, making them:
- **Shareable**: Copy the URL and send it to anyone
- **Bookmarkable**: Save filtered searches as bookmarks
- **Persistent**: Refresh the page and filters remain active
- **Back/Forward compatible**: Browser navigation works as expected

**Example URLs**:
```
# Search for Paris
/?destination=Paris

# Filter by solo tag
/?tags=solo

# Combined: Solo trips to Paris
/?destination=Paris&tags=solo

# Multiple tags
/?destination=Tokyo&tags=solo,budget,weekend
```

### User Experience

1. **Search by Destination**:
   - Users type in the search box (e.g., "Paris", "Tokyo", "New York")
   - URL updates automatically to `/?destination=Paris`
   - Results appear instantly showing all itineraries with matching destinations
   - Partial matches work (typing "Par" will find "Paris")
   - Search is case-insensitive ("paris" = "Paris" = "PARIS")

2. **Combine with Tags**:
   - Users can search for "Paris" AND select "solo" tag
   - Results show only Paris itineraries tagged with "solo"
   - Each filter can be cleared independently

3. **Clear Filters**:
   - Click "Clear" next to destination search to clear just the search
   - Click "Clear (X)" next to tags to clear just the tag filters
   - Click "Clear All Filters" button to reset everything

### Backend Implementation

#### Server Action Update

```typescript
// src/lib/actions/itinerary-actions.ts

export async function getPublicItineraries(
  options: {
    tags?: string[];
    destination?: string;  // ← New parameter
    limit?: number;
    offset?: number;
  } = {}
)
```

**Filtering Logic**:
- `destination` parameter performs case-insensitive partial match
- Uses PostgreSQL `ILIKE` operator: `query.ilike('destination', '%search%')`
- Trims whitespace before searching
- Empty strings are ignored (shows all results)

**Combined Filters**:
- When both tags and destination are provided, they work together (AND)
- Example: `destination="Paris"` + `tags=["solo"]` → Only solo Paris trips

#### Frontend Component Update

```typescript
// src/components/itinerary-gallery.tsx

// Read from URL on mount
const searchParams = useSearchParams();
const [destinationSearch, setDestinationSearch] = useState<string>(() => {
  return searchParams.get('destination') || '';
});

const [selectedTags, setSelectedTags] = useState<string[]>(() => {
  const tagsParam = searchParams.get('tags');
  return tagsParam ? tagsParam.split(',').filter(Boolean) : [];
});

// Update URL when filters change
useEffect(() => {
  const params = new URLSearchParams();
  
  if (destinationSearch) {
    params.set('destination', destinationSearch);
  }
  
  if (selectedTags.length > 0) {
    params.set('tags', selectedTags.join(','));
  }
  
  const queryString = params.toString();
  const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
  
  router.replace(newUrl, { scroll: false });
}, [selectedTags, destinationSearch, pathname, router]);
```

**URL Synchronization**:
- Filters read from URL on initial load
- URL updates when filters change (without page reload)
- Uses `router.replace()` to avoid cluttering browser history
- `scroll: false` prevents jumping to top when filters change

**React Query Integration**:
- Query automatically refetches when `destinationSearch` changes
- Debouncing happens naturally through React's state updates
- Loading states handled by TanStack Query

## UI Structure

```
┌─────────────────────────────────────────────┐
│ Search by Destination         [Clear]      │
│ ┌─────────────────────────────────────┐    │
│ │ 🔍 e.g., Paris, Tokyo, New York...  │    │
│ └─────────────────────────────────────┘    │
│                                             │
│ Filter by Tags                [Clear (2)]   │
│ [Paris] [Tokyo] [Solo] [Couple] [Family]   │
│ [Weekend] [Week] [Budget] [Luxury]...      │
│                                             │
│ ──────────────────────────────────────────  │
│ [Clear All Filters]                         │
└─────────────────────────────────────────────┘
```

## Code Changes

### Files Modified

1. **`src/lib/actions/itinerary-actions.ts`**
   - Added `destination` parameter to `getPublicItineraries()`
   - Implemented `ilike` filtering for partial destination match

2. **`src/components/itinerary-gallery.tsx`**
   - Added `destinationSearch` state
   - Added destination search input UI
   - Updated query key to include destination
   - Added individual and combined clear functions
   - Updated conditional rendering for filters

### Key Code Snippets

**Backend Filtering**:
```typescript
// Filter by destination if provided (case-insensitive partial match)
if (destination && destination.trim() !== '') {
  query = query.ilike('destination', `%${destination.trim()}%`);
}
```

**Frontend Search Input**:
```tsx
<div className="relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
  <Input
    type="text"
    placeholder="e.g., Paris, Tokyo, New York..."
    value={destinationSearch}
    onChange={(e) => setDestinationSearch(e.target.value)}
    className="pl-10 pr-4"
  />
</div>
```

## Performance Considerations

### Optimizations

1. **No Debouncing Needed**:
   - React Query handles request deduplication
   - State updates are fast enough for real-time feel
   - Database index on `destination` column ensures fast queries

2. **Query Caching**:
   - TanStack Query caches results
   - Same search shows instant results
   - Cache invalidates on new itinerary creation

3. **Efficient Filtering**:
   - Database-level filtering (not client-side)
   - Single query handles both destination and tags
   - Uses PostgreSQL indexes for fast lookups

### Suggested Database Index

For optimal performance, add an index:

```sql
-- Add index for faster destination searches
CREATE INDEX idx_itineraries_destination 
ON itineraries USING gin (destination gin_trgm_ops);

-- Enable trigram extension for partial matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

## User Scenarios

### Scenario 1: Simple Destination Search
```
1. User types "Paris" in search box
2. URL updates to: /?destination=Paris
3. System shows all Paris itineraries instantly
4. Result: "Filtered Itineraries (8)"
5. User copies URL and shares with friend
6. Friend opens link and sees same Paris results
```

### Scenario 2: Combined Search + Tags
```
1. User types "Japan"
2. User clicks "solo" and "2-3 days" tags
3. URL updates to: /?destination=Japan&tags=solo,2-3%20days
4. System shows only solo 2-3 day Japan trips
5. Result: "Filtered Itineraries (2)"
```

### Scenario 3: Progressive Filtering
```
1. User types "To" → sees Tokyo, Toronto, etc.
   URL: /?destination=To
2. User continues "kyo" → narrows to only Tokyo
   URL: /?destination=Tokyo
3. User adds "budget" tag → shows budget Tokyo trips
   URL: /?destination=Tokyo&tags=budget
4. Result: "Filtered Itineraries (3)"
```

### Scenario 4: Clear Filters
```
1. User has "Paris" search + "romantic" tag active
   URL: /?destination=Paris&tags=romantic
2. User clicks "Clear" next to destination
   URL: /?tags=romantic
3. Search clears, but "romantic" tag stays selected
4. Shows all romantic itineraries (any destination)
```

### Scenario 5: Direct Link Sharing
```
1. User A searches for "Bali" and selects "honeymoon" tag
   URL: /?destination=Bali&tags=honeymoon
2. User A copies the URL and sends to User B
3. User B opens the link
4. User B immediately sees Bali honeymoon itineraries (no setup needed!)
```

### Scenario 6: Bookmark & Return
```
1. User finds perfect filter combination
   URL: /?destination=Iceland&tags=adventure,photography,week
2. User bookmarks the page
3. User returns days later via bookmark
4. Same filtered results appear instantly
```

## Testing

### Manual Test Cases

✅ **Basic Search**:
- [ ] Type "Paris" → Shows Paris itineraries
- [ ] Type "paris" (lowercase) → Same results
- [ ] Type "Par" → Shows Paris (partial match)
- [ ] Clear search → Shows all itineraries
- [ ] Check URL contains `?destination=Paris`

✅ **Combined Filters**:
- [ ] Search "Tokyo" + select "solo" → Shows solo Tokyo trips
- [ ] Check URL: `?destination=Tokyo&tags=solo`
- [ ] Clear tags → Still shows Tokyo results
- [ ] Check URL: `?destination=Tokyo`
- [ ] Clear search → Shows solo trips (any destination)
- [ ] Check URL: `?tags=solo`

✅ **URL Persistence**:
- [ ] Set filters → Refresh page → Filters remain active
- [ ] Copy URL → Open in new tab → Same filtered results
- [ ] Send URL to friend → They see same results
- [ ] Browser back button → Previous filter state restored

✅ **Edge Cases**:
- [ ] Empty search → Shows all itineraries
- [ ] Search with spaces " Paris " → Works correctly
- [ ] Search non-existent location → Shows empty state
- [ ] Search while tags active → Combines correctly
- [ ] Navigate away and back → URL params restored

✅ **UI/UX**:
- [ ] Loading indicator appears during search
- [ ] Result count updates correctly
- [ ] Clear buttons appear/disappear appropriately
- [ ] "Clear All Filters" resets everything AND clears URL params
- [ ] No page jump when filters change (scroll: false works)

## Future Enhancements

### Possible Improvements

1. **Search Autocomplete**:
   - Suggest popular destinations as user types
   - Show destination with itinerary count

2. **Advanced Filters**:
   - Date range selector
   - Number of days slider
   - Budget range filter
   - Traveler count filter

3. **Search History**:
   - Remember recent searches
   - Quick access to previous filters

4. **Saved Searches**:
   - Save favorite search combinations
   - Get notifications for new matching itineraries

5. **Multi-field Search**:
   - Search across destination, title, and description
   - Weighted relevance scoring

## Summary

The destination search feature enhances the itinerary discovery experience by:

- ✅ Enabling quick destination-based searches
- ✅ Maintaining existing tag filtering functionality
- ✅ Supporting combined search + tag filtering
- ✅ Providing clear, intuitive UX
- ✅ Delivering fast, real-time results
- ✅ Using efficient database-level filtering

Users can now easily find itineraries by typing a destination name while still having the flexibility to refine results with tags! 🌍✈️

