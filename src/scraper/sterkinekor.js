import { extractShowtimesFromPage } from './extract.js';
import { listSelects, selectOptionContaining, selectCustomDropdown } from './siteHelpers.js';

// v4 — decisive finding from v3's diagnostics: the "now showing" page only
// ever lists movie *names*, never real showtimes. Real times only exist
// inside Ster-Kinekor's "Quick Book" widget, and that widget only reveals
// them after you pick, in order: cinema -> movie -> cinema type -> date ->
// showtime. Each step's options only populate once the previous one is set
// (a dependent-dropdown flow), which is why nothing showed up before.
//
// To keep this fast, we only drill into the specific movies we care about
// (passed in as `targetMovies`, i.e. our own `movies` table) instead of
// looping over every movie the cinema is showing.
//
// We don't know for certain whether these widget fields are native
// <select> elements or Angular Material-style custom dropdowns, so each
// step tries both: selectOptionContaining() for real <select>s, falling
// back to selectCustomDropdown() for click-to-open overlay pickers.
async function pick(page, fieldHint, valueText) {
  if (await selectOptionContaining(page, valueText)) return true;
  return selectCustomDropdown(page, fieldHint, valueText);
}

const WEEKDAY_HINTS = ['today', 'tomorrow', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

function normalize(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

async function findDateOptionText(page, dayIndex) {
  // Look across all selects for one whose options look date-like (contains a
  // weekday name, "today"/"tomorrow", or a DD pattern), then return the
  // option text at `dayIndex` within that select.
  const selects = await listSelects(page);
  for (const s of selects) {
    const looksLikeDates = s.options.some((o) => WEEKDAY_HINTS.some((h) => normalize(o).includes(h)));
    if (looksLikeDates && s.options.length > dayIndex) {
      return s.options[dayIndex];
    }
  }
  return null;
}

async function readShowtimesNearby(page) {
  // After cinema+movie+type+date are all chosen, whatever times appear are
  // real. Reuse the generic card extractor first; if it finds nothing (e.g.
  // times render as a flat button row with no nearby heading), fall back to
  // a plain page-wide time-string scan.
  const cards = await extractShowtimesFromPage(page);
  if (cards.length) return cards[0].times;

  return page.evaluate(() => {
    const TIME_RE = /\b([01]?\d|2[0-3]):([0-5]\d)\b/g;
    const text = document.body.innerText || '';
    return [...new Set([...text.matchAll(TIME_RE)].map((m) => `${m[1].padStart(2, '0')}:${m[2]}`))];
  }).catch(() => []);
}

export async function scrapeSterKinekorCinema(browser, cinemaSiteName, dayIndex, targetMovies = []) {
  const page = await browser.newPage();
  const results = [];
  const diagnostics = { cinemaSelected: false, movieAttempts: [] };
  try {
    const slug = cinemaSiteName.toLowerCase().replace(/[^a-z0-9]/g, '');
    await page.goto(`https://www.sterkinekor.com/actual-content?tab=now-showing&cinema=${slug}`, {
      waitUntil: 'networkidle', timeout: 30000,
    });
    await page.waitForTimeout(1500);

    diagnostics.cinemaSelected = await pick(page, 'cinema', cinemaSiteName);
    await page.waitForTimeout(1500);

    for (const movie of targetMovies) {
      const attempt = { title: movie.title, movieSelected: false, dateSelected: false, timesFound: 0 };
      try {
        attempt.movieSelected = await pick(page, 'movie', movie.title);
        if (!attempt.movieSelected) {
          diagnostics.movieAttempts.push(attempt);
          continue;
        }
        await page.waitForTimeout(1200);

        // Cinema type: pick 2D by default if that field exists at all — we
        // want the plain showing, not IMAX/D-BOX/etc, to keep one row per
        // showtime simple. If there's no such field yet, skip it.
        await pick(page, 'cinema type', '2D');
        await page.waitForTimeout(800);

        const dateOptionText = await findDateOptionText(page, dayIndex);
        if (dateOptionText) {
          attempt.dateSelected = await pick(page, 'date', dateOptionText);
          await page.waitForTimeout(1200);
        }

        const times = await readShowtimesNearby(page);
        attempt.timesFound = times.length;
        if (times.length) {
          results.push({ title: movie.title, times, format: '2D' });
        }
      } catch (err) {
        attempt.error = err.message;
      }
      diagnostics.movieAttempts.push(attempt);
    }

    if (results.length === 0) {
      diagnostics.pageTextEnd = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(-500)).catch(() => '');
    }

    return { ok: true, results, url: page.url(), diagnostics };
  } catch (err) {
    return { ok: false, error: err.message, url: page.url(), diagnostics };
  } finally {
    await page.close();
  }
}
