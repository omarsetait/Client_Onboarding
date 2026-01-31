# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

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
FROM node:20-alpine AS runner
WORKDIR /app

# Copy built output
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "dist/src/main.js"]
