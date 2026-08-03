# 🕸️ CineCircle

Meet fellow cinema lovers, watch the same movie together, and chill afterwards for post-movie discussion. MVP built around **Spider-Man: Brand New Day** screenings at South African cinemas.

**Stack:** Node.js + Express · Supabase (PostgreSQL, free tier) · Frontend from Google Stitch

## Setup (once)

### 1. Supabase (free database)

1. Go to [supabase.com](https://supabase.com) → sign in with GitHub → **New project** (name it `cinecircle`, pick a strong DB password, region: Europe/closest to SA).
2. Open **SQL Editor** → **New query** → paste the entire contents of `supabase/schema.sql` → **Run**. This creates all tables and seed data.
3. Go to **Project Settings → API** and copy:
   - **Project URL**
   - **service_role key** (under "Project API keys" — keep this secret)

### 2. Environment

```bash
copy .env.example .env
```

Edit `.env` and paste your Supabase URL and service_role key.

### 3. Install & run

```bash
npm install
npm run dev
```

Open http://localhost:3000 — the test page lets you hit every endpoint.

## Push to GitHub

Create an empty repo at [github.com/new](https://github.com/new) (name: `cinecircle`, don't add a README), then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/cinecircle.git
git branch -M main
git push -u origin main
```

The `.env` file is git-ignored — your secrets never leave your machine.

## Project structure

```
server.js            Express app entry point
src/supabase.js      Database client
src/routes/          API endpoints (users, screenings, groups, posts)
supabase/schema.sql  Database tables + seed data
public/              Frontend — replace with your Google Stitch UI
docs/API.md          Full API reference for wiring the frontend
docs/STITCH_PROMPT.md  Ready-to-paste prompt for Google Stitch
```

## Sign-in (email/password + Google)

See `docs/AUTH_SETUP.md` for the full walkthrough — you'll need to run one more SQL migration, grab your anon/publishable key, and (for Google) create OAuth credentials in Google Cloud Console.

## Roadmap

- Replace name-only login with Supabase Auth (email / magic link)
- Multiple movies, real showtime data
- Group chat per screening
- Deploy: Render/Railway (API) — Supabase is already hosted
