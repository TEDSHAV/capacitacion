# Stage 1: Build native dependencies
FROM node:22-bookworm-slim AS deps
ARG DEBIAN_FRONTEND=noninteractive
WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: Build Next.js
FROM node:22-bookworm-slim AS builder
ARG DEBIAN_FRONTEND=noninteractive
WORKDIR /app

# Install system dependencies needed for build-time optimizations (sharp, critters, etc)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    libvips-dev \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 NODE_ENV=production NODE_OPTIONS="--max-old-space-size=8192" TURBOPACK_DISABLED=1
RUN npm run build

# Stage 3: Runner
FROM node:22-bookworm-slim AS runner
ARG DEBIAN_FRONTEND=noninteractive
WORKDIR /app

# 1. Install Playwright dependencies and system libraries
RUN apt-get update && apt-get install -y \
    chromium \
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
    libvips-dev \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# 2. Setup user and permissions properly
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 nextjs && \
    mkdir -p /home/nextjs/.cache/ms-playwright && \
    mkdir -p /home/nextjs/.cache/puppeteer && \
    chown -R nextjs:nodejs /home/nextjs

# 3. Copy node_modules to install Playwright browsers
COPY --chown=nextjs:nodejs --from=deps /app/node_modules ./node_modules

# 4. Install Playwright browsers (must be done before changing user)
RUN npx playwright install --with-deps chromium

# 5. Environment variables
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=false \
    NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

# 6. Copy build artifacts
COPY --chown=nextjs:nodejs --from=builder /app/public ./public
COPY --chown=nextjs:nodejs --from=builder /app/.next/standalone ./
COPY --chown=nextjs:nodejs --from=builder /app/.next/static ./.next/static
USER nextjs

EXPOSE 3000
CMD ["node", "server.js"]