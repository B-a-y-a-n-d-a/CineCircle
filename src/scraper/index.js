import { chromium } from 'playwright';
import { supabase } from '../supabase.js';
import { TARGET_CINEMAS, DAYS_AHEAD } from './config.js';
import { scrapeSterKinekorCinema } from './sterkinekor.js';
import { scrapeNuMetroCinema } from './numetro.js';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function dateAt(dayIndex) {
  const d = new Date();
  d.setDate(d.getDate() + dayIndex);
  return d;
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function formatShowTime(d, timeStr) {
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} · ${timeStr}`;
}

function normalize(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function matchMovie(scrapedTitle, movies) {
  const norm = normalize(scrapedTitle);
  if (!norm) return null;
  return movies.find((m) => {
    const mn = normalize(m.title);
    return mn && (norm.includes(mn) || mn.includes(norm));
  }) || null;
}

// Runs the full scrape: every target cinema × today/tomorrow/day-after.
// Returns a summary { screeningsFound, unmatchedMovies } and writes results
// straight into the `screenings` table (source = 'scraper').
export async function runScrape({ triggeredBy } = {}) {
  const { data: run, error: runErr } = await supabase
    .from('scrape_runs').insert({ triggered_by: triggeredBy || null }).select().single();
  if (runErr) throw runErr;

  const summary = { screeningsFound: 0, unmatchedMovies: new Set() };
  // Per-cinema breakdown so a failure (e.g. a wrong siteName that no longer
  // matches the site's own <select> options) shows up in the admin UI
  // instead of only in server console logs. One entry per cinema, covering
  // all DAYS_AHEAD attempts for it.
  const cinemaResults = [];

  try {
    const { data: movies, error: moviesErr } = await supabase.from('movies').select('*');
    if (moviesErr) throw moviesErr;

    const browser = await chromium.launch({ headless: true });
    const newRows = [];

    for (const cinema of TARGET_CINEMAS) {
      const result = {
        displayName: cinema.displayName,
        chain: cinema.chain,
        city: cinema.city,
        ok: true,
        screeningsFound: 0,
        errors: [],
      };

      for (let dayIndex = 0; dayIndex < DAYS_AHEAD; dayIndex++) {
        const date = dateAt(dayIndex);
        console.log(`[scraper] ${cinema.displayName} — ${isoDate(date)}`);

        const scrape = cinema.chain === 'sterkinekor'
          ? await scrapeSterKinekorCinema(browser, cinema.siteName, dayIndex, movies)
          : await scrapeNuMetroCinema(browser, cinema.siteName, dayIndex, movies);

        if (!scrape.ok) {
          console.warn(`[scraper] FAILED ${cinema.displayName} (${scrape.url}): ${scrape.error}`);
          result.errors.push(`${isoDate(date)}: ${scrape.error}`);
          continue;
        }

        if (scrape.diagnostics) {
          const { pageTextSnippet, pageTextEnd, ...rest } = scrape.diagnostics;
          console.log(`[scraper]   diagnostics: ${JSON.stringify(rest)}`);
          if (pageTextSnippet) console.log(`[scraper]   page text START: ${pageTextSnippet}`);
          if (pageTextEnd) console.log(`[scraper]   page text END: ${pageTextEnd}`);
        }
        console.log(`[scraper]   found ${scrape.results.length} movie card(s): ${scrape.results.map(r => `${r.title} (${r.times.length} time${r.times.length === 1 ? '' : 's'}: ${r.times.join(', ')})`).join(', ') || 'none'}`);

        if (!scrape.results.length) {
          result.errors.push(`${isoDate(date)}: no movie cards found (cinema/venue may not have matched on-site — check siteName in config.js)`);
        }

        for (const item of scrape.results) {
          const movie = matchMovie(item.title, movies);
          if (!movie) {
            summary.unmatchedMovies.add(item.title);
            continue;
          }
          console.log(`[scraper]     matched "${item.title}" -> movie #${movie.id} (${movie.title})`);
          for (const time of item.times) {
            newRows.push({
              cinema: cinema.displayName,
              city: cinema.city,
              show_time: formatShowTime(date, time),
              format: item.format,
              movie_id: movie.id,
              source: 'scraper',
              screening_date: isoDate(date),
              scraped_at: new Date().toISOString(),
            });
            result.screeningsFound += 1;
          }
        }
      }

      result.ok = result.errors.length === 0;
      cinemaResults.push(result);
    }

    await browser.close();

    // Upsert, not delete-then-insert: a group's screening_id needs to keep
    // pointing at the same row across scrapes, or `groups.screening_id
    // references screenings(id) on delete cascade` would silently delete
    // any group built on a showtime the moment it gets rescraped — even
    // though the showtime itself hasn't changed. Matching on
    // (movie_id, cinema, screening_date, show_time) — see migration_v5.sql
    // — means an unchanged showtime keeps its id forever.
    if (newRows.length) {
      const { error: upsertErr } = await supabase
        .from('screenings')
        .upsert(newRows, { onConflict: 'movie_id,cinema,screening_date,show_time' });
      if (upsertErr) throw upsertErr;
    }
    summary.screeningsFound = newRows.length;

    // Clean up showtimes that are no longer being offered (e.g. a screening
    // got cancelled) — but only if nobody has built a group on it. A
    // showtime with an active group stays in the table even after it drops
    // out of the site's listing, rather than cascade-deleting that group.
    const windowDates = Array.from({ length: DAYS_AHEAD }, (_, i) => isoDate(dateAt(i)));
    const newKeys = new Set(newRows.map((r) => `${r.movie_id}|${r.cinema}|${r.screening_date}|${r.show_time}`));

    const { data: existingScraperRows, error: existingErr } = await supabase
      .from('screenings')
      .select('id, movie_id, cinema, screening_date, show_time')
      .eq('source', 'scraper')
      .in('screening_date', windowDates);
    if (existingErr) throw existingErr;

    const staleIds = (existingScraperRows || [])
      .filter((r) => !newKeys.has(`${r.movie_id}|${r.cinema}|${r.screening_date}|${r.show_time}`))
      .map((r) => r.id);

    if (staleIds.length) {
      const { data: groupsOnStale } = await supabase
        .from('groups').select('screening_id').in('screening_id', staleIds);
      const protectedIds = new Set((groupsOnStale || []).map((g) => g.screening_id));
      const deletableIds = staleIds.filter((id) => !protectedIds.has(id));
      if (deletableIds.length) {
        await supabase.from('screenings').delete().in('id', deletableIds);
      }
    }

    await supabase.from('scrape_runs').update({
      status: 'success',
      finished_at: new Date().toISOString(),
      screenings_found: summary.screeningsFound,
      unmatched_movies: [...summary.unmatchedMovies],
      results: cinemaResults,
    }).eq('id', run.id);

    return { ...summary, unmatchedMovies: [...summary.unmatchedMovies] };
  } catch (err) {
    await supabase.from('scrape_runs').update({
      status: 'error',
      finished_at: new Date().toISOString(),
      error: err.message,
      results: cinemaResults,
    }).eq('id', run.id);
    throw err;
  }
}
