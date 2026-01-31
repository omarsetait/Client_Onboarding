# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm@latest

# Copy root package files first
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy the database package (dependency of API)
COPY packages/database ./packages/database

# Copy the API app
COPY apps/api ./apps/api

# Install ALL dependencies (without frozen lockfile for flexibility)
RUN pnpm install --no-frozen-lockfile

# Generate Prisma client
WORKDIR /app/packages/database
RUN npx prisma generate

# Build the API
WORKDIR /app/apps/api
RUN pnpm run build

# Verify the build output exists (main.js is in dist/src/)
RUN ls -la dist/src/main.js

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Copy ALL node_modules from builder
# This includes the root node_modules (where shared deps like @prisma are)
COPY --from=builder /app/node_modules ./node_modules

# Copy workspace node_modules
# COPY --from=builder /app/packages/database/node_modules ./packages/database/node_modules (if needed)

# Copy the built application and its specific node_modules
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/package.json ./package.json

# Copy Prisma schema and engines just in case (usually in client, but to be safe)
COPY --from=builder /app/packages/database/prisma ./prisma

# Set environment
ENV NODE_ENV=production

# Expose port (Railway will override this via PORT env var)
EXPOSE 3001

# Start the application - main.js is in dist/src/ folder
CMD ["node", "dist/src/main.js"]
