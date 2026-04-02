# Arra Oracle v3 - Development Setup Guide

## 📂 Directory Structure

```
~/.local/share/arra-oracle-v3/    # Source code (git repo)
├── src/                            # Backend source
├── frontend/                       # Frontend source
├── start-dev.sh                    # ⭐ Startup script
├── stop-dev.sh                     # ⭐ Stop script
└── logs/                           # Runtime logs

~/.arra-oracle-v3/                  # Data directory (NOT code)
├── oracle.db                       # ⭐ Main database (18MB)
└── lancedb/                        # Vector database
```

## 🚀 Quick Start

### Start Development Environment

```bash
# Method 1: Direct script
~/.local/share/arra-oracle-v3/start-dev.sh

# Method 2: With alias (add to ~/.zshrc)
alias oracle-start='~/.local/share/arra-oracle-v3/start-dev.sh'
alias oracle-stop='~/.local/share/arra-oracle-v3/stop-dev.sh'

# Then use:
oracle-start   # Start all services
oracle-stop    # Stop all services
```

### Stop Services

```bash
~/.local/share/arra-oracle-v3/stop-dev.sh
```

## 🌐 Access Points

| Service | URL | Port |
|---------|-----|------|
| **Frontend** | http://localhost:3000 | 3000 |
| **Backend** | http://localhost:47778 | 47778 |

## 🗄️ Database Configuration

**CRITICAL:** Database location is **NOT** in the code directory!

| What | Path | Size | Purpose |
|------|------|------|---------|
| **Source Code** | `~/.local/share/arra-oracle-v3/` | - | Git repo, TypeScript source |
| **Database** | `~/.arra-oracle-v3/oracle.db` | 18MB | ⭐ Main SQLite database |
| **Vector DB** | `~/.arra-oracle-v3/lancedb/` | - | LanceDB vector store |

### Config Constants

```typescript
// From ~/.local/share/arra-oracle-v3/src/const.ts
ORACLE_DATA_DIR_NAME = '.arra-oracle-v3'  // Data directory name
ORACLE_DB_FILE = 'oracle.db'              // Database filename

// Resolved paths:
ORACLE_DATA_DIR = ~/.arra-oracle-v3
DB_PATH = ~/.arra-oracle-v3/oracle.db
```

## 🔧 Troubleshooting

### "Connection Error: Cannot connect to Oracle backend"

**Problem:** Frontend proxy pointing to wrong port.

**Solution:** Check `frontend/vite.config.ts`:
```typescript
proxy: {
  '/api': {
    target: 'http://localhost:47778'  // ← Must be 47778, NOT 3457
  }
}
```

**Fix:**
```bash
cd ~/.local/share/arra-oracle-v3
git checkout frontend/vite.config.ts  # Reset to correct version
```

### "Database not found"

**Problem:** Looking for database in wrong location.

**Check:**
```bash
# Where config says DB should be:
bun -e "import { DB_PATH } from './src/config.ts'; console.log(DB_PATH)"

# Where DB actually exists:
ls -lh ~/.arra-oracle-v3/oracle.db
```

### Port already in use

```bash
# Find what's using port 3000 or 47778
lsof -i :3000
lsof -i :47778

# Kill the process
kill -9 <PID>

# Or use the stop script
~/.local/share/arra-oracle-v3/stop-dev.sh
```

## 🔄 After System Restart

The `start-dev.sh` script handles everything automatically:

1. ✅ Kills any existing Oracle processes
2. ✅ Starts backend server (port 47778)
3. ✅ Starts frontend dev server (port 3000)
4. ✅ Verifies both services are running
5. ✅ Displays connection URLs and PIDs

**No manual config changes needed!** Just run the script.

## 📝 Environment Variables

**Optional** - Only set if you need custom paths:

```bash
# Override default data directory
export ORACLE_DATA_DIR=/custom/path

# Override specific database file
export ORACLE_DB_PATH=/custom/path/oracle.db

# Override backend port
export ORACLE_PORT=47778
```

