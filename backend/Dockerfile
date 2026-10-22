FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY nest-cli.json ./
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
RUN npm ci --omit=dev

# Copy built dist from builder stage
COPY --from=builder /app/dist ./dist

# Expose port (Render injects PORT env var automatically)
EXPOSE 3001

CMD ["node", "dist/main"]
