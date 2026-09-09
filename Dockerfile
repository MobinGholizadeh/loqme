# ==============================================================================
# Multi-stage Production Dockerfile for Loqme Monorepo
# Stage 1: Base (Alpine Node 20 with libc6-compat)
# Stage 2: Dependencies (npm workspaces clean install)
# Stage 3: Builder (Prisma client generation and Next.js standalone build)
# Stage 4: Runner (Minimal hardened unprivileged production image < 200MB)
# ==============================================================================

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# ------------------------------------------------------------------------------
# Dependencies Stage
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
# Builder Stage
# ------------------------------------------------------------------------------
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client for linux-musl target
RUN npx prisma generate

# Build shared packages and web application with standalone output
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# ------------------------------------------------------------------------------
# Runner Stage (Minimal Hardened Runtime)
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Install openssl for Prisma runtime and curl for container healthcheck
RUN apk add --no-cache openssl curl

# Create unprivileged system user & group
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy static assets and public directory
COPY --from=builder /app/apps/web/public ./apps/web/public

# Copy Next.js standalone server and compiled assets
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

# Switch to non-root user
USER nextjs

EXPOSE 3000

# Container Healthcheck targeting internal readiness probe
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health/live || exit 1

CMD ["node", "apps/web/server.js"]
