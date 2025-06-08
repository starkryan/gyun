FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy app source
COPY . .

# Create necessary directories
RUN mkdir -p logs uploads/temp public/images

# Set proper permissions for directories
RUN chmod -R 755 uploads logs public

# Set environment variables
ENV NODE_ENV=production
# Cloud Run will set PORT automatically
ENV PORT=8080

# Expose the port - Cloud Run uses 8080 by default
EXPOSE 8080

# Use a more specific start command for Cloud Run
# and add health check readiness
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/api/health || exit 1

# Start the server
CMD ["node", "src/server.js"] 