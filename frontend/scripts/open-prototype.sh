#!/bin/bash
# Open Arra Oracle Prototype in browser

echo "🚀 Opening Arra Oracle Prototype Hub..."
echo ""

# Check if frontend is running
if curl -s http://localhost:3000 > /dev/null; then
    echo "✓ Frontend running on port 3000"
    echo "  Opening: http://localhost:3000/prototype/"
    open http://localhost:3000/prototype/
else
    echo "⚠️  Frontend not running on port 3000"
    echo ""
    echo "Start frontend with:"
    echo "  cd /Users/jodunk/.local/share/arra-oracle-v3/frontend"
    echo "  bun run dev"
fi

echo ""
echo "📊 Available Prototypes:"
echo "  1. Oracle Dashboard (Interactive)"
echo "  2. OpenClaw Dashboard (Static Mockup)"
echo "  3. OpenClaw Settings (Static Mockup)"
echo ""
echo "🌐 Other Access Points:"
echo "  - OpenClaw Studio (Port 8080): http://localhost:8080/"
echo "  - Arra Oracle (Port 3000): http://localhost:3000/"
