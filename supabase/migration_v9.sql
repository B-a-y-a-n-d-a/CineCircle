-- Migration v9:
--   1. Change the 'TBC' placeholder format (from migration_v7/v8) to '2D'
--      — per product decision, don't bother distinguishing formats for now.
--   2. Backfill screening_date on any of those placeholder rows that don't
--      have one yet, so they sort/behave consistently with everything else
--      now that the app filters out past screenings by date (see
--      src/utils/dates.js) — a null date is still always treated as
--      upcoming, but giving these a real near-future date is tidier.

update screenings
set format = '2D'
where format = 'TBC';

update screenings
set screening_date = current_date + 1
where source = 'manual' and screening_date is null;
