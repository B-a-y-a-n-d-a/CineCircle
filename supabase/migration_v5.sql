-- Migration v5: stop the scraper from silently deleting people's groups.
--
-- Bug: every scrape run wiped ALL scraper-sourced screening rows in the
-- 3-day window and reinserted fresh ones with new auto-generated ids.
-- groups.screening_id references screenings(id) on delete cascade, so any
-- group (and its members/chat/polls) built on one of those screenings was
-- cascade-deleted the very next time the scraper ran (nightly cron, or an
-- admin hitting "Refresh Showtimes Now") -- even though the showtime itself
-- hadn't actually changed.
--
-- Fix (paired with the index.js change): the scraper now UPSERTs against a
-- stable identity (movie + cinema + date + time) instead of delete+insert,
-- so an unchanged showtime keeps the same screenings.id forever, and any
-- group built on it survives every future scrape.

-- 1) De-duplicate first -- older delete-then-insert runs may have already
-- left duplicate (movie_id, cinema, screening_date, show_time) rows behind,
-- which would make the new unique constraint below fail to apply. Keep the
-- lowest id in each duplicate set, and re-point any groups that reference a
-- row about to be removed so nothing gets orphaned.
do $$
declare
  dupe record;
begin
  for dupe in
    select movie_id, cinema, screening_date, show_time, min(id) as keep_id, array_agg(id) as all_ids
    from screenings
    where movie_id is not null and screening_date is not null
    group by movie_id, cinema, screening_date, show_time
    having count(*) > 1
  loop
    update groups set screening_id = dupe.keep_id
    where screening_id = any(dupe.all_ids) and screening_id <> dupe.keep_id;

    delete from screenings
    where id = any(dupe.all_ids) and id <> dupe.keep_id;
  end loop;
end $$;

-- 2) Add the identity constraint the scraper's upsert targets. NULLs are
-- never considered equal in a unique constraint, so this only meaningfully
-- applies once movie_id/screening_date are actually set (scraper rows) --
-- older manual rows without those stay unaffected.
alter table screenings
  add constraint screenings_identity_uidx unique (movie_id, cinema, screening_date, show_time);
