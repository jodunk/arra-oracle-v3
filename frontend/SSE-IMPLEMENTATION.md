# SSE Streaming Implementation Guide

**Created**: 2026-03-28 03:01 +07
**Pattern Source**: OpenClaw Studio
**Status**: ✅ Complete

---

## Overview

Server-Sent Events (SSE) for real-time streaming from Oracle backend to frontend.

**Benefits over MQTT**:
- ✅ No broker required (HTTP-based)
- ✅ Native browser support (EventSource API)
- ✅ Auto-reconnect with `Last-Event-ID` header
- ✅ Simpler infrastructure
- ✅ Works through proxies/firewalls

**Use Cases**:
- Real-time learning notifications
- Live search results
- Indexing progress updates
- System status monitoring

---

## Architecture

```
Browser (EventSource) → SSE Endpoint (/api/stream) → EventManager → Broadcast
                                                                    ↓
                                                            All Connected Clients
```

### Components

1. **EventManager** (`src/server/streaming/event-manager.ts`)
   - Singleton managing all SSE connections
   - Event history (last 1000 events) for replay
   - Client registration/unregistration
   - Broadcast to all clients

2. **Stream Routes** (`src/routes/stream.ts`)
   - `GET /api/stream` - Main SSE endpoint
   - `GET /api/stream/stats` - Connection stats
   - `POST /api/stream/test` - Test event broadcast

3. **Frontend Hook** (`frontend/src/hooks/useEventStream.ts`)
   - `useEventStream()` - Subscribe to all events
   - `useEventStreamType()` - Subscribe to specific type
   - Auto-reconnect with exponential backoff

4. **Demo Component** (`frontend/src/components/EventStreamDemo.tsx`)
   - Visualize real-time events
   - Connection status
   - Event history (last 100)

---

## Usage

### Backend: Broadcasting Events

```typescript
import { broadcast } from './server/streaming/event-manager.ts';

// Broadcast a new learning
broadcast.learning({
  document_id: 'abc123',
  pattern_preview: 'Test pattern',
  concepts: ['react', 'sse']
});

// Broadcast a search
broadcast.search({
  query: 'oracle',
  results_count: 42,
  time_ms: 15
});

// Broadcast status
broadcast.status({
  message: 'Indexing...',
  progress: 75
});

// Broadcast error
broadcast.error({
  message: 'Index failed',
  code: 'IDX_001'
});
```

### Frontend: Subscribing to Events

```typescript
import { useEventStream } from '../hooks/useEventStream';

function MyComponent() {
  const { events, connected, error, reconnect } = useEventStream();

  // Show recent learnings
  const learnings = events.filter(e => e.type === 'learning');

  return (
    <div>
      <div>Status: {connected ? '🟢 Connected' : '🔴 Disconnected'}</div>
      {error && <div>Error: {error}</div>}
      <ul>
        {learnings.map(event => (
          <li key={event.id}>
            {JSON.stringify(event.data)}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Frontend: Specific Event Type

```typescript
import { useEventStreamType } from '../hooks/useEventStream';

type LearningData = {
  document_id: string;
  pattern_preview: string;
  concepts: string[];
};

function LearningFeed() {
  const { events: learnings, connected } = useEventStreamType<LearningData>('learning');

  return (
    <div>
      <h2>Recent Learnings ({learnings.length})</h2>
      {learnings.map(event => (
        <div key={event.id}>
          <strong>{event.data.pattern_preview}</strong>
          <br />
          <small>{event.data.concepts.join(', ')}</small>
        </div>
      ))}
    </div>
  );
}
```

---

## Event Types

| Type | Data Shape | Example Usage |
|------|-----------|---------------|
| `learning` | `{ document_id, pattern_preview, concepts[] }` | New pattern added |
| `consultation` | `{ query, result }` | Oracle consultation |
| `search` | `{ query, results_count, time_ms }` | Search performed |
| `status` | `{ message, progress? }` | System status |
| `error` | `{ message, code? }` | Error occurred |

---

## Reconnection Logic

### Automatic Reconnection

The `useEventStream` hook automatically reconnects with exponential backoff:

```typescript
// Reconnection delays:
// Attempt 1: 1s
// Attempt 2: 2s
// Attempt 3: 4s
// Attempt 4: 8s
// ... max 30s
```

### Last-Event-ID Header

On reconnection, browser sends `Last-Event-ID` header automatically:

```http
GET /api/stream HTTP/1.1
Last-Event-ID: 42
```

Server replays all events since ID 42:

```typescript
if (lastEventId) {
  // Replay events after lastEventId
  const missedEvents = eventHistory.slice(startIndex + 1);
  for (const event of missedEvents) {
    sendToClient(client, event);
  }
}
```

### Manual Reconnection

```typescript
const { reconnect } = useEventStream();

<button onClick={reconnect}>Reconnect Now</button>
```

---

## Integration Examples

### 1. Add Real-Time Learnings to Overview Page

```typescript
// pages/Overview.tsx
import { useEventStreamType } from '../hooks/useEventStream';

