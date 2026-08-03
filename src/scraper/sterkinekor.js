import { extractShowtimesFromPage } from './extract.js';

// Best-effort v1: Ster-Kinekor's homepage lists every cinema by name; clicking
// one is expected to land on a schedule page for that cinema with a date
// selector (tabs/buttons) for the next few days. dayIndex: 0 = today, 1 =
// tomorrow, 2 = day after. If your first run comes back empty, the most
// likely fix is the click targets below — see docs/SCRAPER_SETUP.md.
export async function scrapeSterKinekorCinema(browser, cinemaSiteName, dayIndex) {
  const page = await browser.newPage();
  try {
    await page.goto('https://www.sterkinekor.com/', { waitUntil: 'networkidle', timeout: 30000 });

    // Click the cinema by visible name (case-insensitive partial match).
    const cinemaLink = page.getByText(cinemaSiteName, { exact: false }).first();
    await cinemaLink.click({ timeout: 10000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    // Try to select the right day. Sites like this usually render a small
    // strip of date buttons; we just click the Nth one as a best guess.
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
