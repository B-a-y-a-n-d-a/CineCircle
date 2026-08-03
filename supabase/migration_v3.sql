-- CineCircle — v3 migration: scraped showtimes
-- Run in Supabase Dashboard -> SQL Editor -> New query (after migration_v2.sql)

-- Marks which screenings came from the scraper vs. the original hand-seeded
-- ones, and records when the scraper last touched a row. The scraper deletes
-- and re-inserts its own rows for the 3-day window on every run, so it never
-- disturbs manually-added screenings.
alter table screenings add column if not exists source text not null default 'manual'; -- 'manual' | 'scraper'
alter table screenings add column if not exists screening_date date; -- calendar date this showtime is for, used to prune the 3-day window
alter table screenings add column if not exists scraped_at timestamptz;

-- One row per scraper run, so the admin panel can show "last run: ..., found N screenings".
create table if not exists scrape_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running', -- 'running' | 'success' | 'error'
  screenings_found int not null default 0,
  unmatched_movies text[] not null default '{}', -- movie titles seen on-site with no match in our `movies` table
  error text,
  triggered_by uuid references users(id) on delete set null
);
