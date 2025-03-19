#!/bin/bash

# Exit on error
set -e

# Print commands for debugging
set -x

# Install dependencies
echo "Installing dependencies..."
npm install

# Create necessary directories
echo "Creating directories..."
mkdir -p uploads/temp
mkdir -p public/images
mkdir -p logs

# Set permissions
echo "Setting permissions..."
chmod -R 755 uploads
chmod -R 755 public
chmod -R 755 logs

# Verification
echo "Build completed successfully!" 