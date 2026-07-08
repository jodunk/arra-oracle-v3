#!/bin/bash
# Start OpenClaw Studio UI on different ports

PORT=${1:-8080}
PID_FILE="/tmp/openclaw-studio-${PORT}.pid"
LOG_FILE="/tmp/openclaw-studio-${PORT}.log"

# Check if already running
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p $PID > /dev/null 2>&1; then
        echo "OpenClaw Studio already running on port ${PORT} (PID: $PID)"
        echo "Stop it with: kill $PID"
        exit 1
    else
        rm "$PID_FILE"
    fi
fi

echo "Starting OpenClaw Studio on port ${PORT}..."
cd /Users/jodunk/.local/share/arra-oracle-v3/frontend/public/openclaw-studio
python3 -m http.server $PORT > "$LOG_FILE" 2>&1 &
PID=$!
echo $PID > "$PID_FILE"

sleep 2
if ps -p $PID > /dev/null 2>&1; then
    echo "✓ OpenClaw Studio started successfully!"
    echo "  URL: http://localhost:${PORT}/"
    echo "  PID: $PID"
    echo "  Log: $LOG_FILE"
    echo ""
    echo "Stop it with: kill $PID"
else
    echo "✗ Failed to start. Check log: $LOG_FILE"
    rm "$PID_FILE"
    exit 1
fi
