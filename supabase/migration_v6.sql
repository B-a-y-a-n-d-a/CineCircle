-- Migration v6: add the per-cinema `results` breakdown column to
-- scrape_runs, which your database didn't have yet (scrape_runs itself and
-- the other columns on it were already set up from before — this is just
-- the one new field the admin Showtimes tab's per-cinema diagnostics need).
--
-- Every statement here is a safe no-op if the column/table already exists,
-- so this is fine to run even if some of it turns out to already be there.

alter table scrape_runs add column if not exists results jsonb not null default '[]';

-- Defensive — only actually does anything if any of these somehow aren't
-- already present on your existing scrape_runs table.
alter table scrape_runs add column if not exists started_at timestamptz not null default now();
alter table scrape_runs add column if not exists finished_at timestamptz;
alter table scrape_runs add column if not exists triggered_by uuid references users(id) on delete set null;
alter table scrape_runs add column if not exists status text not null default 'running';
alter table scrape_runs add column if not exists screenings_found int not null default 0;
alter table scrape_runs add column if not exists unmatched_movies text[] not null default '{}';
alter table scrape_runs add column if not exists error text;
