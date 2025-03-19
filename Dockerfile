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
ENV PORT=10000

# Expose the port
EXPOSE 10000

# Change start command to use src/server.js directly
CMD ["node", "src/server.js"] 