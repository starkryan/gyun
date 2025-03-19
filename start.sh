#!/bin/bash

# Print commands for debugging
set -x

# Show environment information
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"
echo "Current directory: $(pwd)"
echo "Directory contents: $(ls -la)"

# Start the server
echo "Starting server..."
node src/server.js 