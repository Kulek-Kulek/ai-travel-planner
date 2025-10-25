-- Create bucket_list table to store users' saved itineraries
create table bucket_list (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  itinerary_id uuid references itineraries(id) on delete cascade not null,
  added_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Ensure a user can only add an itinerary to their bucket list once
  unique(user_id, itinerary_id)
);

-- Add indexes for efficient queries
create index bucket_list_user_id_idx on bucket_list(user_id);
create index bucket_list_itinerary_id_idx on bucket_list(itinerary_id);
create index bucket_list_added_at_idx on bucket_list(added_at desc);

-- Enable Row Level Security
alter table bucket_list enable row level security;

-- RLS Policies
-- Users can only view their own bucket list items
create policy "Users can view their own bucket list"
  on bucket_list for select
  using (auth.uid() = user_id);

-- Users can only add to their own bucket list
create policy "Users can add to their own bucket list"
  on bucket_list for insert
  with check (auth.uid() = user_id);

-- Users can only delete from their own bucket list
create policy "Users can delete from their own bucket list"
  on bucket_list for delete
  using (auth.uid() = user_id);

-- Add a comment for documentation
comment on table bucket_list is 'Stores users saved/favorited itineraries for their bucket list';

