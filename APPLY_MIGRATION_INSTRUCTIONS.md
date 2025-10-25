# How to Apply Migrations 011 & 012

## Problems Being Fixed

### Migration 011: Allow Public Profile Names
Anonymous users cannot see creator names on itinerary cards because the RLS policy on the `profiles` table is too restrictive.

### Migration 012: Add Likes to Itineraries
Add a like/thumbs-up feature to itineraries for tracking popular plans and marketing insights.

## Apply Both Migrations

### Method 1: Supabase Dashboard (Easiest)

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New query**
5. Copy and paste the contents of **BOTH** migration files below:

#### Migration 011 - Allow Public Profile Names

```sql
-- Allow anyone (including anonymous users) to view profile names
-- This is needed so that public itineraries can display creator names
create policy "Anyone can view profile names"
  on profiles for select
  to anon, authenticated
  using (true);

-- Drop the old restrictive policy since we now have a more open one
drop policy if exists "Users can view own profile" on profiles;

-- Re-create a policy that allows authenticated users to view all profile details
-- (This is more specific and won't conflict with the public name viewing policy)
create policy "Authenticated users can view all profile details"
  on profiles for select
  to authenticated
  using (true);
```

6. Click **Run** or press `Ctrl+Enter`
7. Verify the migration succeeded (you should see a success message)
8. Click **New query** again
9. Copy and paste the contents of migration 012:

#### Migration 012 - Add Likes to Itineraries

```sql
-- Add likes field to itineraries table
-- This tracks how many users have liked/thumbed-up an itinerary
alter table itineraries
  add column likes integer default 0 not null;

-- Add index for sorting by popularity
create index itineraries_likes_idx on itineraries(likes desc);

-- Add a comment for documentation
comment on column itineraries.likes is 'Number of thumb-ups/likes this itinerary has received';
```

10. Click **Run** or press `Ctrl+Enter`
11. Verify the migration succeeded

### Method 2: Supabase CLI

If you have the Supabase CLI installed and your project linked:

```bash
cd travel-planner
supabase db push
```

If not linked yet:

```bash
cd travel-planner
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

## After Applying

Once both migrations are applied:

### Migration 011 Results:
1. Refresh your homepage
2. Creator names should now be visible on all itinerary cards
3. Both anonymous and authenticated users will be able to see creator names

### Migration 012 Results:
1. Refresh your homepage
2. You'll see a thumbs-up button with a count on each itinerary card
3. Users can click to like itineraries (tracked in localStorage to prevent multiple likes)
4. The like count is stored in the database for marketing analytics

## What These Migrations Do

### Migration 011:
- **Adds** a new policy allowing anyone (anonymous and authenticated users) to view profile information
- **Removes** the old restrictive policy that only allowed users to view their own profile
- **Re-creates** a policy for authenticated users to view all profiles (needed for features like user listings, etc.)

This change makes profile names public, which is appropriate since they're displayed on public itineraries.

### Migration 012:
- **Adds** a `likes` column to the `itineraries` table (integer, default 0)
- **Creates** an index on the `likes` column for efficient sorting by popularity
- **Enables** tracking of popular itineraries for marketing purposes

## Features Added

### Like Button Features:
- ✅ Thumbs-up icon displayed on all itinerary cards (gallery view)
- ✅ Large like button on itinerary detail pages
- ✅ Real-time like count display
- ✅ Prevents duplicate likes using localStorage
- ✅ Optimistic UI updates for better UX
- ✅ Toast notifications for user feedback
- ✅ Visual feedback when user has already liked (blue background)
- ✅ Available to both authenticated and anonymous users

