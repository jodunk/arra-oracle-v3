#!/bin/bash
# Stop OpenClaw Studio UI

PORT=${1:-8080}
PID_FILE="/tmp/openclaw-studio-${PORT}.pid"

if [ ! -f "$PID_FILE" ]; then
    echo "No OpenClaw Studio found running on port ${PORT}"
    exit 1
fi

PID=$(cat "$PID_FILE")

if ps -p $PID > /dev/null 2>&1; then
    echo "Stopping OpenClaw Studio on port ${PORT} (PID: $PID)..."
    kill $PID
    sleep 1
    if ps -p $PID > /dev/null 2>&1; then
        echo "Force killing..."
        kill -9 $PID
    fi
    rm "$PID_FILE"
    echo "✓ Stopped"
else
    echo "Process $PID not running"
    rm "$PID_FILE"
fi
