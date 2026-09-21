# Production-ready, secure Dockerfile for streamX-backend
FROM node:22-alpine

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Create app directory
WORKDIR /app

# Copy dependency manifests first for optimal Docker layer caching
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

# Copy application source code
COPY src ./src

# Switch to non-root user for security
USER node

# Expose port
EXPOSE 3000

# Built-in container healthcheck using Node.js native fetch (no extra packages needed)
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e 'fetch("http://localhost:3000/health").then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))'

# Start the application
CMD ["node", "--experimental-strip-types", "src/index.js"]
