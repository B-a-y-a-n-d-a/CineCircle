import { listSelects, selectOptionContaining, selectCustomDropdown } from './siteHelpers.js';

// v5 — v4 confirmed the Quick Book flow works (cinema -> movie -> cinema
// type -> date all select correctly), but two problems showed up in the
// first live run:
//
// 1. The two movies at the same cinema/date came back with the exact same
//    18 times, and those times (01:45, 02:15, ... 08:30) look like a fixed
//    half-hourly grid rather than real screenings. That's the fingerprint
//    of the old full-page-text fallback in readShowtimesNearby() picking up
//    a static/template time list still sitting in the DOM (e.g. an
//    unrelated hidden <select>'s options), not the actual showtime picker.
// 2. On the 3rd movie attempt in a row, the widget itself broke ("Quick
//    Book loading..." forever) — reusing the same widget instance across
//    multiple movie selections without resetting it eventually desyncs it.
//
// Fixes: (a) reload the page and reselect the cinema fresh before *every*
// movie attempt, so each one starts from a clean widget instead of
// mutating the same one repeatedly; (b) instead of scanning the whole
// page for any HH:MM text, snapshot every <select>'s options right before
// picking the date, snapshot again right after, and only trust options
// that are genuinely NEW post-date-selection and look like real times —
// that's the actual showtime picker, not a leftover static list.
async function pick(page, fieldHint, valueText) {
  if (await selectOptionContaining(page, valueText)) return true;
  return selectCustomDropdown(page, fieldHint, valueText);
}

const WEEKDAY_HINTS = ['today', 'tomorrow', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const TIME_RE = /^([01]?\d|2[0-3]):[0-5]\d$/;

function normalize(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

async function findDateOptionText(page, dayIndex) {
  const selects = await listSelects(page);
  for (const s of selects) {
    const looksLikeDates = s.options.some((o) => WEEKDAY_HINTS.some((h) => normalize(o).includes(h)));
    if (looksLikeDates && s.options.length > dayIndex) {
      return s.options[dayIndex];
    }
  }
  return null;
}

// Real showtime options should (a) look like HH:MM and (b) not have been
// present, in that exact set, before the date was picked. Comparing whole
// selects (not just individual options) also lets us catch "this select
// didn't exist before" as a signal, not just "this option is new".
function findNewTimeOptions(beforeSelects, afterSelects) {
  for (const after of afterSelects) {
    const timeOptions = after.options.filter((o) => TIME_RE.test(o.trim()));
    if (timeOptions.length === 0) continue;

    const before = beforeSelects.find((b) => b.index === after.index);
    const beforeSet = new Set(before ? before.options : []);
    const isNew = timeOptions.some((t) => !beforeSet.has(t));
    if (isNew || !before) return timeOptions;
  }
  return [];
}

export async function scrapeSterKinekorCinema(browser, cinemaSiteName, dayIndex, targetMovies = []) {
  const page = await browser.newPage();
  const results = [];
  const diagnostics = { cinemaSelected: false, movieAttempts: [] };
  const url = `https://www.sterkinekor.com/actual-content?tab=now-showing&cinema=${cinemaSiteName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

  try {
    for (const movie of targetMovies) {
      const attempt = { title: movie.title, cinemaSelected: false, movieSelected: false, dateSelected: false, timesFound: 0 };
      try {
        // Fresh page state per movie — avoids the widget desyncing after
        // being driven through multiple selections in a row.
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(1500);

        attempt.cinemaSelected = await pick(page, 'cinema', cinemaSiteName);
        diagnostics.cinemaSelected = diagnostics.cinemaSelected || attempt.cinemaSelected;
        await page.waitForTimeout(1500);

        attempt.movieSelected = await pick(page, 'movie', movie.title);
        if (!attempt.movieSelected) {
          diagnostics.movieAttempts.push(attempt);
          continue;
        }
        await page.waitForTimeout(1200);

        await pick(page, 'cinema type', '2D');
        await page.waitForTimeout(800);

        const beforeDateSelects = await listSelects(page);
        const dateOptionText = await findDateOptionText(page, dayIndex);
        if (!dateOptionText) {
          diagnostics.movieAttempts.push(attempt);
          continue;
        }

        attempt.dateSelected = await pick(page, 'date', dateOptionText);
        await page.waitForTimeout(1200);

        const afterDateSelects = await listSelects(page);
        const times = findNewTimeOptions(beforeDateSelects, afterDateSelects);
        attempt.timesFound = times.length;
        if (times.length) {
          results.push({ title: movie.title, times, format: '2D' });
        } else {
          // Keep this so we can see, next round, whether a showtime-shaped
          // select existed at all but just had no *new* options.
          attempt.postDateSelects = afterDateSelects.map((s) => s.options).filter((o) => o.length);
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
