# Fix: Anonymous Itinerary Not Saving After Authentication

## Problem

When an anonymous user created an itinerary and then authenticated, the itinerary was not being saved to their account. The logs showed:
- "Mutation success - User authenticated? false"
- "📝 Anonymous user created itinerary, showing preview"

The itinerary remained as a draft and was not claimed by the user after authentication.

## Root Cause

The issue had three parts:

### 1. Missing Form Data
The sign-up and sign-in forms were reading the `itineraryId` from the URL and storing it in sessionStorage, but they were **not passing it to the server action** via FormData. The server actions (`signUp` and `signIn`) tried to read `itineraryId` from FormData to include it in the redirect URL, but it was never there.

### 2. Race Condition with Load Itinerary Effect
The `loadItinerary` effect had dependencies `[queryClient, galleryRef]`, meaning it only ran **once on mount**. Even with a 500ms delay, if authentication hadn't fully settled, the effect would run before the user was authenticated and wouldn't claim the draft. Critically, it would **never re-run** when authentication completed because the dependencies didn't change.

### 3. Wrong Location for Claiming Logic
The claiming logic was in a separate effect that ran too early, before auth was established. The claiming should happen **immediately after** authentication is confirmed, not in a separate effect with its own timing.

## Solution

### Changes Made

#### 1. Added Hidden Input Fields (sign-up/sign-in pages)
Added hidden input fields to pass `itineraryId` through FormData:

**File: `src/app/(auth)/sign-up/page.tsx`**
```tsx
<form action={handleSubmit} className="space-y-6">
  {/* Hidden itineraryId field */}
  {draftId && (
    <input type="hidden" name="itineraryId" value={draftId} />
  )}
  
  {/* Rest of form fields */}
</form>
```

**File: `src/app/(auth)/sign-in/page.tsx`**
Same change applied.

#### 2. Moved Claiming Logic to Auth Check Effect
The crucial fix: moved the itinerary claiming logic into the auth check effect so it runs **immediately** when authentication is confirmed and an itineraryId is in the URL:

**File: `src/app/page.tsx`**
```tsx
// If user just logged in (transition from not authenticated to authenticated)
if (!wasAuthenticated && isAuth) {
  console.log('🔍 Auth: User just logged in');
  
  const urlParams = new URLSearchParams(window.location.search);
  const urlItineraryId = urlParams.get('itineraryId');
  
  if (urlItineraryId) {
    console.log('🔍 Auth: Found itineraryId in URL, attempting to claim:', urlItineraryId);
    
    // Claim the draft itinerary now that user is authenticated
    (async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const response = await fetch(`/api/itineraries/${urlItineraryId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data && data.data.status === 'draft') {
            const claimResult = await claimDraftItinerary(urlItineraryId);
            
            if (claimResult.success) {
              // Clean up and show success
              sessionStorage.removeItem('createdPlanWhileLoggedOut');
              sessionStorage.removeItem('draftItineraryId');
              sessionStorage.removeItem('itineraryId');
              
              await Promise.all([
                queryClient.refetchQueries({ queryKey: ["public-itineraries"] }),
                queryClient.refetchQueries({ queryKey: ["my-itineraries"] }),
              ]);
              
              toast.success("Itinerary saved to your account!");
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          }
        }
      } catch (error) {
        console.error('Error claiming itinerary:', error);
      }
    })();
  } else {
    // No itineraryId, just clean up
    sessionStorage.removeItem('createdPlanWhileLoggedOut');
    // ... etc
  }
}
```

This ensures claiming happens at the **exact moment** auth is confirmed, eliminating the race condition.

#### 3. Added Debug Logging
Added comprehensive logging to help diagnose issues:

**Client-side (sign-up/sign-in pages):**
- Log when draftId is available
- Log when itineraryId is in FormData
- Log when saving to sessionStorage

**Server-side (auth actions):**
- Log when itineraryId is received from FormData
- Log redirect destinations

## Flow After Fix

1. **Anonymous user creates itinerary:**
   - Draft saved with `user_id=NULL`, `status='draft'`
   - `sessionStorage.setItem('draftItineraryId', itineraryId)`
   - User clicks "Create Free Account"

2. **Redirect to sign-up:**
   - URL: `/sign-up?itineraryId=XXX`
   - Page reads itineraryId from URL
   - Sets `draftId` state
   - Hidden input field contains itineraryId

3. **User submits sign-up form:**
   - FormData includes itineraryId (from hidden input)
   - Server action receives itineraryId
   - Redirects to `/?itineraryId=XXX`

4. **User lands on homepage after auth:**
   - Auth check effect runs, detects user just logged in
   - Sees itineraryId in URL, preserves sessionStorage
   - Load itinerary effect runs
   - Finds itineraryId in URL params
   - Fetches itinerary, sees it's a draft
   - Calls `claimDraftItinerary` to claim it
   - Updates itinerary: `user_id=USER_ID`, `status='published'`
   - Shows success toast
   - Itinerary appears in user's "My Plans"

## Testing

To test the fix:

1. **Open homepage in incognito/private window** (to simulate anonymous user)
2. **Create an itinerary** without logging in
3. **Click "Create Free Account"** button in the auth banner
4. **Sign up** with a new account
5. **Check console logs** - you should see this sequence:
   - `🔍 SignUp handleSubmit: draftId: [UUID]`
   - `🔍 SignUp handleSubmit: formData has itineraryId: true`
   - `🔍 signUp: itineraryId from formData: [UUID]`
   - `🔍 signUp: Redirecting with itineraryId: [UUID]`
   - `🔍 Auth: User just logged in, cleaning up preview state`
   - `🔍 Auth: Found itineraryId in URL, attempting to claim: [UUID]`
   - `🔍 Auth: Fetching itinerary to claim...`
   - `🔍 Auth: Itinerary fetched - status: draft`
   - `🔍 Auth: Claiming draft itinerary...`
   - `🔍 claimDraftItinerary: Claiming itinerary [UUID] for user [USER_ID]`
   - `✅ claimDraftItinerary: Successfully claimed itinerary`
   - `✅ Auth: Itinerary claimed successfully!`
   - `🔍 Auth: Refetching queries...`
   - `✅ Auth: Queries refetched`
   - A success toast: "Itinerary saved to your account!"
6. **Verify** the itinerary is:
   - Shown in the gallery
   - Appears in "My Plans" page
   - Associated with your user account

## Key Improvements

1. **Eliminated Race Condition**: Claiming now happens in the auth check effect, immediately after authentication is confirmed, not in a separate effect that might run too early.

2. **Better Timing**: The 300ms delay is applied after auth confirmation, not before checking auth state.

3. **Clearer Flow**: All auth-related logic (checking auth, handling login, claiming drafts) is in one place, making the code easier to understand and maintain.

4. **Better UX**: Users see immediate feedback with the success toast and automatic scroll to gallery showing their saved plan.

## Notes

- The fix preserves backward compatibility - existing flows are not affected
- Debug logs can be removed in production if desired, but they don't expose sensitive data
- The `loadItinerary` effect still exists for other scenarios (e.g., direct links to itineraries), but draft claiming now happens in the auth effect

