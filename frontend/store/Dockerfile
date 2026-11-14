# syntax=docker/dockerfile:1
# check=skip=SecretsUsedInArgOrEnv

ARG BUN_VERSION=1.3.12
ARG NGINX_VERSION=1.27

FROM oven/bun:${BUN_VERSION}-alpine AS build
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

ARG VITE_API_BASE_URL
ARG VITE_AUTH_URL
ARG VITE_STORE_URL
ARG VITE_RANKING_URL
ARG VITE_GAME_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_AUTH_URL=${VITE_AUTH_URL}
ENV VITE_STORE_URL=${VITE_STORE_URL}
ENV VITE_RANKING_URL=${VITE_RANKING_URL}
ENV VITE_GAME_URL=${VITE_GAME_URL}

RUN bun run build

FROM nginxinc/nginx-unprivileged:${NGINX_VERSION}-alpine AS app

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html/store

EXPOSE 8080
