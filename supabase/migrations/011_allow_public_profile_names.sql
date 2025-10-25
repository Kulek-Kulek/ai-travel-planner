-- Allow anyone (including anonymous users) to view profile names
-- This is needed so that public itineraries can display creator names
create policy "Anyone can view profile names"
  on profiles for select
  to anon, authenticated
  using (true);

-- Drop the old restrictive policy since we now have a more open one
drop policy if exists "Users can view own profile" on profiles;

-- Re-create a policy that allows authenticated users to view full profile details
-- (This is more specific and won't conflict with the public name viewing policy)
create policy "Authenticated users can view all profile details"
  on profiles for select
  to authenticated
  using (true);

