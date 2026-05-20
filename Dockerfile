FROM node:22-alpine AS base
RUN corepack enable
# pnpm version is pinned via package.json `packageManager` field — corepack
# resolves it on the first pnpm invocation. Don't `corepack prepare …@latest`
# here; pnpm 11 turned the previously-soft "ignored builds" warning into a
# hard error, breaking `docker compose build` (#152). Pinning to 10.x keeps
# host + Docker on the same major.

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Build client
FROM base AS build-client
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_CLERK_PUBLISHABLE_KEY=${VITE_CLERK_PUBLISHABLE_KEY}
RUN pnpm run build:client

# Build server
FROM base AS build-server
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build:server

# Production image
FROM node:22-alpine AS production
RUN corepack enable
# pnpm version is pinned via package.json `packageManager` field — corepack
# resolves it on the first pnpm invocation. Don't `corepack prepare …@latest`
# here; pnpm 11 turned the previously-soft "ignored builds" warning into a
# hard error, breaking `docker compose build` (#152). Pinning to 10.x keeps
# host + Docker on the same major.
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY --from=build-client /app/dist/client ./dist/client
COPY --from=build-server /app/dist/server ./dist/server

EXPOSE 5022
ENV NODE_ENV=production
ENV PORT=5022

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -q --spider http://localhost:5022/api/health || exit 1

CMD ["node", "dist/server/server/index.js"]
