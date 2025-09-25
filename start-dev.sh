#!/bin/bash

# Makalah AI Development Server Startup Script
# Fixes PORT environment variable issue (PORT=6379 -> default 3000)

echo "🚀 Starting Makalah AI Development Server..."

# Kill any existing processes on ports 3000-3006
echo "🧹 Cleaning up existing processes..."
for port in 3000 3001 3002 3003 3004 3005 3006; do
  lsof -ti:$port | xargs kill -9 2>/dev/null || true
done

# Clear PORT environment variable that causes Next.js to use port 6379 (Redis port)
echo "🔧 Clearing PORT environment variable..."
unset PORT

# Start Next.js development server on default port 3000
echo "▲ Starting Next.js server..."
env -u PORT npm run dev

echo "✅ Server should be running at http://localhost:3000"