export function Overview() {
  const { events: learnings } = useEventStreamType('learning');

  return (
    <div>
      <h1>Oracle Overview</h1>

      {/* Existing stats... */}

      {/* New: Real-time learning feed */}
      {learnings.length > 0 && (
        <div className="card">
          <h2>🆕 Recent Activity</h2>
          {learnings.slice(0, 5).map(event => (
            <div key={event.id} className="learning-item">
              <strong>{event.data.pattern_preview}</strong>
              <div>{event.data.concepts.join(', ')}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 2. Show Indexing Progress

```typescript
import { useEventStreamType } from '../hooks/useEventStream';

function IndexingProgress() {
  const { events: statuses } = useEventStreamType<{ message: string; progress?: number }>('status');
  const currentIndexing = statuses.filter(e => e.data.progress !== undefined).pop();

  if (!currentIndexing) return null;

  return (
    <div className="progress-bar">
      <div>{currentIndexing.data.message}</div>
      <progress value={currentIndexing.data.progress || 0} max={100} />
    </div>
  );
}
```

### 3. Real-Time Search Updates

```typescript
function SearchPage() {
  const { events: searches } = useEventStreamType('search');
  const [query, setQuery] = useState('');

  const recentSearches = searches.slice(-5).reverse();

  return (
    <div>
      <input value={query} onChange={e => setQuery(e.target.value)} />

      {recentSearches.length > 0 && (
        <div>
          <h3>Recent Searches (Real-time)</h3>
          <ul>
            {recentSearches.map(event => (
              <li key={event.id}>
                "{event.data.query}" → {event.data.results_count} results
                ({event.data.time_ms}ms)
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

---

## Testing

### Manual Testing

1. **Start the server**:
   ```bash
   cd /Users/jodunk/.local/share/arra-oracle-v3
   bun run server
   ```

2. **Start the frontend**:
   ```bash
   cd frontend
   bun run dev
   ```

3. **Add EventStreamDemo component** to a page:
   ```typescript
   import { EventStreamDemo } from '../components/EventStreamDemo';

   export function TestPage() {
     return <EventStreamDemo />;
   }
   ```

4. **Broadcast test event**:
   ```bash
   curl -X POST http://localhost:3000/api/stream/test \
     -H "Content-Type: application/json" \
     -d '{"message": "Test event from curl"}'
   ```

### Automated Testing

```typescript
// tests/stream.test.ts
import { eventManager } from '../src/server/streaming/event-manager';

test('EventManager broadcasts events', async () => {
  const mockController = {
    enqueue: vi.fn()
  };

  eventManager.registerClient('test-client', mockController as any, null);

  eventManager.broadcast({
    type: 'status',
    data: { message: 'Test' }
  });

  expect(mockController.enqueue).toHaveBeenCalled();
});
```

---

## Performance Considerations

### Memory Management

- **Event history**: Last 1000 events (configurable)
- **Client-side buffer**: Last 100 events
- **Keep-alive**: Every 30s (prevent timeout)

### Scalability

- **Single server**: ~10K concurrent connections (Bun limitation)
- **Multiple servers**: Use Redis Pub/Sub for cross-server broadcast
- **Load balancer**: Enable sticky sessions (same client → same server)

### Browser Limits

- **Max connections**: 6 per domain (browser limit)
- **Workaround**: Use single SSE connection, multiplex event types

---

## Troubleshooting

### No Events Received

1. **Check connection**:
   ```typescript
   const { connected, error } = useEventStream();
   console.log('Connected:', connected, 'Error:', error);
   ```

2. **Check server logs**:
   ```
   📡 SSE Client connected: abc-123 (Last-Event-ID: none)
   ```

3. **Test endpoint directly**:
   ```bash
   curl -N http://localhost:3000/api/stream
   ```

### Events Not Replaying After Reconnection

Check that `Last-Event-ID` is being sent:

```typescript
// In browser DevTools Network tab
Request Headers:
  Last-Event-ID: 42
```

If missing, EventSource may not be storing the ID properly.

### High Memory Usage

Reduce history size:

```typescript
// event-manager.ts
private maxHistorySize = 100; // Instead of 1000
```

---

## Migration from Polling

### Before (Polling):

```typescript
useEffect(() => {
  const interval = setInterval(async () => {
    const stats = await fetch('/api/stats').then(r => r.json());
    setStats(stats);
  }, 5000);

  return () => clearInterval(interval);
}, []);
```

### After (SSE):

```typescript
const { events: statusEvents } = useEventStreamType('status');

useEffect(() => {
  const latestStatus = statusEvents.filter(e => e.data.progress).pop();
  if (latestStatus) {
    setStats(latestStatus.data);
  }
}, [statusEvents]);
```

**Benefits**:
- ✅ No 5s delay (instant updates)
- ✅ Fewer HTTP requests
- ✅ Better battery life on mobile

---

## Next Steps

1. **Integration**: Add to Overview page for real-time learnings
2. **Indexing**: Show progress during document indexing
3. **Dashboard**: Live activity feed
4. **Monitoring**: Connection stats in admin panel

---

## Files Created

- `src/server/streaming/event-manager.ts` - Event broadcasting
- `src/routes/stream.ts` - SSE endpoints
- `frontend/src/hooks/useEventStream.ts` - React hook
- `frontend/src/components/EventStreamDemo.tsx` - Demo component
- `frontend/SSE-IMPLEMENTATION.md` - This guide

---

**Status**: ✅ Ready for integration
**Build**: Pending
**Test**: Manual testing required
