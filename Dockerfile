# Build stage - use slim (Debian) instead of alpine for Prisma OpenSSL compatibility
FROM node:20-slim AS builder
WORKDIR /app

# Install OpenSSL and other required libs for Prisma
RUN apt-get update && apt-get install -y openssl libssl-dev ca-certificates && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm@latest

# Copy everything needed for install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/database ./packages/database
COPY apps/api ./apps/api

# Install with flat node_modules (avoids symlink issues)
RUN pnpm install --shamefully-hoist

# Generate Prisma client
RUN cd packages/database && npx prisma generate

# Build API
RUN cd apps/api && pnpm run build

# Production stage
FROM node:20-slim AS runner
WORKDIR /app

# Install OpenSSL for Prisma runtime
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy built output
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./

# Copy Prisma schema for migrations
COPY --from=builder /app/packages/database/prisma ./prisma

ENV NODE_ENV=production
EXPOSE 3001

# Run migrations (continue even if already applied) then start the app
CMD npx prisma migrate deploy --schema=./prisma/schema.prisma; node dist/src/main.js
