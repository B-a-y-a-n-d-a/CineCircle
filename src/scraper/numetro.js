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

    const dateButtons = page.locator('[class*="date" i] button, [class*="date" i] [role="button"], button[class*="day" i]');
    const count = await dateButtons.count().catch(() => 0);
    if (count > dayIndex) {
      await dateButtons.nth(dayIndex).click({ timeout: 5000 }).catch(() => {});
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    }

    const results = await extractShowtimesFromPage(page);
    return { ok: true, results, url: page.url() };
  } catch (err) {
    return { ok: false, error: err.message, url: page.url() };
  } finally {
    await page.close();
  }
}
