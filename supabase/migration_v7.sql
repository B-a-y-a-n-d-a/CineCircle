-- Migration v7: seed a placeholder screening for every Ster-Kinekor Gauteng
-- venue that doesn't have one yet, so they all show up in the Venue filter
-- right away — instead of waiting on the scraper to successfully run
-- against each one first.
--
-- These are tagged source = 'manual' with an obvious placeholder show_time
-- and format '2D' (matching the rest of the app for now — see
-- migration_v9.sql for the cleanup of the earlier 'TBC' placeholder value),
-- so:
--   - the scraper's own stale-row cleanup (which only ever touches
--     source = 'scraper' rows) will never delete them,
--   - and once the scraper successfully finds real showtimes for a venue,
--     those will appear as separate, additional rows alongside the
--     placeholder rather than colliding with it (different screening_date).
--
-- Once a venue has real scraped showtimes, delete its placeholder from
-- Admin -> Showtimes -> All Showtimes (look for "Showtime pending").

insert into screenings (cinema, city, show_time, format, movie_id, source, screening_date)
select v.cinema, v.city, 'Showtime pending — check back after the scraper runs', '2D',
  (select id from movies order by created_at asc limit 1),
  'manual', current_date + 1
from (values
  ('Ster-Kinekor Cresta',              'Johannesburg'),
  ('Ster-Kinekor Fourways',            'Johannesburg'),
  ('Ster-Kinekor Mall of Africa',      'Midrand'),
  ('Ster-Kinekor The Zone @ Rosebank', 'Johannesburg'),
  ('Ster-Kinekor Southgate',           'Johannesburg'),
  ('Ster-Kinekor Brooklyn Mall',       'Pretoria'),
  ('Ster-Kinekor Carnival City',       'Brakpan'),
  ('Ster-Kinekor Cedar Square',        'Johannesburg'),
  ('Ster-Kinekor Cradlestone',         'Krugersdorp'),
  ('Ster-Kinekor Eastgate',            'Germiston'),
  ('Ster-Kinekor Irene',               'Centurion'),
  ('Ster-Kinekor Rosebank Nouveau',    'Johannesburg'),
  ('Ster-Kinekor The Grove',           'Pretoria'),
  ('Ster-Kinekor Vaal',                'Vanderbijlpark'),
  ('Ster-Kinekor Wonderpark',          'Pretoria')
) as v(cinema, city)
where not exists (select 1 from screenings s where s.cinema = v.cinema);
