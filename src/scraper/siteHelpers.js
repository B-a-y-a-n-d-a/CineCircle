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
