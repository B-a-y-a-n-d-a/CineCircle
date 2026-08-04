// Which cinemas we scrape — scoped to Gauteng only per product decision.
// `siteName` must match the text shown in each site's cinema picker exactly
// enough for a text-based/select match to find it (case-insensitive substring).
export const TARGET_CINEMAS = [
  { chain: 'sterkinekor', siteName: 'Sandton',   displayName: 'Ster-Kinekor Sandton City', city: 'Johannesburg' },
  { chain: 'sterkinekor', siteName: 'Cresta',     displayName: 'Ster-Kinekor Cresta',        city: 'Johannesburg' },
  { chain: 'sterkinekor', siteName: 'Fourways',   displayName: 'Ster-Kinekor Fourways',      city: 'Johannesburg' },
  { chain: 'numetro',     siteName: 'Menlyn Park', displayName: 'Nu Metro Menlyn Park',      city: 'Pretoria' },
  { chain: 'numetro',     siteName: 'Hyde Park',   displayName: 'Nu Metro Hyde Park',        city: 'Johannesburg' },
  { chain: 'numetro',     siteName: 'Clearwater',  displayName: 'Nu Metro Clearwater',       city: 'Roodepoort' },
  { chain: 'numetro',     siteName: 'Emperors Palace', displayName: 'Nu Metro Emperors Palace', city: 'Kempton Park' },
];

// How many days ahead to scrape, per the request: today, tomorrow, day after.
export const DAYS_AHEAD = 3;

// Gauteng city names used to trim old, out-of-scope seed data (see migration_v4.sql).
export const GAUTENG_CITIES = ['Johannesburg', 'Pretoria', 'Roodepoort', 'Kempton Park', 'Centurion', 'Midrand'];
