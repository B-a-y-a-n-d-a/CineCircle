-- Migration v3: give the scraper a place to log its own runs, and let
-- `screenings` track which rows came from a scrape vs. a manual entry.
--
-- This file was previously an empty placeholder ("x"). index.js, admin.js,
-- and migration_v5.sql all assume `scrape_runs` and these three
-- `screenings` columns already exist -- without them, every scrape run
-- fails at the very first line (inserting into a table that doesn't
-- exist), which is why nothing beyond the original seeded rows (e.g.
-- "Ster-Kinekor Sandton City") has ever shown up as a venue: the scraper
-- has never actually been able to write to the database.
--
-- Run this in Supabase Dashboard -> SQL Editor -> New query.

create table if not exists scrape_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  triggered_by uuid references users(id) on delete set null,
  status text not null default 'running', -- 'running' | 'success' | 'error'
  screenings_found int not null default 0,
  unmatched_movies text[] not null default '{}',
  error text,
  -- Per-cinema breakdown for this run (see src/scraper/index.js) — lets the
  -- admin Showtimes tab show exactly which venues succeeded/failed and why,
  -- instead of that only being visible in server console logs.
  results jsonb not null default '[]'
);

alter table screenings add column if not exists source text;
alter table screenings add column if not exists screening_date date;
alter table screenings add column if not exists scraped_at timestamptz;

-- Manually-entered screenings (the admin fallback form) are tagged so they're
-- easy to tell apart from scraper rows, and so the scraper's stale-row
-- cleanup (which only ever touches `source = 'scraper'` rows) never removes
-- something a human typed in by hand.
comment on column screenings.source is 'scraper | manual | null (original seed data)';
