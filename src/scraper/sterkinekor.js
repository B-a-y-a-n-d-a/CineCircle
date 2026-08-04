import { extractShowtimesFromPage } from './extract.js';

// v3 — the generic "pick any <select> containing this text" approach from v2
// grabbed the wrong dropdown: Ster-Kinekor's homepage has a "Find A Cinema"
// location-search widget whose options are also plain cinema names, and that
// one was matched first. Selecting there doesn't touch the "now showing"
// grid at all (confirmed live: page still showed the location-search sidebar
// after "selecting" a cinema).
//
// Strategy now: try the cinema as a URL query param first (the confirmed
// option value was the plain lowercase slug, e.g. "sandton" — cheap to try
// since these Angular apps often read filters from the URL). If that doesn't
// change the rendered listing, fall back to trying every <select> on the
// page one at a time and checking whether the listing changed afterwards
// (rather than assuming the first match is correct).
export async function scrapeSterKinekorCinema(browser, cinemaSiteName, dayIndex) {
  const page = await browser.newPage();
  try {
    const slug = cinemaSiteName.toLowerCase().replace(/[^a-z0-9]/g, '');
    await page.goto(`https://www.sterkinekor.com/actual-content?tab=now-showing&cinema=${slug}`, {
      waitUntil: 'networkidle', timeout: 30000,
    });
    await page.waitForTimeout(2000);

    let results = await extractShowtimesFromPage(page);
    let usedFallback = false;

    if (results.length === 0) {
      usedFallback = true;
      const selects = page.locator('select');
      const selectCount = await selects.count().catch(() => 0);
      for (let i = 0; i < selectCount && results.length === 0; i++) {
        const select = selects.nth(i);
        const options = await select.locator('option').allTextContents().catch(() => []);
        const matchIndex = options.findIndex((o) => o.trim().toLowerCase().includes(cinemaSiteName.toLowerCase()));
        if (matchIndex === -1) continue;

        await select.selectOption({ index: matchIndex }).catch(() => {});
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(2000);
        results = await extractShowtimesFromPage(page);
      }
    }

    const diagnostics = { usedFallback };
    if (results.length === 0) {
      // Cheap but decisive check: does ANY HH:MM-shaped text exist anywhere on
      // the page at all? If not, this page simply doesn't list showtimes
      // (likely a movie-only grid where you must click into a movie first to
      // pick cinema/date/time) — a structural difference, not a selector bug.
      diagnostics.anyTimeStringsOnPage = await page.evaluate(() => {
        const text = document.body.innerText || '';
        const matches = text.match(/\b([01]?\d|2[0-3]):[0-5]\d\b/g) || [];
        return matches.length;
      }).catch(() => -1);
      diagnostics.pageTextSnippet = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 500)).catch(() => '');
      diagnostics.pageTextEnd = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(-500)).catch(() => '');
    }
    return { ok: true, results, url: page.url(), diagnostics };
  } catch (err) {
    return { ok: false, error: err.message, url: page.url() };
  } finally {
    await page.close();
  }
}
