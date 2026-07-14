# Stage 1: Install dependencies only when needed
FROM node:22-bookworm-slim AS deps
WORKDIR /app

# Install build tools for native dependencies (like Sharp)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
# Install ALL dependencies (including devDeps for the build)
RUN npm ci

# Stage 2: Rebuild the source code only when needed
FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set Next.js to production mode
ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

RUN npm run build

# Stage 3: Production image, copy all the files and run next
FROM node:22-bookworm-slim AS runner
WORKDIR /app

# Install required fonts/libraries and Chromium
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
    libvips-dev \
    wget \
    chromium \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Setup non-root user
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 nextjs

# Create cache directory with correct permissions for nextjs user
RUN mkdir -p /home/nextjs/.cache/puppeteer && \
    chown -R nextjs:nodejs /home/nextjs/.cache

# Environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

# Copy standalone build artifacts
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]