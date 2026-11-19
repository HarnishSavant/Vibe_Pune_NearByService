# ============================================================
# Multi-Stage Production Frontend Image (Nginx Slim/Alpine)
# ============================================================

# --- Stage 1: Build & Asset Optimization ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY frontend/ /app/
# Strip extraneous dev files or temp logs
RUN rm -rf .git node_modules tests

# --- Stage 2: Minimal Static Runtime Server ---
FROM nginx:alpine-slim
LABEL maintainer="VibePune WebGIS Team"
LABEL description="Optimized multi-stage static WebGIS client distribution"

# Copy custom Nginx configuration with HTTP Range support for PMTiles
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled/static assets from builder stage
COPY --from=builder /app /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
  CMD wget -q --spider http://localhost:80/index.html || exit 1

CMD ["nginx", "-g", "daemon off;"]
