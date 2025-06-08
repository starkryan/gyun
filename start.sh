#!/bin/bash

# Print commands for debugging
set -x

# Show environment information
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"
echo "Current directory: $(pwd)"
echo "Directory contents: $(ls -la)"

# Create necessary directories if they don't exist
mkdir -p logs
mkdir -p uploads/temp
mkdir -p public/images

# Ensure proper permissions
chmod -R 755 uploads logs public

# Start the server
echo "Starting server..."
node src/server.js 