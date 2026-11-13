# DungeonBox — Game Frontend

The DungeonBox game: a Vampire Survivors-style roguelite with a computer
engineering theme. Gameplay runs on Phaser (WebGL + Arcade Physics); menus,
HUD and the platform layout are React, Vite and Tailwind. Served under the
`/game/` path so an ingress can route each microservice by prefix.

Only signed-in players can play. The page asks the auth backend
(`GET /auth/me`) whether the session cookie is valid and otherwise links to
the auth frontend's sign-in page. Phaser (~1.4 MB) is only downloaded after
the session is confirmed.

## Running locally

The game needs the other services running too (Docker Desktop running for the databases):

```bash
# 1. auth backend (port 3000)
cd backend/auth
docker compose up -d
bun run dev

# 2. store backend (port 3001): the characters and who owns them
cd backend/store
docker compose up -d
bun install && bun run prisma:generate:dev && bun run db:migrate:dev   # first time only
bun run dev

# 3. game backend (port 3003)
cd backend/game
docker compose up -d
bun install && bun run prisma:generate:dev && bun run db:migrate:dev   # first time only
bun run dev

# 4. ranking backend (port 3002)
cd backend/ranking
docker compose up -d
bun install && bun run prisma:generate:dev && bun run db:migrate:dev   # first time only
bun run dev

# 5. auth frontend (port 5173)
cd frontend/auth && bun run dev

# 6. game frontend (port 5176)
cd frontend/game && bun install && bun run dev

# 7. ranking frontend (port 5175)
cd frontend/ranking && bun install && bun run dev
```

Sign in at http://localhost:5173/auth/login, then go to Game
(http://localhost:5176/game/). Each frontend runs on its own port in
development; in the cluster the ingress serves all of them from one domain.

`.env` (same as the other frontends): `VITE_API_BASE_URL=/api` and the address
of each frontend for the menu (`VITE_AUTH_URL`, `VITE_STORE_URL`,
`VITE_RANKING_URL`, `VITE_GAME_URL`). The API is called with relative paths
(`/api/auth/...`, `/api/game/...`): in development the Vite proxy
(`vite.config.ts`) sends them to each backend, in the cluster the ingress does.
Variables prefixed with
`VITE_` are embedded into the bundle at build time and visible in the
browser, so no secret belongs there.

## Backend

When the player presses START the game creates a run on the game backend; on
game over / graduation it sends the result and shows the coins earned. High
Scores lists the player's best runs from the backend
(`src/services/GameService.ts`). If the backend is down the game still plays,
the run just isn't saved.

The characters come from the store (`src/services/StoreService.ts`): every
character is listed, the ones the player does not own are locked with their
price and a link to the store. Ana Laura and Guilherme are free.

## Where things are

- `src/game/` — the game itself: `scene.ts` (gameplay), `engine.ts` (the API
  React uses), `content.ts` (balance settings at the top and the
  types of the game data; enemies, bosses, pickups, weapons and passives come
  from the game backend, `GET /api/game/catalog`, and the characters from the
  store, `GET /api/store/characters`), `textures.ts`, `sprites.ts`, `format.ts`
- `src/components/game/` — game screens drawn by React (menus, HUD, overlays)
- Art and sound are not in this frontend. Every picture comes from the
  `imageUrl` (and `spriteUrl`, `walkSpriteUrl`, `shotImageUrl`) of the item in
  the database, the floor from `/assets/map/floor.png` and the sounds from
  `/assets/audio/<name>.ogg|mp3`, all served by the assets service (see
  `assets/README.md` at the root). A picture that is missing shows
  `public/no-art.svg`, a missing sound is just silent. In development Vite
  sends `/assets` to `ASSETS_PROXY_TARGET` (default `http://localhost:8080`).
- `src/components/layout`, `src/contexts`, `src/services` — the shared
  platform layout and auth session, same as the other frontends

## Checks

```bash
bun run lint:ci   # ESLint, fails on warnings
bun run test      # Vitest (jsdom)
bun run build     # type check and production build
```
