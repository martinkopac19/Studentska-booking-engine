# syntax=docker/dockerfile:1

# ---- Stage 1: build the Vite frontend ----------------------------------------
FROM node:22-bookworm-slim AS frontend
WORKDIR /build

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Stage 2: build the API server -------------------------------------------
FROM node:22-bookworm-slim AS server
WORKDIR /build

# better-sqlite3 falls back to compiling from source when no prebuilt binary
# matches this platform.
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

COPY server/package.json server/package-lock.json ./
RUN npm ci

COPY server/tsconfig.json ./
COPY server/src ./src
RUN npm run build

# Reinstall without dev dependencies so only runtime packages ship.
RUN npm ci --omit=dev

# ---- Stage 3: runtime ---------------------------------------------------------
FROM node:22-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=8080 \
    HOST=0.0.0.0 \
    DATA_DIR=/data \
    STATIC_DIR=/app/public

RUN mkdir -p /data && chown -R node:node /data

COPY --from=server  --chown=node:node /build/node_modules ./node_modules
COPY --from=server  --chown=node:node /build/dist         ./dist
COPY --from=server  --chown=node:node /build/package.json ./package.json
COPY --from=frontend --chown=node:node /build/dist        ./public

USER node
EXPOSE 8080
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8080/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
