// Shared, best-effort showtime extraction. Both sites are JS-rendered booking
// widgets with no public API, and their exact CSS classes may change without
// notice — so instead of hardcoding class names (which break on the first
// redesign), this walks the *rendered* DOM in the browser looking for
// "movie card" shaped clusters: a heading-ish piece of text followed by one
// or more HH:MM time strings, optionally with a format tag (IMAX/3D/4DX/etc).
//
// This is a v1 heuristic. It will very likely need a tuning pass against the
// real site — see docs/SCRAPER_SETUP.md for how to iterate on it together.

export async function extractShowtimesFromPage(page) {
  return page.evaluate(() => {
    const TIME_RE = /\b([01]?\d|2[0-3]):([0-5]\d)\b/g;
    const FORMAT_RE = /\b(IMAX(?:\s?3D)?|4DX|Xtreme|3D|2D|VIP|Premiere)\b/i;

    // Candidate "card" containers: anything reasonably small that contains at
    // least one time string. We walk up from text nodes matching the time
    // pattern to find a sensible container, then dedupe overlapping cards.
    const allEls = Array.from(document.querySelectorAll('body *'));
    const withTimes = allEls.filter((el) => {
      if (el.children.length > 6) return false; // too big to be a single showtime chip
      const text = el.textContent || '';
      return text.length < 40 && TIME_RE.test(text);
    });

    const cards = [];
    const seenContainers = new Set();

    for (const timeEl of withTimes) {
      // Walk up a few levels to find a container that also has a title-ish
      // heading nearby (an ancestor whose text is longer and has no time).
      let container = timeEl;
      let title = null;
      for (let i = 0; i < 6 && container; i++) {
        const text = (container.textContent || '').trim();
        if (text.length > 200) break; // gone too far up, this is now a whole list

        const heading = container.querySelector('h1,h2,h3,h4,h5,[class*="title" i],[class*="name" i]');
        if (heading && heading.textContent.trim().length > 1 && !TIME_RE.test(heading.textContent)) {
          title = heading.textContent.trim();
          break;
        }
        container = container.parentElement;
      }
      if (!title || !container) continue;
      if (seenContainers.has(container)) continue;
      seenContainers.add(container);

      const fullText = container.textContent || '';
      const times = [...fullText.matchAll(TIME_RE)].map((m) => `${m[1].padStart(2, '0')}:${m[2]}`);
      const formatMatch = fullText.match(FORMAT_RE);

      if (times.length) {
        cards.push({
          title,
          times: [...new Set(times)],
          format: formatMatch ? formatMatch[1].toUpperCase() : '2D',
        });
      }
    }

    // Merge cards that share the same title (common when the DOM has nested
    // matches at multiple levels).
    const merged = new Map();
    for (const c of cards) {
      const key = c.title.toLowerCase();
      if (!merged.has(key)) merged.set(key, { title: c.title, times: new Set(), format: c.format });
      const entry = merged.get(key);
      c.times.forEach((t) => entry.times.add(t));
    }

    return [...merged.values()].map((e) => ({ title: e.title, times: [...e.times], format: e.format }));
  });
}
