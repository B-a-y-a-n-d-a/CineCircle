// v6 — the v5 diagnostics finally show exactly what's going on. The page has
// TWO cinema-name selects: the "now showing" browsing filter (placeholder
// "All locations") and the Quick Book widget's OWN cinema field (placeholder
// "Select your cinema"). Our old matcher grabbed whichever came first in DOM
// order — the browsing filter — every time, so the Quick Book's own cinema
// field was never actually set. Same risk applies to "cinema type" (there's
// a browsing-filter version AND a Quick Book version with identical option
// text). That's why "Choose a date" / "Choose a showtime" never populated:
// the Quick Book widget itself never got a real cinema selection.
//
// Also: the old generic "click anything that looks like a dropdown and
// contains this text" fallback was matching unrelated elements elsewhere on
// the page (e.g. the movie's own title text sitting in a footer/list) and
// reporting false success. Every field on this page is confirmed to be a
// plain native <select> — there is no evidence of a custom widget anywhere
// in the diagnostics — so that fallback is removed entirely.
//
// New strategy: identify each Quick Book select by its own placeholder
// text ("Select your cinema" / "Select movie" / "Choose a cinema type" /
// "Choose a date" / "Choose a showtime") instead of by option content, since
// several selects on this page share overlapping option content. Once
// "Choose a showtime" is reached, its own options ARE the real times — no
// more heuristics needed.

function normalize(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

// Ster-Kinekor lists some titles article-last, cinema-style ("Odyssey, The"
// instead of "The Odyssey") — confirmed live: our own "The Odyssey" never
// matched the site's "Odyssey, The" with a plain substring check. Comparing
// as unordered word sets instead of ordered substrings sidesteps that (and
// any other word-order quirks) without needing chain-specific regexes.
function tokenSet(str) {
  return new Set(normalize(str).split(' ').filter(Boolean));
}
function tokensMatch(a, b) {
  const setA = tokenSet(a);
  const setB = tokenSet(b);
  if (!setA.size || !setB.size) return false;
  const [smaller, larger] = setA.size <= setB.size ? [setA, setB] : [setB, setA];
  for (const t of smaller) if (!larger.has(t)) return false;
  return true;
}

// Finds the <select> whose first (placeholder) option matches `placeholder`,
// and picks the option inside it matching `valueText` (if given) or at
// `optionIndex` (1-based among the real, non-placeholder options).
async function selectQuickBookField(page, placeholder, { valueText, optionIndex } = {}) {
  const selects = page.locator('select');
  const count = await selects.count().catch(() => 0);
  for (let i = 0; i < count; i++) {
    const select = selects.nth(i);
    const options = await select.locator('option').allTextContents().catch(() => []);
    if (!options.length || normalize(options[0]) !== normalize(placeholder)) continue;

    const realOptions = options.slice(1);
    if (!realOptions.length) return { found: true, set: false, reason: 'no-real-options-yet', options };

    let matchIndex = -1;
    if (valueText) {
      matchIndex = realOptions.findIndex((o) => tokensMatch(o, valueText));
    } else if (typeof optionIndex === 'number') {
      matchIndex = realOptions.length > optionIndex ? optionIndex : -1;
    }
    if (matchIndex === -1) return { found: true, set: false, reason: 'no-matching-option', options: realOptions };

    await select.selectOption({ index: matchIndex + 1 }).catch(() => {});
    return { found: true, set: true, selectedText: realOptions[matchIndex], options: realOptions };
  }
  return { found: false, set: false, reason: 'select-not-found' };
}

// Instead of a blind fixed sleep, poll until the named placeholder-select
// actually has more than just its placeholder option (or we give up) — the
// last run showed inconsistent load times between fields, so a fixed wait
// sometimes checked before the next field had finished populating.
async function waitForRealOptions(page, placeholder, maxWaitMs = 6000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const selects = page.locator('select');
    const count = await selects.count().catch(() => 0);
    for (let i = 0; i < count; i++) {
      const options = await selects.nth(i).locator('option').allTextContents().catch(() => []);
      if (options.length > 1 && normalize(options[0]) === normalize(placeholder)) return true;
    }
    await page.waitForTimeout(300);
  }
  return false;
}

export async function scrapeSterKinekorCinema(browser, cinemaSiteName, dayIndex, targetMovies = []) {
  const page = await browser.newPage();
  const results = [];
  const diagnostics = { cinemaSelected: false, movieAttempts: [] };
  const url = `https://www.sterkinekor.com/actual-content?tab=now-showing&cinema=${cinemaSiteName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

  try {
    for (const movie of targetMovies) {
      const attempt = { title: movie.title, cinemaSelected: false, movieSelected: false, typeSelected: false, dateSelected: false, timesFound: 0 };
      try {
        // Fresh page per movie — a shared widget instance desynced after a
        // few selections in a row during the last run.
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(1500);

        const cinemaResult = await selectQuickBookField(page, 'Select your cinema', { valueText: cinemaSiteName });
        attempt.cinemaSelected = cinemaResult.set;
        diagnostics.cinemaSelected = diagnostics.cinemaSelected || cinemaResult.set;
        if (!cinemaResult.set) {
          attempt.cinemaResult = cinemaResult;
          diagnostics.movieAttempts.push(attempt);
          continue;
        }
        await waitForRealOptions(page, 'Select movie');

        const movieResult = await selectQuickBookField(page, 'Select movie', { valueText: movie.title });
        attempt.movieSelected = movieResult.set;
        if (!movieResult.set) {
          attempt.movieResult = movieResult;
          diagnostics.movieAttempts.push(attempt);
          continue;
        }
        await waitForRealOptions(page, 'Choose a cinema type');

        const typeResult = await selectQuickBookField(page, 'Choose a cinema type', { valueText: '2D' });
        attempt.typeSelected = typeResult.set;
        // If there's no 2D option (e.g. an IMAX-only screen), fall back to
        // whichever cinema type comes first rather than giving up entirely.
        if (!typeResult.set && typeResult.found && typeResult.reason === 'no-matching-option') {
          const fallbackType = await selectQuickBookField(page, 'Choose a cinema type', { optionIndex: 0 });
          attempt.typeSelected = fallbackType.set;
        }
        await waitForRealOptions(page, 'Choose a date');

        const dateResult = await selectQuickBookField(page, 'Choose a date', { optionIndex: dayIndex });
        attempt.dateSelected = dateResult.set;
        attempt.dateResult = dateResult.set ? undefined : dateResult;
        if (!dateResult.set) {
          diagnostics.movieAttempts.push(attempt);
          continue;
        }
        await waitForRealOptions(page, 'Choose a showtime');

        const showtimeSelect = page.locator('select').filter({ hasText: 'Choose a showtime' });
        const showtimeOptions = await showtimeSelect.first().locator('option').allTextContents().catch(() => []);
        const times = showtimeOptions.slice(1).map((t) => t.trim()).filter(Boolean);
        attempt.timesFound = times.length;
        if (times.length) {
          results.push({ title: movie.title, times, format: '2D' });
        }
      } catch (err) {
        attempt.error = err.message;
      }
      diagnostics.movieAttempts.push(attempt);
    }

    return { ok: true, results, url: page.url(), diagnostics };
  } catch (err) {
    return { ok: false, error: err.message, url: page.url(), diagnostics };
  } finally {
    await page.close();
  }
}
