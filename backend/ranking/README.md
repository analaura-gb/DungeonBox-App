# DungeonBox — Ranking Backend

Keeps one row per finished run (sent by the game service) and the totals of
each player, used to build the ranking. Built like the auth and game
backends: NestJS on Bun, Prisma 7 and its own Postgres database.

## Running locally (port 3002)

```bash
cd backend/ranking
docker compose up -d           # Postgres: 5436 (dev) and 5437 (tests)
bun install                    # first time only
bun run prisma:generate:dev    # first time only
bun run db:migrate:dev         # first time only (creates the table)
bun run dev
```

## API

| Method | Route | Who calls it | What it does |
| --- | --- | --- | --- |
| `POST` | `/api/ranking/runs` | game backend | Records a finished run |
| `GET` | `/api/ranking` | browser (session cookie) | Top 10 runs by score (a player can appear more than once) |
| `GET` | `/api/ranking/me` | browser (session cookie) | Totals and position of the player |

- The browser routes use the `access_token` cookie from the auth service,
  verified with the same `JWT_SECRET`.
- `POST /api/ranking/runs` is service-to-service: the caller sends the shared
  `INTERNAL_API_KEY` in the `x-internal-key` header. The game backend does it
  when a run ends, if its `RANKING_API_URL` is set. A run is only recorded once.

## Database

- `run_stats`: one row per finished run (character, score, enemies killed,
  survived time, coins, won).
- `general_stats`: one row per player with the totals of all their runs (best
  score, total runs / wins / enemies / time / coins, last run). It is updated
  in the same transaction that saves each run.

`run_id` (game service) and `user_id` (auth service) belong to other services,
so they have no foreign keys to them.

## Checks

```bash
bun run lint:ci
bun run test        # unit tests
bun run test:e2e    # needs the test database (docker compose) migrated:
                    # bun run prisma:generate:test && bun run db:migrate:test
bun run build
```
