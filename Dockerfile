# ==============================================================================
# Multi-stage Production Dockerfile for Loqme Monorepo
# Stage 1: Base (Alpine Node 24 with libc6-compat & openssl)
# Stage 2: Dependencies (npm workspaces clean install)
# Stage 3: Builder (Prisma client generation and Next.js standalone build)
# Stage 4: Runner (Minimal hardened unprivileged production image)
# ==============================================================================

FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# ------------------------------------------------------------------------------
# Stage 1: Dependencies
# ------------------------------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/types/package.json ./packages/types/
COPY packages/validation/package.json ./packages/validation/
COPY packages/design-tokens/package.json ./packages/design-tokens/
COPY packages/api/package.json ./packages/api/
COPY packages/config/package.json ./packages/config/
COPY prisma ./prisma/

RUN npm ci --include=dev

# ------------------------------------------------------------------------------
# Stage 2: Builder
# ------------------------------------------------------------------------------
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time placeholder environment variables to allow Prisma client generation
# and Next.js static page compilation without requiring a live database connection
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public"
ENV NEXTAUTH_SECRET="build-time-placeholder-nextauth-secret-32-chars-minimum"
ENV SESSION_SECRET="build-time-placeholder-session-secret-32-chars-minimum"

# Public build-time arguments inlined into Next.js client bundles
ARG NEXT_PUBLIC_APP_URL="https://loqme.ir"
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_MAP_API_KEY=""
ENV NEXT_PUBLIC_MAP_API_KEY=$NEXT_PUBLIC_MAP_API_KEY

# Generate Prisma client for linux-musl target
RUN npx prisma generate

# Build shared packages and web application with standalone output
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 3: Runner (Minimal Hardened Runtime)
# ------------------------------------------------------------------------------
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ARG NEXT_PUBLIC_APP_URL="https://loqme.ir"
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_MAP_API_KEY=""
ENV NEXT_PUBLIC_MAP_API_KEY=$NEXT_PUBLIC_MAP_API_KEY

# Install openssl for Prisma runtime and curl for container health checks
RUN apk add --no-cache openssl curl

# Create unprivileged system user & group
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Set up storage directory for listing images with appropriate permissions
RUN mkdir -p /app/.data/listing-images && chown -R nextjs:nodejs /app/.data
ENV LISTING_IMAGE_STORAGE_DIR=/app/.data/listing-images

# Copy public static assets
COPY --from=builder /app/apps/web/public ./apps/web/public

# Copy Next.js standalone server and compiled assets
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

# Copy Prisma schema, migrations, config, and node_modules for production runtime & migrations
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Switch to non-root user
USER nextjs

EXPOSE 3000

# Container healthcheck targeting internal liveness probe
HEALTHCHECK --interval=20s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/api/health/live || exit 1

CMD ["node", "apps/web/server.js"]
