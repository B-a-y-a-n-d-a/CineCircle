-- CineCircle schema — run this in Supabase Dashboard -> SQL Editor -> New query
-- Safe to re-run: drops and recreates everything.

drop table if exists posts cascade;
drop table if exists group_members cascade;
drop table if exists groups cascade;
drop table if exists screenings cascade;
drop table if exists users cascade;
drop function if exists increment_likes;

create table users (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table screenings (
  id serial primary key,
  cinema text not null,
  city text not null,
  show_time text not null,
  format text not null default '2D'
);

create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  screening_id int not null references screenings(id) on delete cascade,
  vibe text not null default 'Casual',
  max_size int not null default 6 check (max_size between 2 and 20),
  spot text not null default 'To be decided by the group',
  topic text not null default 'Open discussion',
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table group_members (
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  text text not null,
  spoiler boolean not null default false,
  likes int not null default 0,
  created_at timestamptz not null default now()
);

-- Atomic like counter used by POST /api/posts/:id/like
create or replace function increment_likes(post_id uuid)
returns int language sql as $$
  update posts set likes = likes + 1 where id = post_id returning likes;
$$;

-- ============ SEED DATA ============

insert into screenings (cinema, city, show_time, format) values
  ('Ster-Kinekor Sandton City',   'Johannesburg', 'Fri 31 Jul · 19:30', 'IMAX 3D'),
  ('Nu Metro Menlyn Park',        'Pretoria',     'Fri 31 Jul · 20:00', 'Xtreme'),
  ('Ster-Kinekor Gateway',        'Durban',       'Sat 1 Aug · 17:45',  'IMAX'),
  ('Nu Metro Canal Walk',         'Cape Town',    'Sat 1 Aug · 20:15',  '4DX'),
  ('Ster-Kinekor V&A Waterfront', 'Cape Town',    'Sun 2 Aug · 15:00',  '2D'),
  ('Ster-Kinekor Baywest',        'Gqeberha',     'Sat 1 Aug · 19:00',  '3D');

insert into users (name) values ('Thabo'), ('Ayesha'), ('Sipho'), ('Priya'), ('Emma');

with g as (
  insert into groups (name, screening_id, vibe, max_size, spot, topic, created_by)
  values
    ('Web-Heads of Sandton', 1, 'Hardcore fans', 8,
     'Rocomamas, food court', 'Where does Brand New Day rank in the Spider-verse?',
     (select id from users where name = 'Thabo')),
    ('Chill First-Timers', 2, 'First-timers welcome', 6,
     'Mugg & Bean, Menlyn', 'No comic homework needed — just vibes',
     (select id from users where name = 'Emma')),
    ('Durban Spidey Squad', 3, 'Casual', 10,
     'Vida e Caffè, Gateway', 'Best action set-piece — debate',
     (select id from users where name = 'Priya'))
  returning id, created_by
)
insert into group_members (group_id, user_id)
select id, created_by from g;

insert into posts (user_id, text, spoiler) values
  ((select id from users where name = 'Ayesha'),
   'Booked for the Friday IMAX show at Sandton — this is exactly how movies should be watched. 🕷️', false),
  ((select id from users where name = 'Priya'),
   'That mid-film swing sequence through the city at night... best Spidey action ever put on screen.', true),
  ((select id from users where name = 'Emma'),
   'First Spider-Man film on the big screen for me. Anyone else joining the first-timers group at Menlyn?', false);
