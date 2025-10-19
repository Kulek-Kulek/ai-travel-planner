-- Add image_url column to itineraries table for Unsplash photos
alter table itineraries 
add column image_url text,
add column image_photographer text,
add column image_photographer_url text;

-- Add indexes for better query performance
create index itineraries_image_url_idx on itineraries(image_url) where image_url is not null;

-- Add comments for documentation
comment on column itineraries.image_url is 'URL to Unsplash photo for the itinerary card';
comment on column itineraries.image_photographer is 'Photographer name for Unsplash attribution';
comment on column itineraries.image_photographer_url is 'Photographer profile URL for Unsplash attribution';

