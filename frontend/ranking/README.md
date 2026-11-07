# DungeonBox — Ranking Frontend

Ranking page: the signed-in player's totals and position, and the top 10
players by best score. Same layout and session handling as the other
frontends, served under `/ranking/`.

## Running locally (port 5175)

Needs the auth backend and the ranking backend running
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
(`/api/auth/...`, `/api/ranking/...`): in development the Vite proxy
(`vite.config.ts`) sends them to each backend, in the cluster the ingress does.
The character sprites come from the game frontend (`VITE_GAME_URL`).

## Checks

```bash
bun run lint:ci
bun run build
```
