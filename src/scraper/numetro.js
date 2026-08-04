import { extractShowtimesFromPage } from './extract.js';
import { chooseCinemaByText } from './siteHelpers.js';

// Best-effort v1 — same caveats as sterkinekor.js. Nu Metro's homepage has a
// "Choose a cinema" table of cinema names, which may be a <select> or plain
// clickable rows; chooseCinemaByText() tries both.
export async function scrapeNuMetroCinema(browser, cinemaSiteName, dayIndex) {
  const page = await browser.newPage();
  try {
    await page.goto('https://www.numetro.co.za/', { waitUntil: 'networkidle', timeout: 30000 });

    const selected = await chooseCinemaByText(page, cinemaSiteName);
    if (!selected) return { ok: false, error: `Could not find cinema filter for "${cinemaSiteName}"`, url: page.url() };
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // The clickable-text dump from the last run had zero date-shaped text
    // anywhere on the homepage — just nav links (Home, Now Showing, Coming
    // Soon...). That suggests the homepage silently defaults to "today" and
    // a date picker (if one exists) only shows up once you're actually on
    // the "Now Showing" view, or once you're on an individual movie's own
    // page. Try clicking into "Now Showing" first, in case that's what
    // reveals it.
    const nowShowingLink = page.getByText('Now Showing', { exact: false }).first();
    if (await nowShowingLink.count().catch(() => 0)) {
      await nowShowingLink.click({ timeout: 5000 }).catch(() => {});
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(1500);
    }

    const dateButtons = page.locator('[class*="date" i] button, [class*="date" i] [role="button"], button[class*="day" i]');
    const dateButtonsFound = await dateButtons.count().catch(() => 0);
    if (dateButtonsFound > dayIndex) {
      await dateButtons.nth(dayIndex).click({ timeout: 5000 }).catch(() => {});
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(1500);
    }

    const results = await extractShowtimesFromPage(page);
    const diagnostics = { dateButtonsFound, urlAfterCinemaSelect: page.url() };

    // dateButtonsFound is always 0, meaning our selector guess doesn't match
    // whatever Nu Metro actually uses for its date picker. Instead of
    // guessing another CSS selector blind, dump every clickable-looking
    // element's text so the real markup shows up in the next log — same
    // "look at the diagnostics, then fix precisely" approach that got
    // Ster-Kinekor working.
    if (dayIndex === 0 || results.length === 0) {
      diagnostics.clickableTexts = await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('button, [role="button"], a, [class*="date" i], [class*="day" i], [class*="tab" i], select option'));
        return [...new Set(els.map((el) => (el.textContent || '').trim()).filter((t) => t && t.length < 40))].slice(0, 80);
      }).catch(() => []);

      // Also grab any link that looks like it points at one of our two
      // target movies specifically — if Nu Metro's date picker lives on
      // each movie's own page (like Ster-Kinekor's Quick Book), this gives
      // us the URL to go try next.
      diagnostics.movieLinks = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a'));
        return anchors
          .map((a) => ({ text: (a.textContent || '').trim(), href: a.getAttribute('href') }))
          .filter((a) => a.text && a.href && /spider|odyssey/i.test(a.text))
          .slice(0, 10);
      }).catch(() => []);
    }
    if (results.length === 0) {
      diagnostics.pageTextSnippet = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 400)).catch(() => '');
    }
    return { ok: true, results, url: page.url(), diagnostics };
  } catch (err) {
    return { ok: false, error: err.message, url: page.url() };
  } finally {
    await page.close();
  }
}
