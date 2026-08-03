# CineCircle v2 — multi-movie, group requests, chat/polls, admin

## 1. Run the migration

Supabase Dashboard → SQL Editor → New query → paste all of `supabase/migration_v2.sql` → Run.

This adds:
- A `movies` table, seeded with **Spider-Man: Brand New Day** and **The Odyssey**, plus 4 new Odyssey screenings
- `groups.status` (`pending` / `approved` / `rejected`) — every new group is now a *request* until an admin approves it
- `group_messages`, `group_polls`, `group_poll_options`, `group_poll_votes` — chat and polls inside each group
- `users.is_admin` / `users.is_banned`
- `posts.movie_id` — every discussion post is now tagged to a movie

## 2. Make yourself an admin

Log in to the app at least once (so your row exists in `users`), then in the SQL Editor run:

```sql
update users set is_admin = true where email = 'you@example.com';
```

Refresh the app — your avatar menu will now show an **Admin** link.

## 3. What's new for everyone

- **Watch Groups** — the hero banner now auto-cycles between every active movie (6s per slide, or click a dot to jump), each with a real **Trailer** button linking to YouTube. Use the new movie filter to browse groups per film.
- **Request a Group** — creating a group now submits it for admin review; it appears in **My Plans** with a "Pending approval" badge until approved (or "Not approved" if rejected). It only shows up in the public Watch Groups list once approved.
- **My Plans** — click any joined group's card (not just Leave) to open its detail screen: an **Info** tab (pinned screening/hangout/member card), a **Chat** tab, and a **Polls** tab where any member can start a poll and vote.
- **Discussion Board** — every post is now tagged with a movie; use the filter dropdown to view posts about one film, and pick a movie when posting.

## 4. What's new for admins

Avatar menu → **Admin**:
- **Group Requests** — approve or reject pending group requests
- **Movies** — add new movies (title, genre, runtime, poster/hero image URL, YouTube trailer URL)
- **Users** — ban or unban any account. Banned users are signed out immediately and can't log back in; their posts/messages stay in the database but the ban is enforced on every write action.

Admin routes are protected server-side (not just hidden in the UI) — the backend verifies your real Supabase session token and checks `is_admin` before allowing any admin action.
