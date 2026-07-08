# Arra Oracle Prototypes

Interactive UI mockups built with OpenClaw Studio design system.

## 🚀 Quick Access

**Prototype Hub**: http://localhost:3000/prototype/

## 📊 Available Prototypes

### 1. Oracle Dashboard (Interactive)
**URL**: http://localhost:3000/prototype/oracle-dashboard.html

**Features**:
- ✅ Multi-page navigation (Dashboard, Agents, Events, Knowledge, Settings)
- ✅ Stats cards with hover effects
- ✅ Agent cards with avatars
- ✅ Activity feed with status indicators
- ✅ Knowledge base search
- ✅ Settings page with toggle switches
- ✅ Fully responsive design
- ✅ Dark theme (OpenClaw colors)

**Pages**:
- Dashboard - Overview with stats and activity
- Agents - Virtual Office team cards
- Events - Event log with filtering
- Knowledge - Searchable knowledge base
- Settings - Configuration options

### 2. OpenClaw Dashboard (Static Mockup)
**URL**: http://localhost:3000/mockup/openclaw-dashboard-mockup.html

**Shows**:
- OpenClaw color palette
- Typography (Bebas Neue + IBM Plex Sans)
- Stats cards with rise animations
- Recent activity section
- User profile with mascot

### 3. OpenClaw Settings (Static Mockup)
**URL**: http://localhost:3000/mockup/openclaw-settings-mockup.html

**Shows**:
- Profile section with avatar
- Form fields with focus states
- Toggle switches
- Success/error messages
- Complete form styling

## 🎨 Design System

### Colors (OpenClaw Palette)
```css
--bg-primary: #0a0a0f
--bg-secondary: #0f0f1a
--bg-tertiary: #1a1a2e
--bg-card: #151520

--text-primary: #f0f0f0
--text-secondary: #a0a0b0
--text-muted: #505060

--brand: #f97316  /* OpenClaw Orange */
--success: #4ade80
--error: #f87171
--info: #60a5fa
```

### Typography
```css
--font-display: 'Bebas Neue'  /* H1 only */
--font-sans: 'IBM Plex Sans'  /* H2-H6, body */
--font-mono: 'IBM Plex Mono'  /* Code */
```

### Components
- **Stats Cards** - Key metrics with hover effects
- **Agent Cards** - Team member profiles
- **Activity List** - Event timeline
- **Toggle Switches** - On/off controls
- **Chips/Tags** - Category labels
- **Buttons** - Primary and secondary actions
- **Avatars** - User/agent indicators

## 🔧 Development

### File Structure
```
public/
├── prototype/
│   ├── index.html              # Prototype hub
│   ├── oracle-dashboard.html   # Main interactive prototype
│   └── README.md              # This file
├── mockup/
│   ├── openclaw-dashboard-mockup.html
│   ├── openclaw-settings-mockup.html
│   └── openclaw-actual.html
└── openclaw-studio/           # Built OpenClaw UI
```

### Building from Source

#### OpenClaw Studio
```bash
cd /Users/jodunk/ghq/github.com/openclaw/openclaw/ui
bun install
bun run build
```

#### Arra Oracle
```bash
cd /Users/jodunk/.local/share/arra-oracle-v3/frontend
bun install
bun run dev
```

## 🌐 Access Points

### Via Arra Oracle (Port 3000)
- Prototype Hub: http://localhost:3000/prototype/
- Oracle Dashboard: http://localhost:3000/prototype/oracle-dashboard.html
- Mockups: http://localhost:3000/mockup/

### Standalone OpenClaw (Port 8080)
```bash
# Start on port 8080
./scripts/start-openclaw.sh 8080

# Stop
./scripts/stop-openclaw.sh 8080

# Custom port
./scripts/start-openclaw.sh 9000
```

## 📝 Notes

- All prototypes use OpenClaw Studio design system
- Dark theme with orange brand color (#f97316)
- Responsive layouts for all screen sizes
- CSS animations and transitions
- No JavaScript framework dependencies (vanilla JS)

## 🎯 Next Steps

1. **Review prototype** - Check Oracle Dashboard prototype
2. **Choose pages** - Decide which pages to implement first
3. **Copy patterns** - Use OpenClaw components as reference
4. **Integrate** - Add to Arra Oracle React app

## 🦞 Credits

**Design**: OpenClaw Studio
**Repository**: https://github.com/openclaw/openclaw
**Mascot**: Pixel Lobster

---

*Created: 2026-03-28*
*Status: ✅ Ready for Review*
