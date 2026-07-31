# CineCircle API Reference

Base URL: `http://localhost:3000/api`

All request/response bodies are JSON. Store the `user id` returned by `POST /users` in `localStorage` and send it with actions.

## Users

`POST /users` — MVP login/register. Body: `{ "name": "Bayanda" }`
Returns `{ id, name, created_at }` (existing user if name already taken).

## Screenings

`GET /screenings`
Returns `[{ id, cinema, city, show_time, format }]`

## Groups

`GET /groups?city=Cape Town&vibe=Casual` (filters optional)
Returns:
```json
[{
  "id": "uuid", "name": "Web-Heads of Sandton", "vibe": "Hardcore fans",
  "max_size": 8, "spot": "Rocomamas, food court", "topic": "…",
  "screening": { "id": 1, "cinema": "Ster-Kinekor Sandton City", "city": "Johannesburg", "show_time": "Fri 31 Jul · 19:30", "format": "IMAX 3D" },
  "members": [{ "id": "uuid", "name": "Thabo" }]
}]
```

`POST /groups` — Body: `{ name, screening_id, vibe, max_size, spot, topic, user_id }`
Creator auto-joins. Returns the group.

`POST /groups/:id/join` — Body: `{ user_id }` → `409` if full or already joined.

`POST /groups/:id/leave` — Body: `{ user_id }`

## Posts (discussion board)

`GET /posts`
Returns `[{ id, text, spoiler, likes, created_at, author: { id, name } }]`
Render `spoiler: true` posts blurred until tapped.

`POST /posts` — Body: `{ user_id, text, spoiler }`

`POST /posts/:id/like` — Returns `{ likes }`

## Errors

Errors return `{ "error": "message" }` with status 400/404/409/500.
