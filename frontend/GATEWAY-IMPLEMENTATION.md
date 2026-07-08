# Server-Owned WebSocket Implementation Guide

**Created**: 2026-03-28 03:20 +07
**Pattern Source**: OpenClaw Studio
**Status**: ✅ Complete

---

## Overview

Server-owned WebSocket connection to external Gateway for secure communication.

**Architecture Change**:
```
Before: Browser → WebSocket → Gateway
After:  Browser → HTTP API → Server → WebSocket → Gateway
                              (holds token)
```

**Benefits**:
- 🔒 Security (token stored server-side)
- 🔌 Single WebSocket connection (shared by all clients)
- 📊 Better auditability (all traffic via server)
- 🎯 Method allowlist (explicit permissions)
- 🔄 Auto-reconnection (resilient)

---

## Architecture

```
┌──────────┐         HTTP         ┌─────────────┐         WebSocket         ┌─────────┐
│ Browser  │ ───────────────────▶│   Server    │ ────────────────────────▶│ Gateway │
│ (Client) │ ◀───────────────────│ (HTTP API)  │ ◀────────────────────────│ (AI)    │
└──────────┘    JSON responses   └─────────────┘     AI responses          └─────────┘
                                                    │
                                                    │ Token stored here
                                                    │ Single connection
                                                    │ Method allowlist
```

---

## Components

### 1. GatewayWebSocketManager (Backend)

**File**: `src/server/gateway/websocket-manager.ts`

**Responsibilities**:
- Maintain WebSocket connection to Gateway
- Handle connection lifecycle (connect, disconnect, reconnect)
- Implement method allowlist (security)
- Route messages between HTTP API and WebSocket
- Broadcast Gateway messages to SSE clients

**Key Features**:
- Singleton pattern
- Auto-reconnect (5s interval)
- Keep-alive ping (30s interval)
- Message timeout (30s)
- Response routing (async/await)

**Method Allowlist**:
```typescript
const ALLOWED_METHODS = [
  'status', 'health_check', 'ping',
  'chat', 'send_message', 'consult',
  'list_agents', 'get_agent', 'create_agent',
  'search', 'get_learnings', 'add_learning',
  'list_capabilities', 'check_capability'
];
```

### 2. Gateway HTTP API Routes

**File**: `src/routes/gateway.ts`

**Endpoints**:
- `POST /api/gateway/message` - Generic message endpoint
- `POST /api/gateway/chat` - Chat shortcut
- `POST /api/gateway/search` - Search shortcut
- `GET /api/gateway/status` - Connection status
- `GET /api/gateway/agents` - List agents
- `GET /api/gateway/agents/:id` - Get agent details
- `GET /api/gateway/health` - Health check
- `GET /api/gateway/methods` - Allowed methods (docs)
- `POST /api/gateway/connect` - Manual connect
- `POST /api/gateway/disconnect` - Disconnect

### 3. Frontend Gateway Client

**File**: `frontend/src/api/gateway.ts`

**Features**:
- Typed API functions
- React hook (`useGateway`)
- Error handling
- Connection status polling

---

## Usage

### Backend Configuration

```typescript
import { gatewayManager } from './server/gateway/websocket-manager.ts';

// Configure Gateway connection
gatewayManager.configure({
  url: 'ws://localhost:8080/ws',  // Gateway WebSocket URL
  token: process.env.GATEWAY_TOKEN, // API token (optional)
  reconnectInterval: 5000,           // Reconnect delay
  pingInterval: 30000                // Keep-alive ping
});

// Connect (optional - auto-connects on first send)
await gatewayManager.connect();
```

### Backend: Broadcasting from Gateway

The manager automatically broadcasts Gateway messages to SSE clients:

```typescript
// Gateway broadcasts → SSE clients
// Example: Agent status update
eventManager.broadcast({
  type: 'status',
  data: { message: 'Agent updated', agentId: 'abc' }
});
```

### Frontend: Using React Hook

