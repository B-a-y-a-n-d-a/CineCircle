// Shared navigation helpers used by both site scrapers.

// Selects a cinema from whichever UI pattern the site uses: a native
// <select> dropdown (Ster-Kinekor uses this — confirmed from a live run) or,
// failing that, a plain clickable element containing the text.
export async function chooseCinemaByText(page, text) {
  const selects = page.locator('select');
  const selectCount = await selects.count().catch(() => 0);

  for (let i = 0; i < selectCount; i++) {
    const select = selects.nth(i);
    const options = await select.locator('option').allTextContents().catch(() => []);
    const matchIndex = options.findIndex((o) => o.trim().toLowerCase().includes(text.toLowerCase()));
    if (matchIndex !== -1) {
      await select.selectOption({ index: matchIndex });
      return true;
    }
  }

  // Fallback: some sites use a clickable list/card instead of a <select>.
  const clickable = page.getByText(text, { exact: false }).first();
  if (await clickable.count().catch(() => 0)) {
    await clickable.click({ timeout: 5000 }).catch(() => {});
    return true;
  }

  return false;
}

function normalizeText(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

// Lists every <select> on the page with its option texts, so callers can
// figure out which select is "the movie one" / "the date one" / etc by
// inspecting option content rather than guessing a fixed position.
export async function listSelects(page) {
  const selects = page.locator('select');
  const count = await selects.count().catch(() => 0);
  const out = [];
  for (let i = 0; i < count; i++) {
    const options = await selects.nth(i).locator('option').allTextContents().catch(() => []);
    out.push({ index: i, options: options.map((o) => o.trim()).filter(Boolean) });
  }
  return out;
}

// Selects an option (by substring match) in whichever <select> currently
// contains it. Returns true/false. Used for sequential/dependent-dropdown
// widgets (Quick Book style) where later selects only get their real
// options populated after an earlier one is chosen.
export async function selectOptionContaining(page, valueText) {
  const wanted = normalizeText(valueText);
  const selects = page.locator('select');
  const count = await selects.count().catch(() => 0);
  for (let i = 0; i < count; i++) {
    const select = selects.nth(i);
    const options = await select.locator('option').allTextContents().catch(() => []);
    const matchIndex = options.findIndex((o) => normalizeText(o).includes(wanted) || wanted.includes(normalizeText(o)));
    if (matchIndex !== -1 && normalizeText(options[matchIndex])) {
      await select.selectOption({ index: matchIndex }).catch(() => {});
      return true;
    }
  }
  return false;
}

// Same idea, but for Angular-Material-style custom dropdowns that don't use
// a native <select> at all: a clickable "trigger" element opens an overlay
// with role="option"/mat-option items. We don't know the exact trigger, so
// we try clicking anything that looks like a dropdown/combobox trigger
// whose current label roughly matches `triggerHint` (e.g. "movie", "date"),
// then click the option matching `valueText` once the panel is open.
export async function selectCustomDropdown(page, triggerHint, valueText) {
  const triggers = page.locator(
    '[role="combobox"], [class*="select" i], [class*="dropdown" i], mat-select'
  ).filter({ hasText: new RegExp(triggerHint, 'i') });
  const triggerCount = await triggers.count().catch(() => 0);
  for (let i = 0; i < triggerCount; i++) {
    await triggers.nth(i).click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(400);
    const option = page.locator('[role="option"], mat-option, li, div').filter({ hasText: valueText }).first();
    if (await option.count().catch(() => 0)) {
      await option.click({ timeout: 3000 }).catch(() => {});
      return true;
    }
    await page.keyboard.press('Escape').catch(() => {});
  }
  return false;
}
