# Stage 1: Build & dependencies
FROM node:18-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Production release
FROM node:18-alpine
WORKDIR /usr/src/app

# Copy production dependencies and application files
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY . .

# Set production environment flags
ENV NODE_ENV=production
ENV PORT=5000

# Run container as a non-privileged user for enhanced security
USER node

# Expose port
EXPOSE 5000

# Run entry point
CMD ["node", "server.js"]