```typescript
import { useGateway } from '../api/gateway';

function ChatInterface() {
  const { connected, loading, error, chat } = useGateway();

  const handleSend = async () => {
    try {
      const response = await chat('Hello, Oracle!', 'agent-123');
      console.log('Response:', response.result);
    } catch (e) {
      console.error('Chat failed:', e);
    }
  };

  return (
    <div>
      <div>Status: {connected ? '🟢 Connected' : '🔴 Disconnected'}</div>
      {error && <div>Error: {error}</div>}
      <button onClick={handleSend} disabled={loading || !connected}>
        {loading ? 'Sending...' : 'Send Message'}
      </button>
    </div>
  );
}
```

### Frontend: Direct API Calls

```typescript
import { gatewayChat, gatewaySearch, listAgents } from '../api/gateway';

// Send chat message
const response = await gatewayChat('Hello!');
console.log(response.result);

// Search
const results = await gatewaySearch('oracle patterns', 20);
console.log(results.result);

// List agents
const agents = await listAgents();
console.log(agents.result);
```

---

## Security Features

### 1. Method Allowlist

Only allowed methods can be called:

```typescript
// ❌ Blocked - not in allowlist
await gatewayManager.send('delete_database', {});

// ✅ Allowed - in allowlist
await gatewayManager.send('search', { query: 'test' });
```

**Available methods**:
- Status: `status`, `health_check`, `ping`
- Communication: `chat`, `send_message`, `consult`
- Agents: `list_agents`, `get_agent`, `create_agent`, `update_agent`, `delete_agent`
- Knowledge: `search`, `get_learnings`, `add_learning`
- Capabilities: `list_capabilities`, `check_capability`

### 2. Token Storage

Gateway token stored server-side:

```typescript
gatewayManager.configure({
  url: 'ws://gateway:8080',
  token: process.env.GATEWAY_TOKEN  // Never exposed to browser
});
```

**Browser never sees token** ✅

### 3. HTTP API Validation

All requests validated before forwarding to Gateway:

```typescript
// Route checks method allowlist
if (!ALLOWED_METHODS.has(method)) {
  throw new Error(`Method not allowed: ${method}`);
}
```

---

## Connection Lifecycle

### 1. Initial Connection

```typescript
// Server startup
gatewayManager.configure({ url: 'ws://gateway:8080', token: '...' });

// Auto-connects on first message
await gatewayManager.send('status', {});

// Or manual connect
await gatewayManager.connect();
```

### 2. Connection Established

```typescript
ws.onopen = () => {
  console.log('Gateway connected');
  startPing(); // 30s keep-alive

  // Broadcast to SSE clients
  eventManager.broadcast({
    type: 'status',
    data: { message: 'Gateway connected', connected: true }
  });
};
```

### 3. Disconnection

```typescript
ws.onclose = () => {
  console.log('Gateway disconnected');
  stopPing();
  scheduleReconnect(); // 5s delay

  // Broadcast to SSE clients
  eventManager.broadcast({
    type: 'status',
    data: { message: 'Gateway disconnected', connected: false }
  });
};
```

### 4. Reconnection

```typescript
// Automatic reconnection
setTimeout(() => {
  gatewayManager.connect();
}, 5000); // 5s delay
```

---

## Message Flow

### Request Flow

```
Browser                  Server                    Gateway
   │                        │                          │
   │ POST /api/gateway/chat  │                          │
   │ {message: "Hello"}     │                          │
   ├───────────────────────▶│                          │
   │                        │ WebSocket send            │
   │                        │ {method: "chat", ...}     │
   │                        ├──────────────────────────▶│
   │                        │                          │ Processing...
   │                        │◀─────────────────────────│
   │                        │ {result: "Response..."}   │
   │ ◀───────────────────────│                          │
   │ {result: "Response..."} │                          │
   │                        │                          │
```

### Broadcast Flow (Gateway-initiated)

```
Gateway                  Server                    Browser
   │                        │                          │
   │ WebSocket send         │                          │
   │ {event: "status"}      │                          │
   ├───────────────────────▶│                          │
   │                        │ SSE broadcast             │
   │                        ├───────────────────────────▶│
   │                        │ EventSource receives      │
```

---

## Configuration

### Environment Variables

