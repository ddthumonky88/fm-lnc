FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build NestJS
RUN npm run build

# -------------------------------------------
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files and install production only
COPY package*.json ./
RUN npm ci --only=production

# Copy built dist from builder stage
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3001

CMD ["node", "dist/main"]
