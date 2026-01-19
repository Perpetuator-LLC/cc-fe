# Capital Copilot Frontend Dockerfile
#
# This Dockerfile creates a production-ready container for the Angular SSR frontend.
# The Express server handles both static file serving and server-side rendering.
#
# Build: docker build -t capital-copilot-fe:latest .
# Run:   docker run -d -p 4000:4000 capital-copilot-fe:latest
#
# Note: Run `yarn build` first to generate dist/capital-copilot-fe/

FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy the pre-built distribution
# The build should be done outside Docker for faster CI/CD
COPY dist/capital-copilot-fe ./

# Set environment variables
ENV NODE_ENV=production
ENV PORT=4000

# Expose the port
EXPOSE 4000

# Health check - verify the server is responding
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost:4000/ || exit 1

# Start the Express SSR server
CMD ["node", "server/server.mjs"]
