-- Add travel dates and children information to itineraries table
alter table itineraries
add column start_date date,
add column end_date date,
add column children integer default 0,
add column child_ages integer[] default '{}';

-- Add indexes for better query performance
create index itineraries_start_date_idx on itineraries(start_date);

-- Add comments for documentation
comment on column itineraries.start_date is 'Optional start date of the trip';
comment on column itineraries.end_date is 'Optional end date of the trip';
comment on column itineraries.children is 'Number of children (0-17 years old)';
comment on column itineraries.child_ages is 'Array of children ages';

