-- Migration v8: seed a placeholder screening for the newly-added Nu Metro
-- Gauteng venues, same pattern as migration_v7 did for Ster-Kinekor — gets
-- them showing up in the Venue filter immediately, ahead of the scraper.
-- Menlyn Park / Hyde Park / Clearwater / Emperors Palace already have real
-- scraped data from earlier testing, so they're left alone here.

insert into screenings (cinema, city, show_time, format, movie_id, source, screening_date)
select v.cinema, v.city, 'Showtime pending — check back after the scraper runs', '2D',
  (select id from movies order by created_at asc limit 1),
  'manual', current_date + 1
from (values
  ('Nu Metro Bedford',   'Bedfordview'),
  ('Nu Metro The Glen',  'Johannesburg'),
  ('Nu Metro Woodlands', 'Pretoria'),
  ('Nu Metro Westgate',  'Roodepoort')
) as v(cinema, city)
where not exists (select 1 from screenings s where s.cinema = v.cinema);
