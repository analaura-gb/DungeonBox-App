# DungeonBox — Auth Frontend

Authentication interface for the DungeonBox platform: sign in, sign up and
password recovery. Built with React, Vite and Tailwind, served under the
`/auth/` path so an ingress can route each microservice by prefix.

It talks to the auth backend over HTTP and keeps no token of its own — the
session lives in an httpOnly cookie the backend sets, which is why every
request goes out with `credentials: "include"`.

## Running locally

The auth backend must be up first, since every screen depends on it.

```bash
bun install
bun run dev
```

Opens on http://localhost:5173/auth/.

`VITE_API_BASE_URL` in `.env` points at the backend and defaults to
`http://localhost:3000`. Variables prefixed with `VITE_` are embedded into the
bundle at build time and visible in the browser, so no secret belongs there.

## Checks

```bash
bun run lint:ci   # ESLint, fails on warnings
bun run build     # type check and production build
```
