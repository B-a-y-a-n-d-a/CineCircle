-- Migration v4: narrow the whole app to Gauteng only.
--
-- The original seed data (schema.sql) and the first multi-movie migration
-- (migration_v2.sql) added screenings in Durban, Cape Town and Gqeberha.
-- Those are being dropped now that CineCircle is scoped to Gauteng cinemas
-- only (see src/scraper/config.js).
--
-- screenings.id is referenced by groups.screening_id with `on delete
-- cascade`, so deleting an out-of-scope screening will also delete any
-- group built on it (and, in turn, that group's members/messages/polls).
-- Run this once against your Supabase project.

-- Gauteng cities we're keeping. Adjust here if you add more Gauteng towns
-- later (keep this list in sync with GAUTENG_CITIES in
-- src/scraper/config.js).
do $$
declare
  gauteng_cities text[] := array['Johannesburg', 'Pretoria', 'Roodepoort', 'Kempton Park', 'Centurion', 'Midrand'];
  dropped_groups int;
  dropped_screenings int;
begin
  -- Log which groups are about to be cascade-deleted, so it shows up in the
  -- migration output rather than disappearing silently.
  raise notice 'Groups about to be removed (built on out-of-Gauteng screenings): %',
    (select string_agg(g.name, ', ')
     from groups g
     join screenings s on s.id = g.screening_id
     where not (s.city = any(gauteng_cities)));

  delete from screenings
  where city is not null
    and not (city = any(gauteng_cities));

  get diagnostics dropped_screenings = row_count;
  raise notice 'Deleted % out-of-Gauteng screening(s) (and any groups/members/messages/polls cascaded from them).', dropped_screenings;
end $$;
