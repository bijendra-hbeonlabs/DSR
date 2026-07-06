#!/bin/bash
set -e

echo "=========================================="
echo "Starting Clean DSR Deployment"
echo "=========================================="

echo "Stopping dsr services in PM2..."
pm2 delete dsr-frontend 2>/dev/null || true
pm2 delete dsr-backend 2>/dev/null || true

echo "Freeing ports 3004 and 5001..."
npx --yes kill-port 3004 5001 2>/dev/null || true

echo "Building the frontend application..."
pnpm build

echo "Starting dsr-backend in PM2..."
pm2 start server/server.js --name "dsr-backend"

echo "Starting dsr-frontend in PM2..."
pm2 start pnpm --name "dsr-frontend" --cwd "/root/DSR" -- start

echo "Saving PM2 list..."
pm2 save

echo "Checking PM2 status..."
pm2 status
