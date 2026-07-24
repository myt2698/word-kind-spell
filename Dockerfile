# WordMind Fullstack Deployment
# Node.js 20 + MySQL (external)
# Environment variables are injected by Railway, NOT from .env file

FROM node:20 AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with retry for unstable network
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm install --legacy-peer-deps || \
    (sleep 5 && npm install --legacy-peer-deps) || \
    (sleep 10 && npm install --legacy-peer-deps)

# Copy source code
COPY . .

# Build frontend + backend
RUN npm run build

# Production stage
FROM node:20-slim AS production

WORKDIR /app

# Install wget for healthcheck
RUN apt-get update && apt-get install -y wget && rm -rf /var/lib/apt/lists/*

# Copy built assets
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1

# Start production server
CMD ["npm", "start"]
