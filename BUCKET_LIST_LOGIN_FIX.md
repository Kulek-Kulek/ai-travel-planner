# Bucket List Login Flow Fix

## Problem
When a user who is **not logged in** clicks the heart icon to add an itinerary to their bucket list:
1. They get redirected to login (correct)
2. They log in successfully
3. Return to homepage BUT:
   - ❌ The itinerary is NOT added to bucket list
   - ❌ The heart icon is still empty/gray
   - ❌ They have to click the heart again

## Solution Implemented

### 1. Store Intent Before Redirect
**File:** `src/components/itinerary-card.tsx`

When user clicks heart without being logged in:
```typescript
if (!user) {
  // Store the itinerary ID they want to add
  sessionStorage.setItem('pendingBucketListAdd', id);
  toast.info('Please sign in to save to your bucket list');
  // Redirect back to current page after login
  const currentPath = window.location.pathname;
  router.push(`/sign-in?redirectTo=${currentPath}`);
  return;
}
```

**What happens:**
- Saves the itinerary ID to `sessionStorage`
- Redirects to sign-in page
- Passes current page URL as `redirectTo` parameter

### 2. Auto-Add After Login
**File:** `src/app/page.tsx`

After successful login, checks for pending bucket list additions:
```typescript
useEffect(() => {
  const checkAuth = async () => {
    const user = await getUser();
    const isAuth = !!user;
    setIsAuthenticated(isAuth);
    
    if (isAuth) {
      // Check if there's a pending bucket list add
      const pendingBucketListAdd = sessionStorage.getItem('pendingBucketListAdd');
      if (pendingBucketListAdd) {
        // Automatically add it
        import('@/lib/actions/itinerary-actions').then(({ addToBucketList }) => {
          addToBucketList(pendingBucketListAdd).then((result) => {
            if (result.success) {
              toast.success('Added to your bucket list! ❤️');
              // Refresh bucket list state
              queryClient.invalidateQueries({ queryKey: ['bucket-list-ids'] });
              queryClient.invalidateQueries({ queryKey: ['bucket-list'] });
            }
          });
        });
        // Clear the pending add
        sessionStorage.removeItem('pendingBucketListAdd');
      }
    }
  };
  checkAuth();
}, [queryClient]);
```

**What happens:**
- After login, checks `sessionStorage` for pending bucket list add
- If found, automatically adds the itinerary to bucket list
- Shows success toast
- Invalidates query cache to refresh UI
- Clears the pending add from storage

### 3. Refresh Bucket List State
**File:** `src/components/itinerary-gallery.tsx`

Added window focus listener to refresh bucket list status when user returns:
```typescript
useEffect(() => {
  async function loadBucketListIds() {
    // ... load bucket list IDs
  }
  
  loadBucketListIds();
  
  // Listen for window focus to refresh when user returns from login
  const handleFocus = () => {
    loadBucketListIds();
  };
  
  window.addEventListener('focus', handleFocus);
  return () => window.removeEventListener('focus', handleFocus);
}, [itinerariesData]);
```

## User Flow Now

1. **User clicks heart** (not logged in)
   - Intent stored in sessionStorage
   - Redirected to `/sign-in?redirectTo=/` (current page)
   - Toast: "Please sign in to save to your bucket list"

2. **User logs in**
   - Redirected back to homepage
   - App detects pending bucket list add
   - **Automatically adds itinerary** to bucket list
   - Toast: "Added to your bucket list! ❤️"

3. **Heart icon updates**
   - Query cache invalidated
   - Bucket list IDs refreshed
   - Heart icon turns **red/filled** ❤️

## Technical Details

### SessionStorage Keys Used
- `pendingBucketListAdd`: Stores itinerary ID to add after login

### Query Keys Invalidated
- `bucket-list-ids`: Refreshes bucket list status for all cards
- `bucket-list`: Refreshes full bucket list page

### Benefits
✅ Seamless user experience  
✅ No need to click twice  
✅ Intent preserved across login flow  
✅ Heart icon updates automatically  
✅ Works on any page (homepage, search, etc.)

## Testing

To test this flow:
1. Log out
2. Go to homepage
3. Click heart on any itinerary card
4. Log in with valid credentials
5. Should see:
   - Success toast: "Added to your bucket list! ❤️"
   - Heart icon is now red/filled
   - Itinerary appears in bucket list page

