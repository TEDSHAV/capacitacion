# Stage 1: Build all dependencies (including devDependencies for build stage)
FROM node:22-bookworm-slim AS deps
ARG DEBIAN_FRONTEND=noninteractive
WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
# Use npm install (not npm ci) so platform-specific optional dependencies
# resolve for Linux. The lockfile was generated on Windows and only contains
# @img/sharp-win32-*; npm ci would skip the missing linux binary.
RUN --mount=type=cache,target=/root/.npm npm install --no-audit --no-fund

# Stage 2: Build Next.js
FROM node:22-bookworm-slim AS builder
ARG DEBIAN_FRONTEND=noninteractive
WORKDIR /app

# Add build arguments for Next.js environment variables (needed during build time)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY

# Copy pre-built node_modules from deps stage (no need to reinstall build tools)
COPY --from=deps /app/node_modules ./node_modules

# Copy package files first for better layer caching
COPY package.json package-lock.json* ./

# Copy source code (respects .dockerignore)
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1 NODE_ENV=production NODE_OPTIONS="--max-old-space-size=4096" TURBOPACK_DISABLED=1
RUN --mount=type=cache,target=/app/.next/cache npm run build

# Stage 2b: Prune to production-only dependencies for runner image.
# Chained FROM builder (instead of a fresh base + separate COPY from deps) so this
# stage runs sequentially after builder's node_modules copy/build, avoiding a
# concurrent duplicate COPY of the large node_modules directory during the build.
FROM builder AS deps-prod
RUN npm prune --omit=dev

# Stage 3: Runner
FROM node:22-bookworm-slim AS runner
ARG DEBIAN_FRONTEND=noninteractive
WORKDIR /app

# 1. Install system libraries needed for Puppeteer/jsPDF canvas operations and sharp
# Use runtime libvips (not -dev) to reduce image size
RUN apt-get update && apt-get install -y \
    fonts-liberation \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libxss1 \
    libgtk-3-0 \
    libvips \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# 2. Setup user and permissions properly
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 nextjs && \
    mkdir -p /home/nextjs/.cache/puppeteer && \
    chown -R nextjs:nodejs /home/nextjs

# 3. Copy production-only node_modules (devDependencies pruned)
COPY --chown=nextjs:nodejs --from=deps-prod /app/node_modules ./node_modules

# 4. Environment variables
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

# 5. Copy build artifacts
COPY --chown=nextjs:nodejs --from=builder /app/public ./public
COPY --chown=nextjs:nodejs --from=builder /app/.next/standalone ./
COPY --chown=nextjs:nodejs --from=builder /app/.next/static ./.next/static
USER nextjs

EXPOSE 3000
CMD ["node", "server.js"]