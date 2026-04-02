#!/bin/bash
# PM2 Control Script for Oracle Development

set -e

ORACLE_DIR="$HOME/.local/share/arra-oracle-v3"
cd "$ORACLE_DIR"

case "$1" in
  start)
    echo "🚀 Starting Oracle with PM2..."
    pm2 start ecosystem.config.js
    pm2 save
    echo "✅ Started. Check status: pm2 status"
    echo ""
    echo "📊 Services:"
    pm2 list
    ;;
  stop)
    echo "🛑 Stopping Oracle..."
    pm2 stop oracle-backend oracle-frontend
    echo "✅ Stopped"
    ;;
  restart)
    echo "🔄 Restarting Oracle..."
    pm2 restart oracle-backend oracle-frontend
    echo "✅ Restarted"
    ;;
  delete)
    echo "🗑️  Removing Oracle from PM2..."
    pm2 delete oracle-backend oracle-frontend 2>/dev/null || true
    pm2 save
    echo "✅ Removed"
    ;;
  logs)
    echo "📝 Showing logs (Ctrl+C to exit)..."
    pm2 logs oracle-backend oracle-frontend
    ;;
  status)
    pm2 status
    echo ""
    echo "📊 Oracle Processes:"
    pm2 list | grep -E "oracle-backend|oracle-frontend|name" || true
    ;;
  monit)
    echo "📊 Monitoring Oracle (Ctrl+C to exit)..."
    pm2 monit
    ;;
  *)
    echo "Oracle PM2 Control Script"
    echo ""
    echo "Usage: $0 {start|stop|restart|delete|logs|status|monit}"
    echo ""
    echo "Commands:"
    echo "  start    - Start Oracle backend + frontend with PM2"
    echo "  stop     - Stop Oracle processes"
    echo "  restart  - Restart Oracle processes"
    echo "  delete   - Remove Oracle from PM2"
    echo "  logs     - Show logs (real-time)"
    echo "  status   - Show process status"
    echo "  monit    - Monitor processes (real-time)"
    echo ""
    echo "Quick Access:"
    echo "  Frontend: http://localhost:3000"
    echo "  Backend:  http://localhost:47778"
    exit 1
    ;;
esac
