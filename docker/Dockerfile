# Multi-stage build for Next.js standalone output
# Node 22 is required by pnpm 11.x. node:sqlite is a built-in module
# available in Node ≥ 22.5.
# Stage 1: deps
FROM node:22-alpine AS deps
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

# Stage 2: build
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generate Drizzle migrations as part of the build so the standalone image
# can apply them on first boot.
RUN pnpm db:generate
ENV NEXT_TELEMETRY_DISABLED=1
# Enable standalone output for the Docker image (Linux handles symlinks).
ENV NEXT_STANDALONE=1
RUN pnpm build

# Stage 3: runtime
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Create non-root user
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Copy standalone server
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# Drizzle migrations + client for runtime use
COPY --from=builder --chown=nextjs:nodejs /app/db ./db
COPY --from=builder --chown=nextjs:nodejs /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.pnpm ./node_modules/.pnpm

# Data directory for SQLite
RUN mkdir -p /app/data /backups && chown -R nextjs:nodejs /app/data /backups
USER nextjs

EXPOSE 3000
CMD ["node", "server.js"]