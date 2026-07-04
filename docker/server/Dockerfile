# ---- Build Stage ----
FROM node:18-alpine AS builder

WORKDIR /app

# Copy workspace root package files
COPY package.json package-lock.json ./

# Copy server package files
COPY server/package.json ./server/

# Install dependencies (workspace hoisting)
RUN npm ci --workspace=server

# Copy server source
COPY server/ ./server/

# Build server
RUN npm run build -w server

# ---- Production Stage ----
FROM node:18-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S homehub && \
    adduser -S homehub -u 1001 -G homehub

# Copy workspace root package files
COPY package.json package-lock.json ./

# Copy server package files
COPY server/package.json ./server/

# Install production dependencies only
RUN npm ci --workspace=server --omit=dev

# Copy built output from builder
COPY --from=builder /app/server/dist ./server/dist

# Copy migration SQL files (needed at runtime for SQLite auto-migrate)
COPY server/src/db/migrations ./server/src/db/migrations

# Create data and uploads directories
RUN mkdir -p /app/server/data /app/server/uploads && \
    chown -R homehub:homehub /app

USER homehub

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server/dist/main.js"]
