-- Add admin role to profiles table
alter table profiles 
add column role text default 'user' not null 
check (role in ('user', 'admin'));

create index profiles_role_idx on profiles(role);

comment on column profiles.role is 'User role: user (default) or admin (full access)';

-- Update RLS policies for itineraries to allow admins full access

-- Admin can view ALL itineraries (including private)
create policy "Admins can view all itineraries"
  on itineraries for select
  to authenticated
  using (
    exists (
      select 1 from profiles 
      where profiles.id = auth.uid() 
      and profiles.role = 'admin'
    )
  );

-- Admin can update ALL itineraries
create policy "Admins can update all itineraries"
  on itineraries for update
  to authenticated
  using (
    exists (
      select 1 from profiles 
      where profiles.id = auth.uid() 
      and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from profiles 
      where profiles.id = auth.uid() 
      and profiles.role = 'admin'
    )
  );

-- Admin can delete ALL itineraries
create policy "Admins can delete all itineraries"
  on itineraries for delete
  to authenticated
  using (
    exists (
      select 1 from profiles 
      where profiles.id = auth.uid() 
      and profiles.role = 'admin'
    )
  );

-- Add comment for documentation
comment on table profiles is 'User profiles with role-based access control. Admins have full access to all itineraries.';

