# Stage 1: Install all dependencies (including devDependencies needed to build)
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# Use npm install (not npm ci) so platform-specific optional dependencies
# resolve for Linux. The lockfile was generated on Windows and only contains
# @img/sharp-win32-*; npm ci would skip the missing linux binary.
#
# No build toolchain (python3/make/g++) is installed: nothing in this project
# compiles from source. sharp ships prebuilt binaries with its own bundled
# libvips, and every other dependency is pure JavaScript.
RUN --mount=type=cache,target=/root/.npm npm install --no-audit --no-fund

# Stage 2: Build Next.js
FROM node:22-bookworm-slim AS builder
ARG DEBIAN_FRONTEND=noninteractive
WORKDIR /app

# git is used by the `prebuild` step (scripts/generate-version.mjs) to stamp the build
# with its tag/commit for display in the app footer. The slim base does not ship git.
#
# This step is deliberately best-effort (`|| true`). The version generator treats git as
# optional and falls back to the package.json version, so a transient apt/network failure
# degrades the footer from "v1.5.0-3-gabc1234" to "v1.5.0" instead of breaking the deploy.
RUN (apt-get update && apt-get install -y --no-install-recommends git \
     && rm -rf /var/lib/apt/lists/*) || true

# Add build arguments for Next.js environment variables (needed during build time)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY

# Copy pre-built node_modules from deps stage (no need to reinstall)
COPY --from=deps /app/node_modules ./node_modules

# Copy package files first for better layer caching
COPY package.json package-lock.json* ./

# Copy source code (respects .dockerignore)
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1 NODE_ENV=production NODE_OPTIONS="--max-old-space-size=4096" TURBOPACK_DISABLED=1
RUN --mount=type=cache,target=/app/.next/cache npm run build

# Stage 3: Runner
#
# No apt packages are installed here. The previous Chromium/GTK library set
# (libnss3, libgtk-3-0, libasound2, libgbm1, libcups2, libxss1, libatk*,
# libpangocairo, fonts-liberation) was only needed by puppeteer, which was
# replaced by jsPDF/@react-pdf/renderer — both pure JS. System libvips is not
# used either: prebuilt sharp bundles its own copy inside node_modules.
FROM node:22-bookworm-slim AS runner
WORKDIR /app

# Setup user and permissions properly
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 nextjs && \
    mkdir -p /home/nextjs && \
    chown -R nextjs:nodejs /home/nextjs

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

# Copy build artifacts. `output: "standalone"` already traces every runtime
# dependency (sharp, jspdf, @react-pdf/renderer, docxtemplater, pizzip, qrcode,
# xlsx, supabase, ...) into .next/standalone/node_modules, so no separate
# node_modules copy is needed — that duplicate was the bulk of the image size.
COPY --chown=nextjs:nodejs --from=builder /app/public ./public
COPY --chown=nextjs:nodejs --from=builder /app/.next/standalone ./
COPY --chown=nextjs:nodejs --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
CMD ["node", "server.js"]
