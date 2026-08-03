// Which cinemas we scrape, matched to the cities already used in our seed data.
// `siteName` must match the text shown in each site's cinema picker exactly
// enough for a text-based click to find it (case-insensitive substring match).
export const TARGET_CINEMAS = [
  { chain: 'sterkinekor', siteName: 'Sandton',      displayName: 'Ster-Kinekor Sandton City',     city: 'Johannesburg' },
  { chain: 'sterkinekor', siteName: 'Watercrest',   displayName: 'Ster-Kinekor Watercrest',        city: 'Durban' }, // "Gateway" is a Nu Metro, not a Ster-Kinekor — moved below
  { chain: 'sterkinekor', siteName: 'V&A',          displayName: 'Ster-Kinekor V&A Waterfront',    city: 'Cape Town' },
  { chain: 'sterkinekor', siteName: 'Baywest',      displayName: 'Ster-Kinekor Baywest',            city: 'Gqeberha' },
  { chain: 'numetro',     siteName: 'Menlyn Park',  displayName: 'Nu Metro Menlyn Park',            city: 'Pretoria' },
  { chain: 'numetro',     siteName: 'Canal Walk',   displayName: 'Nu Metro Canal Walk',              city: 'Cape Town' },
  { chain: 'numetro',     siteName: 'Gateway',      displayName: 'Nu Metro Gateway',                city: 'Durban' },
];

// How many days ahead to scrape, per the request: today, tomorrow, day after.
export const DAYS_AHEAD = 3;
