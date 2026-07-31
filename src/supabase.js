import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  console.error('   Copy .env.example to .env and fill in your Supabase values.');
  process.exit(1);
}

// Service-role client: full DB access, server-side only. Never expose this key to the browser.
export const supabase = createClient(url, key, { auth: { persistSession: false } });
