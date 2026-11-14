# syntax=docker/dockerfile:1

ARG BUN_VERSION=1.3.12

FROM oven/bun:${BUN_VERSION}-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM deps AS build
WORKDIR /app
COPY . .
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
RUN bun run prisma:generate:prod && bun run build

FROM oven/bun:${BUN_VERSION}-alpine AS prod-deps
WORKDIR /app
COPY package.json bun.lock ./
RUN printf '[install]\npeer = false\n' > bunfig.toml \
 && bun install --frozen-lockfile --production

FROM oven/bun:${BUN_VERSION}-alpine AS migrator
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json bun.lock prisma.config.ts ./
COPY prisma ./prisma
USER bun
CMD ["bun", "run", "db:migrate:prod"]

FROM oven/bun:${BUN_VERSION}-alpine AS app
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
USER bun
EXPOSE 3000
CMD ["bun", "dist/src/main.js"]
