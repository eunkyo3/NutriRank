# syntax=docker/dockerfile:1

# ---- deps ----
FROM node:22-slim AS deps
WORKDIR /app
# python3 + build-essential: better-sqlite3 native build fallback if no prebuilt binary for this arch
RUN apt-get update && apt-get install -y --no-install-recommends python3 build-essential \
    && rm -rf /var/lib/apt/lists/*
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate \
    && pnpm install --frozen-lockfile

# ---- build ----
FROM node:22-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate \
    && pnpm build \
    && pnpm build:ingest
# better-sqlite3's transitive native deps (bindings → file-uri-to-path) are loaded
# via a dynamic require that Next's tracer can't follow through pnpm's symlinked
# store, so they're pruned from the standalone bundle. Stage them dereferenced
# (cp -RL) for the runner to drop at top-level node_modules where require() finds them.
RUN mkdir -p /native \
    && cp -RL node_modules/.pnpm/bindings@*/node_modules/bindings /native/bindings \
    && cp -RL node_modules/.pnpm/file-uri-to-path@*/node_modules/file-uri-to-path /native/file-uri-to-path

# ---- runner ----
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV DATABASE_PATH=/data/nutrirank.sqlite
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
# Native deps better-sqlite3 needs at runtime (see build stage note above).
COPY --from=build /native/bindings ./node_modules/bindings
COPY --from=build /native/file-uri-to-path ./node_modules/file-uri-to-path
# pub[l]ic: glob form so COPY doesn't fail if /public doesn't exist yet
COPY --from=build /app/pub[l]ic ./public
# Batch ingest bundle + Drizzle schema/migrations so the batch runs from THIS image
# (§5 AC#3). The bundle keeps better-sqlite3/drizzle-orm external; they resolve from
# /app/node_modules, which the standalone trace (next.config.mjs) already populated.
COPY --from=build /app/dist ./dist
COPY --from=build /app/db ./db
VOLUME ["/data"]
EXPOSE 3000
# DATA_GO_KR_SERVICE_KEY and DATABASE_PATH are injected at runtime, never baked into the image
CMD ["node", "server.js"]