```bash
# .env
GATEWAY_URL=ws://localhost:8080/ws
GATEWAY_TOKEN=your-token-here
GATEWAY_RECONNECT_INTERVAL=5000
GATEWAY_PING_INTERVAL=30000
```

### Server Configuration

```typescript
// src/config.ts
export const GATEWAY_CONFIG = {
  url: process.env.GATEWAY_URL || 'ws://localhost:8080',
  token: process.env.GATEWAY_TOKEN,
  reconnectInterval: parseInt(process.env.GATEWAY_RECONNECT_INTERVAL || '5000'),
  pingInterval: parseInt(process.env.GATEWAY_PING_INTERVAL || '30000')
};
```

---

## Testing

### 1. Test Gateway Connection

```bash
# Check status
curl http://localhost:3000/api/gateway/status

# Expected: {"connected":true,"url":"ws://gateway:8080"}
```

### 2. Test Chat Message

```bash
curl -X POST http://localhost:3000/api/gateway/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello, Gateway!"}'
```

### 3. Test Method Allowlist

```bash
# Allowed method
curl -X POST http://localhost:3000/api/gateway/message \
  -H "Content-Type: application/json" \
  -d '{"method":"search","params":{"query":"test"}}'
# ✅ Works

# Blocked method
curl -X POST http://localhost:3000/api/gateway/message \
  -H "Content-Type: application/json" \
  -d '{"method":"delete_everything","params":{}}'
# ❌ Error: Method not allowed
```

### 4. Test Reconnection

```bash
# Stop Gateway
# Wait for reconnect attempts in server logs
# Start Gateway
# Check: Server auto-reconnects
```

---

## Integration Examples

### 1. Chat Interface with Real-Time Status

```typescript
import { useGateway } from '../api/gateway';
import { useEventStream } from '../hooks/useEventStream';

function ChatInterface() {
  const { connected: gatewayConnected, chat } = useGateway();
  const { events: statusEvents } = useEventStream();
  const agentStatus = statusEvents.find(e => e.type === 'status' && e.data.agentId);

  return (
    <div>
      <div>
        Gateway: {gatewayConnected ? '🟢' : '🔴'}
        {agentStatus && ` - Agent: ${agentStatus.data.message}`}
      </div>
      <button onClick={() => chat('Hello')} disabled={!gatewayConnected}>
        Send
      </button>
    </div>
  );
}
```

### 2. Search with Loading States

```typescript
function SearchInterface() {
  const { connected, loading, error, search } = useGateway();
  const [query, setQuery] = useState('');

  const handleSearch = async () => {
    try {
      const response = await search(query, 20);
      console.log('Results:', response.result);
    } catch (e) {
      console.error('Search failed:', e);
    }
  };

  return (
    <div>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search..."
      />
      <button onClick={handleSearch} disabled={loading || !connected}>
        {loading ? 'Searching...' : 'Search'}
      </button>
      {error && <div className="error">{error}</div>}
    </div>
  );
}
```

### 3. Agent Management

```typescript
function AgentList() {
  const { listAgents, getAgent } = useGateway();
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);

  useEffect(() => {
    listAgents().then(response => {
      setAgents(response.result);
    });
  }, []);

  const handleSelectAgent = async (agentId) => {
    const response = await getAgent(agentId);
    setSelectedAgent(response.result);
  };

  return (
    <div>
      <ul>
        {agents.map(agent => (
          <li key={agent.id} onClick={() => handleSelectAgent(agent.id)}>
            {agent.name}
          </li>
        ))}
      </ul>
      {selectedAgent && (
        <div>
          <h2>{selectedAgent.name}</h2>
          <p>{selectedAgent.description}</p>
        </div>
      )}
    </div>
  );
}
```

---

## Troubleshooting

### Gateway Won't Connect

**Symptoms**: `connected: false`, error messages

**Checks**:
1. Gateway URL correct?
   ```bash
   echo $GATEWAY_URL
   ```

2. Gateway running?
   ```bash
   curl $GATEWAY_URL/health
   ```

3. Token valid?
   ```bash
   curl -H "Authorization: Bearer $GATEWAY_TOKEN" $GATEWAY_URL/api/test
   ```

