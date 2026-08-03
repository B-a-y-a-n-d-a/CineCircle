-- CineCircle — Auth migration
-- Run this in Supabase Dashboard -> SQL Editor -> New query
-- Links our `users` table to Supabase's built-in auth.users, so people can
-- sign in with email/password or Google instead of just typing a name.

-- Drop the old "name must be unique" rule — multiple real accounts can share a display name now.
alter table users drop constraint if exists users_name_key;

-- Link each app user to their Supabase Auth identity.
alter table users add column if not exists auth_id uuid unique references auth.users(id) on delete cascade;
alter table users add column if not exists email text;

-- Let the display name be filled in after first login.
alter table users alter column name drop not null;

-- Automatically create a row in `users` the moment someone signs up via Supabase Auth
-- (email/password or Google) — so the app always has something to attach a display name to.
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (auth_id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  )
  on conflict (auth_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
