# DungeonBox — Game Backend

Saves the runs played in the game: who played, with which character, the
result (score, kills, level, time), the weapons / passive items at the end and
the coins earned. Built like the auth backend: NestJS on Bun, Prisma 7 and its
own Postgres database.

The game does not create sessions. It reads the `access_token` cookie set by
the auth service at login and verifies it with the same `JWT_SECRET`, so
`JWT_SECRET` in `.env.dev` must match the auth service.

## Running locally (port 3003)

```bash
cd backend/game
docker compose up -d           # Postgres: 5438 (dev) and 5439 (tests)
bun install                    # first time only
bun run prisma:generate:dev    # first time only
bun run db:migrate:dev         # first time only (creates the tables and the catalog)
bun run dev
```

## API

Every route needs the session cookie (`401` without it).

| Method | Route | What it does |
| --- | --- | --- |
| `GET` | `/api/game/catalog` | Enemies, bosses, pickups, weapons and passive items, loaded by the game before a run |
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

Characters live in the store service. When `STORE_API_URL` is set, starting a
run asks the store which characters the player owns (`GET
/api/store/me/characters`, signed in as the player with the shared
`JWT_SECRET`): a character the player does not own is refused (`403`), a store
that does not answer stops the run from starting (`503`), and the character's
starting weapon is kept with the run, to check the result later. When the run
is finished, its coins (score / 100) are added to the player's wallet in the
store (`POST /api/store/internal/wallets/:userId/credit`, with the
`INTERNAL_API_KEY` shared with the store). Without
`STORE_API_URL` any character id starts a run and that check is skipped.

When a run is finished it is also sent to the ranking service
(`POST /api/ranking/runs` with the shared `INTERNAL_API_KEY`), if `RANKING_API_URL`
is set in `.env.dev`. If the ranking is down the run is still saved here and
the error is only logged.

## Database

- `enemies` and `pickups`: the game reads them from here before a run
  (`GET /api/game/catalog`), so enemy stats, spawn times and item drop
  chances are changed in the database. Bosses are the enemies with a
  `boss_order`.
- `weapons` and `weapon_levels`: every weapon and its stats per level, also
  read by the game. A weapon only picks one of the behaviors the game knows
  (`behavior`), so a new weapon is a new row plus its levels:

  | `behavior` | What it does | Level columns it uses |
  | --- | --- | --- |
  | `projectile` | shoots at the nearest enemy | `cooldown`, `damage`, `count`, `pierce`, `speed` |
  | `orbit` | items circle the player | `cooldown` (hit interval per enemy), `damage`, `count`, `area` (orbit radius), `speed` (rotation), `size` (hit radius), `knockback` |
  | `aura` | hurts every enemy around the player | `cooldown`, `damage`, `area` (radius), `effect` |
  | `pulse` | expanding rings | `cooldown`, `damage`, `count` (rings), `area` (max radius), `speed`, `size` (ring width), `knockback` |
  | `melee` | arc swipe where the player faces | `cooldown`, `damage`, `count` (1 front, 2 both sides), `area` (range), `size` (half angle, radians), `knockback`, `effect` |
  | `drone` | homing shots | `cooldown`, `damage`, `count`, `speed`, `effect` |

  `effect` is `slow`, `burn` or `explode`. The cooldown never drops below the
  weapon's `min_cooldown`, whatever the passive items do. The max level is the
  number of levels.
- `passive_items`: each one raises one `stat` by `value` per level (`speed`,
  `damage`, `pickupRadius` and `xp` in fractions, `cooldown` and `armor` as a
  fraction compounded per level, `maxHp` in HP).
- `runs`, `run_weapons`, `run_passive_items`: the runs and their final loadout.
  `user_id` comes from the token; users live in the auth service, so there is
  no foreign key to them. `character_id` is the id of a store character, so
  there is no foreign key to it either.

## Checks

```bash
bun run lint:ci
bun run test        # unit tests
bun run test:e2e    # needs the test database (docker compose) migrated:
                    # bun run prisma:generate:test && bun run db:migrate:test
bun run build
```
