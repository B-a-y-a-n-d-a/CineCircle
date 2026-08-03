# Setting up sign-in (email/password + Google)

CineCircle now has a real login screen before the name screen. Do these steps in order.

## 1. Run the database migration

Supabase Dashboard → your project → **SQL Editor** → New query → paste the entire contents of `supabase/migration_auth.sql` → **Run**.

This links your `users` table to Supabase's built-in auth system and auto-creates a row whenever someone signs up.

## 2. Get your anon/publishable key

Project Settings → **Data API** (or **API**) → find the **anon public** key (or **Publishable key** if your project uses the new key system — starts with `sb_publishable_...`). This is different from the `service_role`/secret key already in your `.env` — this one is safe to expose in the browser.

Open `public/js/supabase-config.js` and paste it in place of `PASTE_YOUR_ANON_OR_PUBLISHABLE_KEY_HERE`.

## 3. Turn on email/password sign-in

Supabase Dashboard → **Authentication** → **Providers** → **Email** should already be enabled by default. If you don't want email confirmation links slowing down testing, you can turn off "Confirm email" here for now (re-enable before going live).

## 4. Set up Google sign-in

### a) Create Google OAuth credentials

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → create a project (or pick an existing one) called `CineCircle`.
2. Go to **APIs & Services → OAuth consent screen** → choose **External** → fill in an app name and your email → save.
3. Go to **APIs & Services → Credentials** → **Create Credentials → OAuth client ID** → Application type: **Web application**.
4. Under **Authorized redirect URIs**, add:
   ```
   https://xgwfgoqrgjkbkmrurftb.supabase.co/auth/v1/callback
   ```
   (this is your Supabase project's callback URL — Supabase also shows you this exact value on its Google provider settings page in step b)
5. Click Create. Copy the **Client ID** and **Client Secret** shown.

### b) Connect it to Supabase

1. Supabase Dashboard → **Authentication → Providers** → find **Google** → toggle it on.
2. Paste in the **Client ID** and **Client Secret** from Google.
3. Save.

### c) Set your site URL (for redirects after login)

Supabase Dashboard → **Authentication → URL Configuration**:
- **Site URL**: `http://localhost:3000` (change this to your real domain once deployed)
- **Redirect URLs**: add `http://localhost:3000/welcome.html`

## 5. Test it

```
npm run dev
```

Open `http://localhost:3000` — you should land on the new login screen. Try both:
- **Sign Up** with an email/password
- **Continue with Google**

Either path should drop you on the display-name screen (pre-filled if you used Google), then into the app.
