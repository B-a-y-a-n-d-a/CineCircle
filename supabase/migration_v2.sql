-- CineCircle — v2 migration
-- Run this in Supabase Dashboard -> SQL Editor -> New query (after migration_auth.sql)
-- Adds: multiple movies, group approval workflow, group chat, group polls,
-- admin/ban flags, and a movie tag on discussion posts.

-- ============ MOVIES ============
create table if not exists movies (
  id serial primary key,
  title text not null,
  genre text not null default '',
  runtime_minutes int not null default 0,
  poster_url text not null default '',
  trailer_url text not null default '',
  status text not null default 'active', -- 'active' | 'archived'
  created_at timestamptz not null default now()
);

insert into movies (title, genre, runtime_minutes, poster_url, trailer_url)
select 'Spider-Man: Brand New Day', 'Action / Adventure', 135,
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCR-pwMYqE93urUJ9c0bWhI6zPbezrEjFybuRBdD3j4J_rjn-9Tk3Io3SKt5iC3QFdFOZbiBc87bXwx6cBUySgB__uhmlj-4JVRBk27oGr1AMRhp1w8MqqRptIZhyCBKa0dXqTRh99pQ6KnDyoULWYK4P1SNfcSEXoJZWUpDCZqLmiwB6kXhSzaDXOJipD9dEl2RKz4J1WjLSTlOVeZL1XKWHTUnwRwy6C7BtHIIgonmbp3HMqOD-qm',
  'https://www.youtube.com/watch?v=1eONa8Nx_jQ'
where not exists (select 1 from movies where title = 'Spider-Man: Brand New Day');

insert into movies (title, genre, runtime_minutes, poster_url, trailer_url)
select 'The Odyssey', 'Action / Adventure / Fantasy', 165,
  'https://upload.wikimedia.org/wikipedia/en/e/ec/The_Odyssey_%282026_film%29_poster.jpg',
  'https://www.youtube.com/watch?v=D00esm0gGmU'
where not exists (select 1 from movies where title = 'The Odyssey');

-- ============ SCREENINGS: link to a movie ============
alter table screenings add column if not exists movie_id int references movies(id) on delete cascade;
update screenings set movie_id = (select id from movies where title = 'Spider-Man: Brand New Day') where movie_id is null;
alter table screenings alter column movie_id set not null;

insert into screenings (cinema, city, show_time, format, movie_id)
select cinema, city, show_time, format, (select id from movies where title = 'The Odyssey')
from (values
  ('Ster-Kinekor Sandton City',   'Johannesburg', 'Sat 8 Aug · 18:00', 'IMAX'),
  ('Nu Metro Menlyn Park',        'Pretoria',     'Sat 8 Aug · 19:30', '2D'),
  ('Ster-Kinekor Gateway',        'Durban',       'Sun 9 Aug · 16:30', 'IMAX'),
  ('Nu Metro Canal Walk',         'Cape Town',    'Sun 9 Aug · 19:00', '4DX')
) as t(cinema, city, show_time, format)
where not exists (select 1 from screenings s where s.cinema = t.cinema and s.show_time = t.show_time);

-- ============ GROUPS: approval workflow ============
alter table groups add column if not exists status text not null default 'approved'; -- 'pending' | 'approved' | 'rejected'
alter table groups add column if not exists reviewed_by uuid references users(id) on delete set null;
alter table groups add column if not exists reviewed_at timestamptz;
-- existing seeded groups stay approved (default above); new ones will be set to 'pending' by the API.

-- ============ USERS: admin + ban flags ============
alter table users add column if not exists is_admin boolean not null default false;
alter table users add column if not exists is_banned boolean not null default false;

-- ============ POSTS: tag with a movie ============
alter table posts add column if not exists movie_id int references movies(id) on delete cascade;
update posts set movie_id = (select id from movies where title = 'Spider-Man: Brand New Day') where movie_id is null;
alter table posts alter column movie_id set not null;

-- ============ GROUP CHAT ============
create table if not exists group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

-- ============ GROUP POLLS ============
create table if not exists group_polls (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  created_by uuid references users(id) on delete set null,
  question text not null,
  created_at timestamptz not null default now()
);

create table if not exists group_poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references group_polls(id) on delete cascade,
  label text not null,
  position int not null default 0
);

create table if not exists group_poll_votes (
  poll_id uuid not null references group_polls(id) on delete cascade,
  option_id uuid not null references group_poll_options(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (poll_id, user_id)
);

-- ============ Make yourself an admin ============
-- Run this AFTER you've logged in at least once, replacing the email:
--   update users set is_admin = true where email = 'you@example.com';