4. Firewall blocking WebSocket?
   ```bash
   telnet gateway-host 8080
   ```

### Method Not Allowed Error

**Symptoms**: `Method not allowed: X`

**Solution**: Add method to allowlist in `websocket-manager.ts`:
```typescript
const ALLOWED_METHODS = new Set([
  // ... existing methods
  'new_method'  // Add here
]);
```

### Connection Drops Frequently

**Symptoms**: Frequent disconnect/reconnect

**Checks**:
1. Gateway keep-alive enabled?
2. Network stable?
3. Adjust ping interval:
   ```typescript
   gatewayManager.configure({
     pingInterval: 15000  // More frequent pings
   });
   ```

### Slow Response Times

**Symptoms**: Requests take >10s

**Checks**:
1. Gateway overloaded?
2. Network latency?
3. Increase timeout:
   ```typescript
   // In websocket-manager.ts
   setTimeout(() => { /* timeout */ }, 60000);  // 60s instead of 30s
   ```

---

## Performance

### Benchmarks (Estimated)

| Metric | Expected | Notes |
|--------|----------|-------|
| HTTP → Gateway latency | <100ms | Local network |
| WebSocket setup | ~200ms | One-time |
| Concurrent clients | Unlimited | Single WebSocket shared |
| Memory per client | ~1KB | HTTP only, no WS |
| Gateway reconnection | 5s delay | Configurable |

### Scalability

**Single Server**:
- ✅ Unlimited HTTP clients (share single WebSocket)
- ✅ No per-client WebSocket overhead
- ⚠️ Gateway becomes single point of failure

**Multi-Server** (future):
- Use Redis Pub/Sub for Gateway message sharing
- Sticky sessions not required (HTTP stateless)
- Load balancer can distribute freely

---

## Comparison: Direct vs Server-Owned

| Feature | Direct WebSocket | Server-Owned |
|---------|------------------|---------------|
| Token location | Browser (exposed) | Server (secure) ✅ |
| Connections | 1 per client | 1 total ✅ |
| Firewall issues | Sometimes | Rare (HTTP) ✅ |
| Load balancing | Complex | Simple ✅ |
| Audit trail | Difficult | Easy ✅ |
| Method allowlist | No | Yes ✅ |
| Bidirectional | Yes | No* |

\* Can use SSE for Gateway → Browser pushes

**Verdict**: Server-owned is better for Oracle use case ✅

---

## Migration from Direct WebSocket

### Before (Direct):

```typescript
// Browser connects directly to Gateway
const ws = new WebSocket('ws://gateway:8080?token=***');
ws.onmessage = (e) => console.log(e.data);
ws.send(JSON.stringify({ method: 'chat', params: { message: 'Hi' } }));
```

### After (Server-Owned):

```typescript
// Browser uses HTTP API
const { chat } = useGateway();
const response = await chat('Hi');
console.log(response.result);

// Gateway → Browser via SSE
const { events } = useEventStream();
events.filter(e => e.type === 'status').forEach(e => console.log(e.data));
```

---

## Next Steps

### Immediate (Today)

1. **Configure Gateway** - Set URL and token
2. **Test connection** - Verify connectivity
3. **Test endpoints** - Try chat, search, etc.

### Short Term (This Week)

4. **Add to chat interface** - Replace direct WebSocket
5. **Add method allowlist** - Review security needs
6. **Monitor reconnections** - Check stability

### Long Term (Next Sprint)

7. **Metrics** - Connection stats, latency monitoring
8. **Multi-Gateway** - Support multiple Gateway connections
9. **Caching** - Cache common requests (status, agents)

---

## Files Created

- `src/server/gateway/websocket-manager.ts` - WebSocket manager
- `src/routes/gateway.ts` - HTTP API routes
- `src/server.ts` (modified) - Registered routes
- `frontend/src/api/gateway.ts` - Client library
- `GATEWAY-IMPLEMENTATION.md` - This guide

---

**Status**: ✅ Ready for testing
**Next**: Configure Gateway URL + token, then test
**Estimated testing time**: 20 minutes
