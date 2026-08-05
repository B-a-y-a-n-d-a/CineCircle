// Which cinemas we scrape — scoped to Gauteng only per product decision.
// `siteName` must match the text shown in each site's cinema picker exactly
// enough for a text-based/select match to find it (case-insensitive substring).
export const TARGET_CINEMAS = [
  { chain: 'sterkinekor', siteName: 'Sandton',   displayName: 'Ster-Kinekor Sandton City', city: 'Johannesburg' },
  { chain: 'sterkinekor', siteName: 'Cresta',     displayName: 'Ster-Kinekor Cresta',        city: 'Johannesburg' },
  { chain: 'sterkinekor', siteName: 'Fourways',   displayName: 'Ster-Kinekor Fourways',      city: 'Johannesburg' },
  // Confirmed against a live cinema-select dump from Ster-Kinekor's own site
  // (captured during scraper testing) rather than guessed. "The Zone" entry
  // uses a shorter substring ("Zone @ Roseban") because the site's own
  // option text for it consistently comes through truncated at that exact
  // point across every capture — matching on that guaranteed substring
  // instead of a full guessed name.
  { chain: 'sterkinekor', siteName: 'Mall of Africa', displayName: 'Ster-Kinekor Mall of Africa', city: 'Midrand' },
  { chain: 'sterkinekor', siteName: 'Zone @ Roseban',  displayName: 'Ster-Kinekor The Zone @ Rosebank', city: 'Johannesburg' },
  { chain: 'sterkinekor', siteName: 'Southgate',       displayName: 'Ster-Kinekor Southgate',      city: 'Johannesburg' },
  // The rest of Ster-Kinekor's Gauteng footprint — confirmed by fetching
  // sterkinekor.com/locator directly (its own "Find a cinema" list, grouped
  // by province) rather than guessed or scraped from a third-party site.
  // A couple of these ("Brooklyn Commercia…") were truncated by the
  // locator's own UI, same as "Zone @ Roseban" above, so siteName only
  // covers the guaranteed, untruncated portion. "The Grove" also appears
  // as "The Grove Windhoek" under Namibia on the same page — if the
  // matcher ever grabs the wrong one, tighten this substring once a scrape
  // run's console log shows which option text it actually saw.
  { chain: 'sterkinekor', siteName: 'Brooklyn',    displayName: 'Ster-Kinekor Brooklyn Mall',  city: 'Pretoria' },
  { chain: 'sterkinekor', siteName: 'Carnival City', displayName: 'Ster-Kinekor Carnival City', city: 'Brakpan' },
  { chain: 'sterkinekor', siteName: 'Cedar Square', displayName: 'Ster-Kinekor Cedar Square',  city: 'Johannesburg' },
  { chain: 'sterkinekor', siteName: 'Cradlestone', displayName: 'Ster-Kinekor Cradlestone',    city: 'Krugersdorp' },
  { chain: 'sterkinekor', siteName: 'Eastgate',    displayName: 'Ster-Kinekor Eastgate',       city: 'Germiston' },
  { chain: 'sterkinekor', siteName: 'Irene',       displayName: 'Ster-Kinekor Irene',          city: 'Centurion' },
  { chain: 'sterkinekor', siteName: 'Rosebank Nouveau', displayName: 'Ster-Kinekor Rosebank Nouveau', city: 'Johannesburg' },
  { chain: 'sterkinekor', siteName: 'The Grove',   displayName: 'Ster-Kinekor The Grove',      city: 'Pretoria' },
  { chain: 'sterkinekor', siteName: 'Vaal',        displayName: 'Ster-Kinekor Vaal',           city: 'Vanderbijlpark' },
  { chain: 'sterkinekor', siteName: 'Wonderpark',  displayName: 'Ster-Kinekor Wonderpark',     city: 'Pretoria' },
  { chain: 'numetro',     siteName: 'Menlyn Park', displayName: 'Nu Metro Menlyn Park',      city: 'Pretoria' },
  { chain: 'numetro',     siteName: 'Hyde Park',   displayName: 'Nu Metro Hyde Park',        city: 'Johannesburg' },
  { chain: 'numetro',     siteName: 'Clearwater',  displayName: 'Nu Metro Clearwater',       city: 'Roodepoort' },
  { chain: 'numetro',     siteName: 'Emperors Palace', displayName: 'Nu Metro Emperors Palace', city: 'Kempton Park' },
  // The rest of Nu Metro's Gauteng footprint — confirmed against
  // numetro.co.za/cinemas' own cinema list. That page lists cinemas
  // nationwide without a province tag, so these four were identified by
  // known location (Bedford = Bedford Centre, Bedfordview; The Glen =
  // Oakdene, Johannesburg; Woodlands = Woodlands Boulevard, Pretoria);
  // "Westgate (Roodepoort)" was explicit on the page itself.
  { chain: 'numetro',     siteName: 'Bedford',    displayName: 'Nu Metro Bedford',   city: 'Bedfordview' },
  { chain: 'numetro',     siteName: 'The Glen',   displayName: 'Nu Metro The Glen',  city: 'Johannesburg' },
  { chain: 'numetro',     siteName: 'Woodlands',  displayName: 'Nu Metro Woodlands', city: 'Pretoria' },
  { chain: 'numetro',     siteName: 'Westgate',   displayName: 'Nu Metro Westgate',  city: 'Roodepoort' },
];

// How many days ahead to scrape, per the request: today, tomorrow, day after.
export const DAYS_AHEAD = 3;

// Gauteng city names used to trim old, out-of-scope seed data (see migration_v4.sql).
export const GAUTENG_CITIES = [
  'Johannesburg', 'Pretoria', 'Roodepoort', 'Kempton Park', 'Centurion', 'Midrand',
  'Brakpan', 'Krugersdorp', 'Germiston', 'Vanderbijlpark', 'Bedfordview',
];
