# DungeonBox — Game Backend

Saves the runs played in the game: who played, with which character, the
result (score, kills, level, time), the weapons / passive items at the end and
the coins earned. Built like the auth backend: NestJS on Bun, Prisma 7 and its
own Postgres database.

The game does not create sessions. It reads the `access_token` cookie set by
the auth service at login and verifies it with the same `JWT_SECRET`, so
`JWT_SECRET` in `.env.dev` must match the auth service.

## Running locally (port 3001)

```bash
cd backend/game
docker compose up -d           # Postgres: 5434 (dev) and 5435 (tests)
bun install                    # first time only
bun run prisma:generate:dev    # first time only
bun run db:migrate:dev         # first time only (creates the tables and the catalog)
bun run dev
```

## API

Every route needs the session cookie (`401` without it).

| Method | Route | What it does |
| --- | --- | --- |
| `POST` | `/api/game/runs` | Starts a run: `{ "characterId": "ana-laura" }` |
| `POST` | `/api/game/runs/:id/finish` | Saves the result of a run (see below) |
| `GET` | `/api/game/runs/me` | The player's 10 best finished runs, best score first |

Finish body:

```json
{
  "won": false,
  "score": 2345,
  "kills": 120,
  "levelReached": 9,
  "survivedTime": 240,
  "weapons": [{ "id": "compiler", "level": 3 }],
  "passiveItems": [{ "id": "espresso", "level": 2 }]
}
```

The result comes from the browser, so it is checked against the game rules
(`src/game.service.ts` and `src/dto/finish-run.dto.ts`): at most 3 weapons and 3 passive items, known ids
and levels, the starting weapon present, the time not longer than 10 minutes
nor than the real time since the run started, and a run can only be finished
once. Coins earned: 1 per 100 points.

When a run is finished it is also sent to the ranking service
(`POST /api/ranking/runs` with the shared `INTERNAL_API_KEY`), if `RANKING_API_URL`
is set in `.env.dev`. If the ranking is down the run is still saved here and
the error is only logged.

## Database

- `weapons`, `passive_items`, `characters`: catalog with the same ids as the
  game frontend (`frontend/game/src/game/content.ts`). It is filled by the
  `seed_catalog` migration; adding something to the game needs a new
  migration like that one. Balance values (damage, cooldowns, ...) stay in the
  frontend.
- `runs`, `run_weapons`, `run_passive_items`: the runs and their final loadout.
  `user_id` comes from the token; users live in the auth service, so there is
  no foreign key to them.

## Checks

```bash
bun run lint:ci
bun run test        # unit tests
bun run test:e2e    # needs the test database (docker compose) migrated:
                    # bun run prisma:generate:test && bun run db:migrate:test
bun run build
```
