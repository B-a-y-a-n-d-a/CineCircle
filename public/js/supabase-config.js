// CineCircle — public Supabase config for the BROWSER.
// This key is safe to expose client-side (it's the "anon" / "publishable" key,
// NOT the secret/service_role key used by the server in .env).
//
// Fill these in from: Supabase Dashboard -> Project Settings -> Data API / API
//   SUPABASE_URL         same value as your server .env
//   SUPABASE_ANON_KEY     "anon public" key (legacy) or "sb_publishable_..." key (new)

window.SUPABASE_CONFIG = {
  url: 'https://xgwfgoqrgjkbkmrurftb.supabase.co',
  anonKey: 'sb_publishable_GSuqftUxtvQV2P5NoOD9hg_8l-kkR6V',
};
