# Deploying CineCircle (Railway, push-to-deploy on `main`)

This app is a single Node/Express service (`server.js`) that also serves
`public/` directly — no separate frontend build or service needed. The only
non-obvious runtime requirement is Playwright's headless Chromium, which the
scraper (`src/scraper/`) uses against Ster-Kinekor and Nu Metro. The
`Dockerfile` in this repo handles that already.

## 0. One-time local sanity check (optional but recommended)

You have Docker Desktop, so before pushing, confirm the image actually
builds and boots:

```
docker build -t cinecircle .
docker run --rm -p 3000:3000 --env-file .env cinecircle
```

Then hit `http://localhost:3000/api/health` — you should get
`{"ok":true,"app":"CineCircle API"}`. Ctrl+C to stop. This is exactly the
image Railway will build from your repo, so if it works here it'll work
there.

## 1. Push this repo to GitHub

Railway's push-to-deploy is powered by its GitHub App integration, so the
repo needs to be on GitHub (not just committed locally). If it isn't
already, create a repo on GitHub and push your existing `main` branch to it.

## 2. Create the Railway project

1. Go to [railway.app](https://railway.app) and sign in (or create an account).
2. **New Project → Deploy from GitHub repo**.
3. Authorize Railway's GitHub App if prompted, and select this repository.
4. Railway will detect the `Dockerfile` automatically (confirmed by
   `railway.toml`'s `builder = "DOCKERFILE"`) and kick off a first build.
   The very first build will be slow (~3-5 min) since it's pulling the
   Playwright base image; later builds are much faster thanks to layer
   caching.

## 3. Set environment variables

In the Railway project → your service → **Variables** tab, add exactly the
two secrets the app actually needs (from your local `.env` — never commit
that file):

| Variable | Value |
|---|---|
| `SUPABASE_URL` | your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | your Supabase service role key |

Do **not** set `PORT` — Railway injects its own `PORT` at runtime, and
`server.js` already reads `process.env.PORT` with a `3000` fallback for
local/Docker use, so it Just Works either way.

## 4. Confirm the production branch and push-to-deploy

Railway → your service → **Settings → Source**: confirm the connected
branch is `main` (or whichever branch you actually push to — rename here if
it says `master` or something else). Once set, **every `git push` to that
branch automatically triggers a new build + deploy** — no GitHub Actions or
extra CI config needed, Railway's GitHub App watches the branch directly.

## 5. Verify it's live

Railway assigns a public URL under **Settings → Networking → Generate
Domain** (or check the service's default `*.up.railway.app` URL). Visit
`https://<your-app>.up.railway.app/api/health` to confirm the deploy
succeeded, then open the actual site and sign in as before.

## 6. Why this keeps your nightly scraper working

The scraper's 03:00 daily run (`server.js`, via `node-cron`) only fires
while the Node process stays alive continuously. Railway services on a paid
plan run always-on by default (they don't scale-to-zero like Cloud Run
does without extra config), so the existing in-process cron keeps working
with zero changes. You can still trigger a scrape on demand anytime from
Admin → Showtimes → "Refresh Showtimes Now".

**Memory note**: headless Chromium is the heaviest thing this app does.
If a scrape run gets OOM-killed, bump your Railway service's memory limit
(Service → Settings → Resources) — 1GB+ is a safe starting point.

## 7. Rotating a leaked/exposed key

Since `.env` has been read directly in this project during development, if
you're at all unsure whether `SUPABASE_SERVICE_ROLE_KEY` may have leaked
anywhere public, rotate it from Supabase Dashboard → Project Settings → API
→ "Roll" next to the service role key, then update the value in Railway's
Variables tab.
