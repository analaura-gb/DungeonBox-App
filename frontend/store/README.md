# DungeonBox — Store Frontend

Store interface for the DungeonBox platform: browse power-ups and characters,
see your balance, and buy what you can afford. Built with React, Vite and
Tailwind, served under the `/store/` path so an ingress can route each
microservice by prefix.

## Two backends, one origin

This frontend talks to two services: the auth backend answers whether a session
exists, and the store backend serves the catalog, the balance and the purchases.

Both are reached through relative paths under `VITE_API_BASE_URL`, which is
`/api`. In production an ingress serves the pages and both APIs from the same
domain; in development the Vite proxy in `vite.config.ts` reproduces that,
forwarding `/api/auth` to port 3000 and `/api/store` to port 3001. The same code
runs in both, and neither needs CORS.

Calls go out with `credentials: "include"`, since the session lives in an
httpOnly cookie the auth backend set. Nothing is stored in the browser.

A visitor without a session can still browse the catalog; the buy buttons stay
disabled and point to the sign-in page.

## Running locally

Both backends must be up first, and the store catalog needs rows — a fresh
database has nothing to sell.

```bash
bun install
bun run dev
```

Opens on http://localhost:5174/store/.

## Checks

```bash
bun run lint:ci   # ESLint, fails on warnings
bun run build     # type check and production build
```
