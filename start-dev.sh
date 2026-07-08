#!/bin/bash
# Oracle Development Startup Script
# Runs both backend (port 47778) and frontend (port 3000)

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ORACLE_DIR="$HOME/.local/share/arra-oracle-v3"
LOG_DIR="$ORACLE_DIR/logs"
SERVER_PID_FILE="$LOG_DIR/server.pid"
WEB_PID_FILE="$LOG_DIR/web.pid"

mkdir -p "$LOG_DIR"

echo -e "${BLUE}🔥 Starting Oracle Development Environment...${NC}"

# Kill existing processes if running
if [ -f "$SERVER_PID_FILE" ]; then
  kill $(cat "$SERVER_PID_FILE") 2>/dev/null && echo "Killed old server" || true
  rm "$SERVER_PID_FILE"
fi

if [ -f "$WEB_PID_FILE" ]; then
  kill $(cat "$WEB_PID_FILE") 2>/dev/null && echo "Killed old web" || true
  rm "$WEB_PID_FILE"
fi

sleep 2

# Start Backend Server
echo -e "${GREEN}▶ Starting Backend Server (port 47778)...${NC}"
cd "$ORACLE_DIR"
bun run server > "$LOG_DIR/server.log" 2>&1 &
SERVER_PID=$!
echo $SERVER_PID > "$SERVER_PID_FILE"
echo "   PID: $SERVER_PID"
echo "   Log: $LOG_DIR/server.log"

# Wait for backend to be ready
sleep 3

# Check backend is running
if ! ps -p $SERVER_PID > /dev/null; then
  echo "❌ Backend failed to start! Check log: $LOG_DIR/server.log"
  tail -20 "$LOG_DIR/server.log"
  exit 1
fi

# Start Frontend
echo -e "${GREEN}▶ Starting Frontend (port 3000)...${NC}"
cd "$ORACLE_DIR/frontend"
bun run dev > "$LOG_DIR/web.log" 2>&1 &
WEB_PID=$!
echo $WEB_PID > "$WEB_PID_FILE"
echo "   PID: $WEB_PID"
echo "   Log: $LOG_DIR/web.log"

sleep 3

# Check frontend is running
if ! ps -p $WEB_PID > /dev/null; then
  echo "❌ Frontend failed to start! Check log: $LOG_DIR/web.log"
  tail -20 "$LOG_DIR/web.log"
  exit 1
fi

echo ""
echo -e "${GREEN}✅ Oracle Development Environment Ready!${NC}"
echo ""
echo "📊 Services:"
echo "   • Backend:  http://localhost:47778 (PID: $SERVER_PID)"
echo "   • Frontend: http://localhost:3000  (PID: $WEB_PID)"
echo ""
echo "🗄️  Database:"
echo "   • Path:     ~/.arra-oracle-v3/oracle.db"
echo "   • Config:   ORACLE_DATA_DIR=~/.arra-oracle-v3"
echo ""
echo "📝 Logs:"
echo "   • Backend:  $LOG_DIR/server.log"
echo "   • Frontend: $LOG_DIR/web.log"
echo ""
echo "🛑 To stop:"
echo "   kill $SERVER_PID $WEB_PID"
echo "   or: $0 --stop"
echo ""

# Handle --stop flag
if [ "$1" == "--stop" ]; then
  echo "Stopping services..."
  kill $SERVER_PID $WEB_PID 2>/dev/null
  rm -f "$SERVER_PID_FILE" "$WEB_PID_FILE"
  echo "✅ Stopped"
fi
