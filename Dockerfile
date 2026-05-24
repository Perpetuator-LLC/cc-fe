# Copyright (c) 2024-2026 Perpetuator LLC
#
# Multi-stage Dockerfile for the Capital Copilot Angular SSR frontend.
#
# This image is environment-agnostic: all runtime config (API_URL, OAuth, Stripe,
# etc.) is injected at container start via CC_FE_* environment variables. There
# is no BUILD_CONFIG arg — one image deploys to every environment.
#
# Stage 1: Build the Angular app with SSR
# Stage 2: Production Node.js server with entrypoint validation

# ---- Stage 1: Build ----------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Copy source and build with the specified configuration
COPY . .
# Stub environment.ts with safe placeholders. The compiled bundle reads its
# real config at runtime from /api/config and window.__APP_CONFIG__ (set by
# the SSR server from CC_FE_* env vars).
RUN cp src/environments/sample.environment.ts src/environments/environment.ts
# Generate GraphQL docs (spectaql) - skip if it fails (Node 22 compat issue)
RUN yarn docs:graphql || mkdir -p docs/graphql
RUN npx ng build --configuration=production

# ---- Stage 2: Production -----------------------------------------------------
FROM node:22-alpine AS production

WORKDIR /app

# Copy only the built output (Express server is self-contained)
COPY --from=build /app/dist/capital-copilot-fe ./

# Entrypoint script validates required env vars before starting the server.
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
