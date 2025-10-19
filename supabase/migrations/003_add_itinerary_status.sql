-- Add status column to itineraries
alter table itineraries 
add column status text default 'active' not null 
check (status in ('active', 'completed', 'archived'));

-- Add index for status queries
create index itineraries_status_idx on itineraries(status);

-- Add comment
comment on column itineraries.status is 'Status of the itinerary: active (planning), completed (traveled), archived (old)';

