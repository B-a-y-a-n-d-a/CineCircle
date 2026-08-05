# Deploying CineCircle to GCP (Cloud Run, push-to-deploy on `main`)

Same Dockerfile as before — Cloud Run just runs any container that listens
on `process.env.PORT`, which `server.js` already does. This doc covers the
GCP-specific wiring: Artifact Registry (image storage) + Cloud Build
(build/deploy pipeline) + a trigger connected to your GitHub repo so every
push to `main` redeploys automatically, no GitHub Actions needed.

You'll need the `gcloud` CLI installed and authenticated (`gcloud init`),
or you can do every step below from the Cloud Console UI instead — I've
noted both where they differ meaningfully.

## 0. Pick a project + region

```
gcloud config set project YOUR_PROJECT_ID
```

Region recommendation: **`africa-south1`** (Johannesburg) — lowest latency
for a South African audience, and it's what `cloudbuild.yaml` defaults to.
Change the `_REGION` substitution in `cloudbuild.yaml` if you'd rather use
a region you already have other infra in.

## 1. Enable the APIs you need (one-time)

```
gcloud services enable run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com
```

## 2. Create the Artifact Registry repo (one-time)

```
gcloud artifacts repositories create cinecircle-repo \
  --repository-format=docker \
  --location=africa-south1
```

(Match `--location` to whatever `_REGION` you set in `cloudbuild.yaml`.)

## 3. Store your Supabase secrets in Secret Manager

Same two values as before, from your local `.env` — never commit that
file. Cloud Run pulls these in at deploy time via `--set-secrets` (already
in `cloudbuild.yaml`), so they never sit in plain env vars or build logs.

```
echo -n "https://YOUR_PROJECT_REF.supabase.co" | \
  gcloud secrets create SUPABASE_URL --data-file=-

echo -n "your-service-role-key" | \
  gcloud secrets create SUPABASE_SERVICE_ROLE_KEY --data-file=-
```

## 4. Grant Cloud Build permission to deploy + read secrets

Cloud Build runs as a service account (`PROJECT_NUMBER@cloudbuild.gserviceaccount.com`).
Give it what it needs to push images, deploy to Cloud Run, and read the two
secrets:

```
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format='value(projectNumber)')
CB_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:${CB_SA}" --role="roles/run.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:${CB_SA}" --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:${CB_SA}" --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:${CB_SA}" --role="roles/artifactregistry.writer"
```

## 5. Connect your GitHub repo and create the trigger (push-to-deploy)

This is the part that replaces Railway's built-in GitHub integration.

Easiest via **Console** (Cloud Build has a guided GitHub connection flow
that's fiddly to fully replicate in pure `gcloud` commands):

1. Cloud Console → **Cloud Build → Triggers → Connect Repository**.
2. Choose **GitHub**, authorize the Cloud Build GitHub App, and select this
   repository.
3. **Create a trigger**:
   - Event: **Push to a branch**
   - Branch: `^main$`
   - Configuration: **Cloud Build configuration file** → `cloudbuild.yaml`
     (already in the repo root)
   - Region: same as your Cloud Run region

Once saved, every `git push` to `main` triggers Cloud Build automatically —
no extra CI config needed beyond this trigger.

## 6. First deploy

Trigger it once manually to confirm everything's wired correctly, either by
pushing a commit to `main`, or from Console: **Triggers → Run**. Watch the
build logs in **Cloud Build → History**.

## 7. Verify it's live

```
gcloud run services describe cinecircle --region=africa-south1 --format='value(status.url)'
```

Visit `<that-url>/api/health` — should return
`{"ok":true,"app":"CineCircle API"}`.

## 8. Why `--min-instances=1` and `--max-instances=1` matter here

Cloud Run scales to zero by default when idle, which would silently kill
the nightly 03:00 scraper cron (`server.js`, in-process via `node-cron`) —
it only fires while the Node process stays alive. `cloudbuild.yaml`
already pins both min and max instances to exactly 1, so:

- the process never goes to sleep (cron keeps firing), and
- you never accidentally get two instances each running their own cron at
  once (harmless since the scraper upserts idempotently, but wasteful).

This does mean a small always-on cost (roughly one small Cloud Run instance
running 24/7) rather than true scale-to-zero billing — the trade-off is
inherent to keeping an in-process cron reliable on Cloud Run. If you'd
rather go serverless properly, the alternative is to drop the in-process
cron entirely and use **Cloud Scheduler** to hit an admin endpoint (e.g. a
new authenticated `POST /api/admin/scrape/run` call) on a schedule instead
— say the word and I can wire that up.

## 9. Memory

Headless Chromium is the heaviest thing this app does. `--memory=2Gi` is
already set in `cloudbuild.yaml` as a safe default; bump it if a scrape run
ever gets OOM-killed (check Cloud Run's Logs Explorer for the container
being terminated mid-scrape).
