import { extractShowtimesFromPage } from './extract.js';
import { chooseCinemaByText } from './siteHelpers.js';

// v2 — the "Now Showing" homepage has no date picker at all (confirmed:
// a full clickable-element dump came back with zero date-shaped text), so
// it silently shows only today's showtimes. But it does link out to each
// movie's own page (e.g. /movie/7045/ for "The Odyssey") — that's almost
// certainly where the real cinema + date selection lives, similar to how
// Ster-Kinekor's real showtimes only live inside its Quick Book widget.
//
// This drills into each of our target movies' own pages (only those two,
// same "don't loop every movie" approach as Ster-Kinekor) and tries to
// pick the cinema + the requested day there. Exact markup on the detail
// page is still unconfirmed, so this stays generous with fallbacks and
// dumps diagnostics whenever something doesn't resolve cleanly.

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

      let bookingPage = page;
      try {
        const detailUrl = new URL(link.href, 'https://www.numetro.co.za/').toString();
        // The movie detail page apparently never goes fully network-idle
        // (some persistent background request — ads/analytics polling) —
        // 'networkidle' timed out here every time last run. 'load' is
        // enough since we explicitly wait afterwards anyway.
        await page.goto(detailUrl, { waitUntil: 'load', timeout: 30000 });
        await page.waitForTimeout(1500);

        attempt.cinemaSelected = await chooseCinemaByText(page, cinemaSiteName);
        await page.waitForTimeout(1500);

        // Last run: the diagnostics dump was byte-for-byte identical before
        // and after clicking "Book Now" — the click did nothing to *this*
        // page. That's the fingerprint of a link that opens a new tab
        // (target="_blank") to a separate booking system, rather than
        // updating the current page. Watch for that popup explicitly.
        const bookNowButton = page.getByText('Book Now', { exact: false }).first();
        if (await bookNowButton.count().catch(() => 0)) {
          const popupPromise = page.context().waitForEvent('page', { timeout: 8000 }).catch(() => null);
          await bookNowButton.click({ timeout: 5000 }).catch(() => {});
          const popup = await popupPromise;
          if (popup) {
            bookingPage = popup;
            await bookingPage.waitForLoadState('load', { timeout: 20000 }).catch(() => {});
          }
          await bookingPage.waitForTimeout(2000);
        }
        attempt.usedPopup = bookingPage !== page;
        attempt.bookingUrl = bookingPage.url();

        // The booking flow (own site or separate ticketing system) may need
        // its own cinema selection — try it there too, harmlessly no-ops if
        // there's nothing to select.
        await chooseCinemaByText(bookingPage, cinemaSiteName).catch(() => false);
        await bookingPage.waitForTimeout(1000);

        // Try a few likely shapes for a date picker.
        const dateButtons = bookingPage.locator(
          '[class*="date" i] button, [class*="date" i] [role="button"], button[class*="day" i], [class*="tab" i] button'
        );
        const dateButtonsFound = await dateButtons.count().catch(() => 0);
        attempt.dateButtonsFound = dateButtonsFound;
        if (dateButtonsFound > dayIndex) {
          await dateButtons.nth(dayIndex).click({ timeout: 5000 }).catch(() => {});
          await bookingPage.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
          await bookingPage.waitForTimeout(1500);
        } else {
          // No obvious button-based date picker — check for a <select> with
          // weekday-ish options instead (same pattern Ster-Kinekor used).
          const selects = bookingPage.locator('select');
          const selectCount = await selects.count().catch(() => 0);
          for (let i = 0; i < selectCount; i++) {
            const options = await selects.nth(i).locator('option').allTextContents().catch(() => []);
            const looksLikeDates = options.some((o) => WEEKDAY_HINTS.some((h) => normalize(o).includes(h)));
            if (looksLikeDates && options.length > dayIndex) {
              await selects.nth(i).selectOption({ index: dayIndex }).catch(() => {});
              attempt.dateSelectUsed = true;
              await bookingPage.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
              await bookingPage.waitForTimeout(1500);
              break;
            }
          }
        }

        const cards = await extractShowtimesFromPage(bookingPage);
        const times = cards.length ? cards[0].times : [];
        attempt.timesFound = times.length;
        if (times.length) {
          results.push({ title: movie.title, times, format: cards[0].format || '2D' });
        } else {
          attempt.clickableTexts = await bookingPage.evaluate(() => {
            const els = Array.from(document.querySelectorAll('button, [role="button"], a, [class*="date" i], [class*="day" i], [class*="tab" i], select option'));
            return [...new Set(els.map((el) => (el.textContent || '').trim()).filter((t) => t && t.length < 40))].slice(0, 60);
          }).catch(() => []);
        }
      } catch (err) {
        attempt.error = err.message;
      } finally {
        if (bookingPage !== page) await bookingPage.close().catch(() => {});
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
