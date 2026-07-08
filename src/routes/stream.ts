/**
 * SSE Streaming Routes
 *
 * Server-Sent Events endpoint for real-time updates.
 * Based on OpenClaw Studio pattern.
 */

import { Hono } from 'hono';
import { eventManager } from '../server/streaming/event-manager.ts';

const streamRoutes = new Hono();

/**
 * GET /api/stream - SSE endpoint for real-time events
 *
 * Headers:
 * - Last-Event-ID: Resume from this event ID (reconnection)
 * - Cache-Control: no-cache (prevent buffering)
 *
 * Response:
 * - Content-Type: text/event-stream
 * - Cache-Control: no-cache
 * - Connection: keep-alive
 *
 * Event format:
 * id: 123
 * event: learning
 * data: {"document_id": "...", "pattern_preview": "..."}
 */
streamRoutes.get('/api/stream', async (c) => {
  const clientId = crypto.randomUUID();
  const lastEventId = c.req.header('Last-Event-ID');

  console.log(`📡 New SSE connection: ${clientId}`);

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Register client with event manager
      eventManager.registerClient(clientId, controller, lastEventId || null);

      // Send initial connection event
      const connectEvent = `id: connect\nevent: status\ndata: ${JSON.stringify({ message: 'Connected', clientId })}\n\n`;
      controller.enqueue(new TextEncoder().encode(connectEvent));

      // Keep-alive: send comment every 30s to prevent timeout
      const keepAliveInterval = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(': keep-alive\n\n'));
        } catch (e) {
          clearInterval(keepAliveInterval);
        }
      }, 30000);

      // Cleanup on connection close
      c.req.raw.signal?.addEventListener('abort', () => {
        clearInterval(keepAliveInterval);
        eventManager.unregisterClient(clientId);
      });
    },
    cancel() {
      eventManager.unregisterClient(clientId);
    }
  });

  return c.body(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    }
  });
});

/**
 * GET /api/stream/stats - Get streaming stats
 */
streamRoutes.get('/api/stream/stats', (c) => {
  const stats = eventManager.getStats();
  return c.json(stats);
});

/**
 * POST /api/stream/test - Test endpoint (development only)
 * Broadcasts a test event to all connected clients
 */
streamRoutes.post('/api/stream/test', async (c) => {
  const body = await c.req.json();
  eventManager.broadcast({
    type: 'status',
    data: {
      message: body.message || 'Test event',
      timestamp: new Date().toISOString()
    }
  });
  return c.json({ success: true, message: 'Test event broadcasted' });
});

export { streamRoutes };

/**
 * Register stream routes with the main app
 */
export function registerStreamRoutes(app: Hono) {
  app.route('/', streamRoutes);
}
