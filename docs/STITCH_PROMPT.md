# Google Stitch prompt for the CineCircle UI

Go to [stitch.withgoogle.com](https://stitch.withgoogle.com), start a new **web** project, and paste this prompt. Generate each screen, then export the code and drop it into `public/` (or ask AI Studio/Gemini to wire the exported HTML to the API using `docs/API.md`).

---

Design a dark-themed web app called **CineCircle** for cinema lovers who want to watch the same movie together and discuss it afterwards. Current featured movie: Spider-Man: Brand New Day, so use a red (#e23636), deep blue (#1b3a8c), and dark navy (#0b0e1a) palette with a subtle web-pattern motif. Modern, card-based, rounded corners, mobile-friendly.

Screens:

1. **Home / Watch Groups** — Hero banner for the featured movie (title, genre, runtime, "Now Screening" badge). Below it, a grid of watch-group cards. Each card shows: group name, cinema and city (South African cinemas like Ster-Kinekor Sandton City), showtime and format badges (IMAX 3D, 4DX), a vibe tag (Casual, Hardcore fans, First-timers welcome, Quiet watchers), overlapping member avatars with a "5/8 going" count, an after-movie hangout section (coffee/drinks spot + discussion topic), and a red "Join This Group" button (disabled "Group Full" state). Filters for city and vibe at the top, plus a "+ Start a Group" button.

2. **Create Group modal** — Fields: group name, screening (dropdown of cinema + time + format), vibe, max group size, after-movie hangout spot, discussion topic/icebreaker. Cancel + Create buttons.

3. **My Plans** — Same cards for groups the user joined, with a "Leave group" option and an empty state encouraging them to browse groups.

4. **Discussion Board** — A composer (textarea, "contains spoilers" checkbox, Post button) and a feed of posts: author avatar + name, timestamp, post text, spider-emoji like button with count. Spoiler posts are blurred with a "⚠️ SPOILER — tap to reveal" tag.

5. **Simple name entry** — lightweight prompt/modal asking for the user's display name before joining or posting.

Top navigation: CineCircle logo, tabs for Watch Groups / My Plans / Discussion Board, and a user chip showing the display name.

---

## After exporting from Stitch

1. Put the exported files in `public/` (keep `index.html` as the entry point).
2. Wire the buttons to the backend using `docs/API.md` — or paste both the exported code and `docs/API.md` into Google AI Studio and ask Gemini: *"Wire this UI to these REST endpoints using fetch(). Store the user id from POST /api/users in localStorage."*
3. Run `npm run dev` and open http://localhost:3000.
