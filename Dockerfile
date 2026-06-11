# Copyright (c) 2024-2026 Perpetuator LLC
#
# Multi-stage Dockerfile for the Capital Copilot Angular SSR frontend.
#
# Named targets (select with `docker build --target <stage>` or compose
# `build.target:`):
#
#   deps        Install node_modules from the lockfile. Shared base for `dev`
#               and `build` so the dependency layer is built once and only
#               busts when package.json / yarn.lock change.
#
#   dev         Local hot-reload dev server. Source is NOT copied in — it is
#               bind-mounted over /app at runtime by docker-compose.yml, and
#               node_modules is shadowed by an anonymous volume so the host's
#               macOS/arm binaries can't leak in over the image's Linux build.
#               This is "the same `yarn start` you'd run natively, but in a
#               container with the exact locked toolchain."
#
#   build       Copy source + build the production SSR bundle. This is also the
#               stage CI targets for lint/test/build: it has the full source
#               AND devDependencies baked in (DinD-safe — no bind mount needed).
#
#   production  Minimal runtime image: only the built dist + entrypoint. No
#               source, no devDependencies, no secrets. The artifact this stage
#               produces is identical to the previous single-build Dockerfile.
#
# This image is environment-agnostic: all runtime config (API_URL, OAuth, Stripe,
# etc.) is injected at container start via CC_FE_* environment variables. There
# is no BUILD_CONFIG arg — one image deploys to every environment.

# ---- Stage: deps (shared dependency layer) ----------------------------------
# Base image pinned by digest (not just the moving `22-alpine` tag) so a
# compromised/poisoned upstream tag can't be pulled into a build. Bump via
# Renovate alongside the other dependency updates.
FROM node:22-alpine@sha256:968df39aedcea65eeb078fb336ed7191baf48f972b4479711397108be0966920 AS deps

WORKDIR /app

# Install dependencies first for better layer caching. Only package.json /
# yarn.lock land in this layer, so editing app source never busts the install.
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# ---- Stage: dev (local hot-reload server; source bind-mounted at runtime) ----
FROM deps AS dev

ENV NODE_ENV=development
# Angular dev server port.
EXPOSE 4200

# docker-compose.yml overrides this `command:`, but a sensible default lets
# `docker run --rm -p 4200:4200 cc-fe-dev` work standalone too. --poll makes the
# watcher reliable over a bind mount.
CMD ["node_modules/.bin/ng", "serve", \
     "--host", "0.0.0.0", "--port", "4200", \
     "--poll", "2000", "--hmr"]

# ---- Stage: build (production SSR bundle; also the CI lint/test target) -------
FROM deps AS build

# Copy source and build with the specified configuration.
COPY . .
# Stub environment.ts with safe placeholders. The compiled bundle reads its
# real config at runtime from /api/config and window.__APP_CONFIG__ (set by
# the SSR server from CC_FE_* env vars).
RUN cp src/environments/sample.environment.ts src/environments/environment.ts
# Generate GraphQL docs (spectaql) - skip if it fails (Node 22 compat issue)
RUN yarn docs:graphql || mkdir -p docs/graphql
RUN npx ng build --configuration=production

# ---- Stage: production -------------------------------------------------------
# Same digest-pinned base as `deps` (see note there). Renovate bumps both.
FROM node:22-alpine@sha256:968df39aedcea65eeb078fb336ed7191baf48f972b4479711397108be0966920 AS production

WORKDIR /app

# Pull alpine security updates the digest-pinned base lags behind. The pin
# protects against a poisoned upstream tag, but it also freezes OS packages —
# e.g. CVE-2026-45447 (openssl libcrypto3/libssl3, fixed in 3.5.7-r0) shipped
# in alpine's repos days before the node image was rebuilt, tripping the Trivy
# HIGH/CRITICAL gate. Upgrading at build time keeps the pin AND current OS
# security patches.
#
# curl + jq are used by docker-entrypoint.sh to fetch runtime config from
# OpenBao/Vault when VAULT_ADDR is set. wget stays for the healthcheck.
# --no-cache keeps the layer small (no apk cache file written).
RUN apk upgrade --no-cache && apk add --no-cache curl jq

# Copy only the built output (Express server is self-contained)
COPY --from=build /app/dist/capital-copilot-fe ./

# Entrypoint either fetches CC_FE_* from OpenBao (if VAULT_ADDR is set) or
# validates pre-set CC_FE_* env vars, then exec's the SSR server.
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Environment variables
ENV NODE_ENV=production
ENV PORT=80

# Expose the port
EXPOSE 80

# Health check uses the dedicated /health endpoint (not /, which is SSR-rendered
# and triggers a full Angular render on every check).
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -q --spider http://localhost:80/health || exit 1

# Run as non-root user
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser

ENTRYPOINT ["docker-entrypoint.sh"]

# Start the Node.js SSR server
CMD ["node", "server/server.mjs"]
