-- Add likes field to itineraries table
-- This tracks how many users have liked/thumbed-up an itinerary
alter table itineraries
  add column likes integer default 0 not null;

-- Add index for sorting by popularity
create index itineraries_likes_idx on itineraries(likes desc);

-- Add a comment for documentation
comment on column itineraries.likes is 'Number of thumb-ups/likes this itinerary has received';

