# Copyright (c) 2024-2026 Perpetuator LLC
#
# Multi-stage Dockerfile for Angular SSR (Server-Side Rendering)
# Stage 1: Build the Angular app with SSR
# Stage 2: Production Node.js server

# Stage 1: Build the Angular app with SSR
FROM node:22-alpine AS build

# Build configuration: production (default) or staging
ARG BUILD_CONFIG=production

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Copy source and build with the specified configuration
COPY . .
# Create base environment file from sample (the real config is in environment.staging.ts or environment.production.ts)
RUN cp src/environments/sample.environment.ts src/environments/environment.ts
# Generate GraphQL docs (spectaql) - skip if it fails (Node 22 compat issue)
RUN yarn docs:graphql || mkdir -p docs/graphql
RUN npx ng build --configuration=${BUILD_CONFIG}

# Stage 2: Production Node.js server for SSR
FROM node:22-alpine AS production

WORKDIR /app

# Copy only the built output (Express server is self-contained)
COPY --from=build /app/dist/capital-copilot-fe ./

# Environment variables
ENV NODE_ENV=production
ENV PORT=80

# Expose the port
EXPOSE 80

# Health check - verify the Express server is responding
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost:80/ || exit 1

# Start the Node.js SSR server
CMD ["node", "server/server.mjs"]
