# DungeonBox — Ranking Frontend

Ranking page: the signed-in player's totals and position, and the top 10
players by best score. Same layout and session handling as the other
frontends, served under `/ranking/`.

## Running locally (port 5175)

Needs the auth, store, game and ranking backends running
(`backend/ranking/README.md`), plus the other frontends for the menu links.

```bash
cd frontend/ranking
bun install    # first time only
bun run dev
```

Open http://localhost:5175/ranking/ (sign in first at
http://localhost:5173/auth/login).

`.env` (same as the other frontends): `VITE_API_BASE_URL=/api` and the address
of each frontend for the menu. The API is called with relative paths
(`/api/auth/...`, `/api/store/...`, `/api/ranking/...`): in development the
Vite proxy (`vite.config.ts`) sends them to each backend, in the cluster the
ingress does.

The character names and pictures come from the store
(`GET /api/store/characters`), so a new character only needs its row in the
store. The picture is the character's `imageUrl` (served under `/assets/`, in
development Vite sends it to `ASSETS_PROXY_TARGET`, default
`http://localhost:8080`), and `public/no-art.svg` when it is missing. Without
the store the ranking still loads, showing the character ids.

The "Build" column shows the weapons and passive items of each run with their
level. The runs keep only the ids; the names and pictures come from the game
backend (`GET /api/game/catalog`), so the game backend must be running too.
Without it the build shows the ids over the missing-art image.

## Checks

```bash
bun run lint:ci   # ESLint, fails on warnings
bun run test      # Vitest (jsdom)
bun run build     # type check and production build
```
