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

Edit `src/scraper/config.js` to add or change cinemas — each entry needs the exact-ish name as it appears on the site (used for a text-based click) and which city/display name to store in our database.
