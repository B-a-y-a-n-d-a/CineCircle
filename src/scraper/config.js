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
  { chain: 'numetro',     siteName: 'Menlyn Park', displayName: 'Nu Metro Menlyn Park',      city: 'Pretoria' },
  { chain: 'numetro',     siteName: 'Hyde Park',   displayName: 'Nu Metro Hyde Park',        city: 'Johannesburg' },
  { chain: 'numetro',     siteName: 'Clearwater',  displayName: 'Nu Metro Clearwater',       city: 'Roodepoort' },
  { chain: 'numetro',     siteName: 'Emperors Palace', displayName: 'Nu Metro Emperors Palace', city: 'Kempton Park' },
];

// How many days ahead to scrape, per the request: today, tomorrow, day after.
export const DAYS_AHEAD = 3;

// Gauteng city names used to trim old, out-of-scope seed data (see migration_v4.sql).
export const GAUTENG_CITIES = ['Johannesburg', 'Pretoria', 'Roodepoort', 'Kempton Park', 'Centurion', 'Midrand'];
