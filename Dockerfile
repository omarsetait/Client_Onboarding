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

# Verify the build output exists
RUN ls -la dist/ && ls -la dist/main.js

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Copy the built application and dependencies
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./package.json
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Set environment
ENV NODE_ENV=production

# Expose port (Railway will override this via PORT env var)
EXPOSE 3001

# Start the application
CMD ["node", "dist/main.js"]
