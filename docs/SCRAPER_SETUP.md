# Showtime Scraper

Pulls Ster-Kinekor and Nu Metro showtimes (today, tomorrow, day after) for the cinemas already used in the app, matches them against your `movies` table, and writes them into `screenings`. Runs automatically every 24 hours, and can be triggered on demand from **Admin → Showtimes**.

## Important: this needs a tuning pass

Neither cinema site has a public API — they're JavaScript apps, so the scraper drives a real headless browser (Playwright) and reads the rendered page, using a generic "find title + times near each other" heuristic instead of hardcoded CSS classes (those break the moment either site redesigns). This means **the first run will very likely need adjustment** — that's normal for any scraper against a site without an API, not a sign something is broken.

## 1. Install

```
npm install
npx playwright install chromium
```

The second command downloads a headless Chromium browser (~150–300MB) — only needs to run once per machine.

## 2. Run the migration

Supabase SQL Editor → paste all of `supabase/migration_v3.sql` → Run. Adds a `source` column to `screenings` (so scraped rows never clash with manually-added ones) and a `scrape_runs` table for status tracking.

## 3. Try it

```
npm run dev
```

Log in as an admin → **Admin → Showtimes → Refresh Showtimes Now**. It'll say "in progress" for a minute or two (it's opening a real browser and clicking through both sites), then show a result: how many screenings it found, and any movie titles it saw on-site but couldn't match to your `movies` table.

## 4. If it comes back with 0 screenings

This is expected on the first attempt. Send me:
- What the "Showtimes" tab shows after a run (error message, or 0 found)
- If you can, open `src/scraper/sterkinekor.js` / `numetro.js` and run with `headless: false` locally to *watch* what the browser actually does and where it gets stuck (wrong cinema click, date picker not found, etc.)

I'll adjust the click targets and the extraction heuristic in `src/scraper/extract.js` based on what you see — this is a normal iterate-together step, not a rebuild.

## 5. About the daily cron

`server.js` schedules a run every day at 03:00 server time via `node-cron` — but only while the Node process is actually running. If you're running this on your own laptop, it won't fire while the laptop is off or the terminal is closed. For a scrape that reliably runs every night, deploy the app to a host that stays up (Render, Railway, etc.) — same as the general deployment note in the main README.

## 6. Which cinemas are covered

CineCircle is scoped to **Gauteng only** — cinemas, screenings, and groups. `src/scraper/config.js` now lists only Gauteng Ster-Kinekor and Nu Metro branches (Sandton, Cresta, Fourways, Menlyn Park, Hyde Park, Clearwater, Emperors Palace). Edit that file to add or change cinemas — each entry needs the exact-ish name as it appears on the site and which city/display name to store in our database. If you ever expand beyond Gauteng, also update `GAUTENG_CITIES` in the same file.

Run `supabase/migration_v4.sql` once (SQL Editor → paste → Run) to remove the old out-of-Gauteng seed screenings (Durban, Cape Town, Gqeberha) and any groups built on them — it logs which groups get removed before deleting.

## 7. Ster-Kinekor's real showtime flow

Confirmed by inspecting the live site: the "now showing" page only lists movie *names*, never real times. Actual showtimes only appear inside the "Quick Book" widget, and only after picking, in order: cinema → movie → cinema type → date → showtime — each step's options only populate once the previous one is chosen.

`src/scraper/sterkinekor.js` now drives that full sequence, but only for the two movies in our `movies` table (not every movie the cinema shows, to keep it fast). It tries both native `<select>` dropdowns and Angular-Material-style click-to-open pickers at each step, since we don't yet know for certain which the site uses for movie/date/showtime. **This will likely need another round of log-sharing** to nail down the exact widget behavior — same iterate-together process as before.
