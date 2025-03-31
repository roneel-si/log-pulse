FROM node:18-slim AS builder

WORKDIR /app

# Install build dependencies including Python
RUN apt-get update && apt-get install -y \
    make \
    g++ \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Copy package files first
COPY package*.json ./

# Install dependencies with explicit registry
RUN npm install --registry=https://registry.npmjs.org/

# Copy the rest of the application
COPY . .

# Second stage
FROM node:18-slim

WORKDIR /app

# Install only the necessary runtime dependencies for better-sqlite3
RUN apt-get update && apt-get install -y \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy built node_modules and source code from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/package*.json ./

# Set permissions for data and node_modules
RUN mkdir -p data && \
    chmod -R 777 data && \
    chmod -R 777 node_modules

EXPOSE 3001

CMD ["npm", "start"] 