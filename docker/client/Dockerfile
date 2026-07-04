# ---- Build Stage ----
FROM node:18-alpine AS builder

WORKDIR /app

# Copy workspace root package files
COPY package.json package-lock.json ./

# Copy client package files
COPY client/package.json ./client/

# Install dependencies (workspace hoisting)
RUN npm ci --workspace=client

# Copy client source
COPY client/ ./client/

# Build client (Vite outputs to dist/)
RUN npm run build -w client

# ---- Production Stage ----
FROM nginx:alpine AS production

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY docker/client/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder
COPY --from=builder /app/client/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80 || exit 1

CMD ["nginx", "-g", "daemon off;"]
