#!/bin/bash

# Expansion Front - Game Server Startup Script

PORT=8000

echo "=========================================="
echo "  扩张前线 - Expansion Front"
echo "=========================================="
echo ""
echo "Starting local web server on port $PORT..."
echo "Game URL: http://localhost:$PORT"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Open browser (macOS)
open "http://localhost:$PORT" 2>/dev/null || true

# Start Python HTTP server
python3 -m http.server $PORT
