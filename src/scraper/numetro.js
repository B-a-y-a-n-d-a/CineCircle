import { extractShowtimesFromPage } from './extract.js';
import { chooseCinemaByText } from './siteHelpers.js';

// v3 — confirmed directly from the live site (from Bayanda inspecting the
// page himself): on a movie's own page, selecting a cinema location is what
// reveals a "Confirm your date and time for <movie>" section — that's where
// the real dates and showtimes live. No "Book Now" click needed at all;
// that was a wrong guess from before this was confirmed.

function normalize(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
function tokenSet(str) {
  return new Set(normalize(str).split(' ').filter(Boolean));
}
// Anchor text on the now-showing page includes genre/runtime/rating noise
// around the title, so we check "every word of the movie title shows up in
// the link text" rather than an exact/ordered match.
function titleTokensSubsetOf(movieTitle, linkText) {
  const wanted = tokenSet(movieTitle);
  const have = tokenSet(linkText);
  if (!wanted.size) return false;
  for (const t of wanted) if (!have.has(t)) return false;
  return true;
}

const WEEKDAY_HINTS = ['today', 'tomorrow', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export async function scrapeNuMetroCinema(browser, cinemaSiteName, dayIndex, targetMovies = []) {
  const page = await browser.newPage();
  const results = [];
  const diagnostics = { cinemaSelectedOnHome: false, movieAttempts: [] };

  try {
    await page.goto('https://www.numetro.co.za/', { waitUntil: 'networkidle', timeout: 30000 });
    diagnostics.cinemaSelectedOnHome = await chooseCinemaByText(page, cinemaSiteName);
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500);

    const nowShowingLink = page.getByText('Now Showing', { exact: false }).first();
    if (await nowShowingLink.count().catch(() => 0)) {
      await nowShowingLink.click({ timeout: 5000 }).catch(() => {});
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(1500);
    }

    // Find each target movie's own detail page URL from the now-showing grid.
    const movieLinks = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a'));
      return anchors
        .map((a) => ({ text: (a.textContent || '').trim(), href: a.getAttribute('href') }))
        .filter((a) => a.text && a.href && a.href.includes('/movie/'));
    }).catch(() => []);

    for (const movie of targetMovies) {
      const link = movieLinks.find((l) => titleTokensSubsetOf(movie.title, l.text));
      const attempt = { title: movie.title, linkFound: !!link, cinemaSelected: false, timesFound: 0 };
      if (!link) {
        diagnostics.movieAttempts.push(attempt);
        continue;
      }

      try {
        const detailUrl = new URL(link.href, 'https://www.numetro.co.za/').toString();
        // The movie detail page apparently never goes fully network-idle
        // (some persistent background request — ads/analytics polling) —
        // 'networkidle' timed out here every time. 'load' is enough since
        // we explicitly wait afterwards anyway.
        await page.goto(detailUrl, { waitUntil: 'load', timeout: 30000 });
        await page.waitForTimeout(1500);

        // Confirmed live (from the "Confirm your date and time for Nu
        // Metro" dump last round — "Nu Metro" is the generic placeholder,
        // meaning no real cinema was ever actually confirmed): this page's
        // cinema picker is its own widget with a "Choose your cinema"
        // prompt that opens a searchable table (#CinemaTable, rows filled
        // into tbody#output), not plain clickable text. chooseCinemaByText
        // was matching something else on the page entirely. Drive the real
        // widget explicitly.
        const chooseCinemaPrompt = page.getByText('Choose your cinema', { exact: false }).first();
        if (await chooseCinemaPrompt.count().catch(() => 0)) {
          await chooseCinemaPrompt.click({ timeout: 5000 }).catch(() => {});
          await page.waitForTimeout(1000);
        }

        // Wait for the cinema table to actually have real rows (it starts
        // empty and fills in via JS/AJAX).
        let cinemaRow = null;
        for (let i = 0; i < 10 && !cinemaRow; i++) {
          const row = page.locator('#output tr, #CinemaTable tbody tr').filter({ hasText: cinemaSiteName }).first();
          if (await row.count().catch(() => 0)) cinemaRow = row;
          else await page.waitForTimeout(500);
        }
        attempt.cinemaRowFound = !!cinemaRow;
        if (cinemaRow) {
          await cinemaRow.click({ timeout: 5000 }).catch(() => {});
          await page.waitForTimeout(1500);
        }

        // Confirm the cinema actually took — location_title should now
        // read our cinema name instead of the generic "Nu Metro" default.
        attempt.locationTitleAfter = await page.locator('#location_title').first().textContent().catch(() => null);
        attempt.cinemaSelected = !!attempt.locationTitleAfter && normalize(attempt.locationTitleAfter).includes(normalize(cinemaSiteName));

        if (!attempt.cinemaSelected) {
          attempt.clickableTexts = await page.evaluate(() => {
            const els = Array.from(document.querySelectorAll('button, [role="button"], a, [class*="date" i], [class*="day" i], [class*="tab" i], select option'));
            return [...new Set(els.map((el) => (el.textContent || '').trim()).filter((t) => t && t.length < 40))].slice(0, 60);
          }).catch(() => []);
          diagnostics.movieAttempts.push(attempt);
          continue;
        }

        // Last round: we successfully got real showtimes (great — cinema
        // selection is genuinely fixed), but they were identical across
        // days, meaning we're still just seeing whatever "today" defaults
        // to. Our button/select-shaped date-picker guesses found nothing
        // again (dateButtonsFound: 0). Rather than guess another CSS shape,
        // search the WHOLE page (not just near the confirm heading — the
        // widget may live in a different column) for any short element
        // whose own text looks date-like (a weekday name, "Today"/
        // "Tomorrow", or a day-of-month), and log exactly what it is.
        const dateLikeElements = await page.evaluate(() => {
          const weekdayHints = ['today', 'tomorrow', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
          const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
          const all = Array.from(document.querySelectorAll('body *'));
          const matches = all.filter((e) => {
            if (e.children.length > 2) return false;
            const text = norm(e.textContent);
            if (!text || text.length > 25) return false;
            return weekdayHints.some((h) => text.includes(h));
          });
          return matches.slice(0, 20).map((e) => ({
            tag: e.tagName,
            className: (e.className || '').toString().slice(0, 80),
            text: (e.textContent || '').trim().slice(0, 40),
            id: e.id || null,
          }));
        }).catch(() => []);
        attempt.dateLikeElements = dateLikeElements;

        // Try a few likely shapes for a date picker within/near that section.
        const dateButtons = page.locator(
          '[class*="date" i] button, [class*="date" i] [role="button"], button[class*="day" i], [class*="tab" i] button'
        );
        const dateButtonsFound = await dateButtons.count().catch(() => 0);
        attempt.dateButtonsFound = dateButtonsFound;
        if (dateButtonsFound > dayIndex) {
          await dateButtons.nth(dayIndex).click({ timeout: 5000 }).catch(() => {});
          await page.waitForTimeout(1500);
        } else {
          // No obvious button-based date picker — check for a <select> with
          // weekday-ish options instead (same pattern Ster-Kinekor used).
          const selects = page.locator('select');
          const selectCount = await selects.count().catch(() => 0);
          for (let i = 0; i < selectCount; i++) {
            const options = await selects.nth(i).locator('option').allTextContents().catch(() => []);
            const looksLikeDates = options.some((o) => WEEKDAY_HINTS.some((h) => normalize(o).includes(h)));
            if (looksLikeDates && options.length > dayIndex) {
              await selects.nth(i).selectOption({ index: dayIndex }).catch(() => {});
              attempt.dateSelectUsed = true;
              await page.waitForTimeout(1500);
              break;
            }
          }
        }

        const cards = await extractShowtimesFromPage(page);
        const times = cards.length ? cards[0].times : [];
        attempt.timesFound = times.length;
        if (times.length) {
          results.push({ title: movie.title, times, format: cards[0].format || '2D' });
        } else {
          attempt.clickableTexts = await page.evaluate(() => {
            const els = Array.from(document.querySelectorAll('button, [role="button"], a, [class*="date" i], [class*="day" i], [class*="tab" i], select option'));
            return [...new Set(els.map((el) => (el.textContent || '').trim()).filter((t) => t && t.length < 40))].slice(0, 60);
          }).catch(() => []);
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
