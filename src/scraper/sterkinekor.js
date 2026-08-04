import { extractShowtimesFromPage } from './extract.js';
import { chooseCinemaByText } from './siteHelpers.js';

// v2 — confirmed from a live run that the "now showing" page is reached
// directly at this URL, and the cinema filter is a native <select> whose
// options are lowercase slugs (e.g. value="sandton", label "Sandton").
// dayIndex: 0 = today, 1 = tomorrow, 2 = day after.
export async function scrapeSterKinekorCinema(browser, cinemaSiteName, dayIndex) {
  const page = await browser.newPage();
  try {
    await page.goto('https://www.sterkinekor.com/actual-content?tab=now-showing', {
      waitUntil: 'networkidle', timeout: 30000,
    });

    const selected = await chooseCinemaByText(page, cinemaSiteName);
    if (!selected) return { ok: false, error: `Could not find cinema filter for "${cinemaSiteName}"`, url: page.url() };
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000); // let client-side rendering finish beyond "networkidle"

    // Try to select the right day. Sites like this usually render a small
    // strip of date buttons; we just click the Nth one as a best guess.
    const dateButtons = page.locator('[class*="date" i] button, [class*="date" i] [role="button"], button[class*="day" i]');
    const dateButtonsFound = await dateButtons.count().catch(() => 0);
    if (dateButtonsFound > dayIndex) {
      await dateButtons.nth(dayIndex).click({ timeout: 5000 }).catch(() => {});
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(1500);
    }

    const results = await extractShowtimesFromPage(page);
    const diagnostics = { dateButtonsFound };
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
