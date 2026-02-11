# Multi-stage build for XRPL Explorer
# Stage 1: Build the application
FROM node:22-alpine AS builder

# Build argument to specify which environment config to use
ARG ENVIRONMENT=devnet

# Set working directory
WORKDIR /explorer

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the appropriate .env file based on ENVIRONMENT argument
COPY .env.${ENVIRONMENT} .env

# Copy source code
COPY . .

# Build the application (Vite will read VITE_* variables from .env)
RUN npm run build

# Stage 2: Production image
FROM node:22-alpine

# Set working directory
WORKDIR /explorer

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy built assets from builder stage
COPY --from=builder /explorer/build ./build

# Copy runtime env so server can read PRERENDER_SERVICE_URL/VITE_ENVIRONMENT
COPY --from=builder /explorer/.env ./.env

# Copy server code
COPY server ./server

# Copy entrypoint script
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

# Expose port
EXPOSE 5001

# Set environment to production
ENV NODE_ENV=production
ENV PORT=5001
ENV ADDR=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5001/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Run the application
CMD ["node", "server"]
