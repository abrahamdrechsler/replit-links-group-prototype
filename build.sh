#!/bin/bash

# Build the frontend
echo "Building frontend..."
vite build

# Build the backend
echo "Building backend..."
esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

# Move files from dist/public to dist root for deployment
echo "Organizing files for deployment..."
if [ -d "dist/public" ]; then
  # Copy all files from dist/public to dist root
  cp -r dist/public/* dist/
  # Remove the public directory
  rm -rf dist/public
  echo "Files moved successfully from dist/public to dist/"
else
  echo "Warning: dist/public directory not found"
fi

# Copy built files to server/public for local serving
echo "Setting up files for server static serving..."
rm -rf server/public
cp -r dist server/public
echo "Files copied to server/public/"

echo "Build complete!"