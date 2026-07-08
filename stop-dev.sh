#!/bin/bash
# Stop Oracle Development Environment

ORACLE_DIR="$HOME/.local/share/arra-oracle-v3"
LOG_DIR="$ORACLE_DIR/logs"
SERVER_PID_FILE="$LOG_DIR/server.pid"
WEB_PID_FILE="$LOG_DIR/web.pid"

if [ -f "$SERVER_PID_FILE" ]; then
  kill $(cat "$SERVER_PID_FILE") 2>/dev/null && echo "✅ Stopped backend server"
  rm "$SERVER_PID_FILE"
fi

if [ -f "$WEB_PID_FILE" ]; then
  kill $(cat "$WEB_PID_FILE") 2>/dev/null && echo "✅ Stopped frontend"
  rm "$WEB_PID_FILE"
fi

# Also kill any stray processes
pkill -f "bun run server" 2>/dev/null && echo "✅ Killed stray backend"
pkill -f "vite.*3000" 2>/dev/null && echo "✅ Killed stray frontend"

echo "🛑 All Oracle services stopped"
