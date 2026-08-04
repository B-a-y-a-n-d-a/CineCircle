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

  try {
    const { data: movies, error: moviesErr } = await supabase.from('movies').select('*');
    if (moviesErr) throw moviesErr;

    const browser = await chromium.launch({ headless: true });
    const newRows = [];

    for (const cinema of TARGET_CINEMAS) {
      for (let dayIndex = 0; dayIndex < DAYS_AHEAD; dayIndex++) {
        const date = dateAt(dayIndex);
        console.log(`[scraper] ${cinema.displayName} — ${isoDate(date)}`);

        const scrape = cinema.chain === 'sterkinekor'
          ? await scrapeSterKinekorCinema(browser, cinema.siteName, dayIndex)
          : await scrapeNuMetroCinema(browser, cinema.siteName, dayIndex);

        if (!scrape.ok) {
          console.warn(`[scraper] FAILED ${cinema.displayName} (${scrape.url}): ${scrape.error}`);
          continue;
        }

        if (scrape.diagnostics) {
          const { pageTextSnippet, ...rest } = scrape.diagnostics;
          console.log(`[scraper]   diagnostics: ${JSON.stringify(rest)}`);
          if (pageTextSnippet) console.log(`[scraper]   page text snippet: ${pageTextSnippet}`);
        }
        console.log(`[scraper]   found ${scrape.results.length} movie card(s): ${scrape.results.map(r => `${r.title} (${r.times.length} time${r.times.length === 1 ? '' : 's'}: ${r.times.join(', ')})`).join(', ') || 'none'}`);

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
          }
        }
      }
    }

    await browser.close();

    // Replace: wipe out this run's window of scraper-sourced rows, then insert fresh ones.
    // (Manually-added screenings, source='manual', are never touched.)
    const windowDates = Array.from({ length: DAYS_AHEAD }, (_, i) => isoDate(dateAt(i)));
    await supabase.from('screenings').delete().eq('source', 'scraper').in('screening_date', windowDates);

    if (newRows.length) {
      const { error: insertErr } = await supabase.from('screenings').insert(newRows);
      if (insertErr) throw insertErr;
    }
    summary.screeningsFound = newRows.length;

    await supabase.from('scrape_runs').update({
      status: 'success',
      finished_at: new Date().toISOString(),
      screenings_found: summary.screeningsFound,
      unmatched_movies: [...summary.unmatchedMovies],
    }).eq('id', run.id);

    return { ...summary, unmatchedMovies: [...summary.unmatchedMovies] };
  } catch (err) {
    await supabase.from('scrape_runs').update({
      status: 'error',
      finished_at: new Date().toISOString(),
      error: err.message,
    }).eq('id', run.id);
    throw err;
  }
}
