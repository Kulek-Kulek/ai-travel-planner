-- Add accessibility flag to itineraries table
alter table itineraries
add column has_accessibility_needs boolean default false;

-- Add comment for documentation
comment on column itineraries.has_accessibility_needs is 'Whether the trip requires accessibility accommodations';