**Default values (recommended):**
- `ORACLE_DATA_DIR`: `~/.arra-oracle-v3`
- `ORACLE_DB_PATH`: `~/.arra-oracle-v3/oracle.db`
- `ORACLE_PORT`: `47778`

## 🛠️ Development Workflow

### Making Changes

1. **Code changes** → Edit in `~/.local/share/arra-oracle-v3/`
2. **Frontend** → Hot reload automatically (Vite HMR)
3. **Backend** → Restart server: `~/.local/share/arra-oracle-v3/stop-dev.sh && ~/.local/share/arra-oracle-v3/start-dev.sh`

### Git Workflow

```bash
cd ~/.local/share/arra-oracle-v3

# Check status
git status

# Create feature branch
git checkout -b feature/my-feature

# Make changes and commit
git add .
git commit -m "feat: my feature"

# Push to fork
git push -u origin feature/my-feature
```

## 📊 Monitoring

### Check Logs

```bash
# Backend logs
tail -f ~/.local/share/arra-oracle-v3/logs/server.log

# Frontend logs
tail -f ~/.local/share/arra-oracle-v3/logs/web.log

# Both logs
tail -f ~/.local/share/arra-oracle-v3/logs/*.log
```

### Check Processes

```bash
# Backend running?
ps aux | grep "bun run server"

# Frontend running?
ps aux | grep "vite.*3000"

# Both?
lsof -i :47778 -i :3000
```

### Database Stats

```bash
# Document count
sqlite3 ~/.arra-oracle-v3/oracle.db "SELECT COUNT(*) FROM oracle_documents;"

# Database size
du -h ~/.arra-oracle-v3/oracle.db

# Recent learnings
sqlite3 ~/.arra-oracle-v3/oracle.db "SELECT id, source_file, created_at FROM oracle_documents ORDER BY created_at DESC LIMIT 10;"
```

## 🎯 Key Takeaways

1. **Code ≠ Data**: Source code in `~/.local/share/`, database in `~/.arra-oracle-v3/`
2. **Use the scripts**: `start-dev.sh` and `stop-dev.sh` handle everything
3. **Port 47778**: Backend always runs on this port (configurable via `ORACLE_PORT`)
4. **Vite proxy**: Frontend proxies `/api` to `http://localhost:47778`
5. **Git is code-only**: Database changes are NOT tracked in git

---

**Last Updated:** 2026-04-02
**Status:** ✅ All configurations verified and correct

## 🚀 Alternative: PM2 Process Manager

For production-like environment with auto-restart:

### Start with PM2

```bash
~/oracle-pm2 start
# or
~/.local/share/arra-oracle-v3/pm2-control.sh start
```

### PM2 Commands

```bash
~/oracle-pm2 status    # Check status
~/oracle-pm2 logs      # View logs
~/oracle-pm2 restart   # Restart services
~/oracle-pm2 stop      # Stop services
~/oracle-pm2 delete    # Remove from PM2
~/oracle-pm2 monit     # Real-time monitoring
```

### PM2 vs Shell Scripts

| Feature | Shell Scripts | PM2 |
|---------|---------------|-----|
| Auto-restart on crash | ❌ No | ✅ Yes |
| System boot startup | ❌ No | ✅ Yes (with `pm2 startup`) |
| Log management | Basic | ✅ Advanced |
| Process monitoring | Manual | ✅ Built-in |
| Memory limits | ❌ No | ✅ Yes |

### Recommended Setup

**Development:** Use shell scripts (`~/oracle-start`)
**Production:** Use PM2 (`~/oracle-pm2 start`)

### Enable PM2 on System Boot (Optional)

```bash
# Save current PM2 processes
pm2 save

# Setup PM2 to start on system boot
pm2 startup
# Follow the command output (paste the generated command)

# Then your Oracle will auto-start on system restart!
```

