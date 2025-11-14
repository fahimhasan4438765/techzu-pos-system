# TechzuPOS Monorepo Dockerfile
# Multi-stage build for optimized development and production

FROM node:20-slim AS base

# Update packages and install build tools for native dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Set environment variables for better performance
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=1
ENV HUSKY=0

# Install pnpm directly from npm (more reliable than corepack)
RUN npm install -g pnpm@8.15.0

# Set working directory
WORKDIR /app

# Copy package manager files
COPY package.json pnpm-workspace.yaml turbo.json ./

# Copy all workspace package.json files first for better layer caching
COPY api/package.json ./api/
COPY web/package.json ./web/
COPY pos/package.json ./pos/

# Copy pnpm-lock.yaml if it exists
COPY pnpm-lock.yaml* ./

# Install dependencies with optimizations
RUN pnpm config set store-dir ~/.pnpm-store && \
    pnpm install --frozen-lockfile --prefer-offline

# Development stage
FROM base AS development

# Create a non-root user for security first
RUN addgroup -g 1001 -S nodejs && \
    adduser -S techzu -u 1001 -G nodejs

# Copy source code with correct ownership to avoid chown
COPY --chown=techzu:nodejs . .

# Set environment variables for development
ENV NODE_ENV=development
ENV EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0

# Switch to non-root user
USER techzu

# Expose ports for all services
EXPOSE 3000 3001 8081 19000 19001 19002

# Default command runs the Turborepo TUI development setup
CMD ["pnpm", "run", "dev"]

# Production stage (for future use)
FROM base AS production

# Copy built applications
COPY . .

# Build all applications
RUN pnpm run build

# Expose production ports
EXPOSE 3000 3001

# Production command
CMD ["pnpm", "run", "start"]