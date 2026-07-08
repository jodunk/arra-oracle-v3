/**
 * Gateway HTTP API Routes
 *
 * HTTP endpoints for clients to communicate with Gateway.
 * Browser never connects directly - all via these HTTP routes.
 *
 * Based on OpenClaw Studio pattern.
 */

import { Hono } from 'hono';
import { gatewayManager, gateway } from '../server/gateway/websocket-manager.ts';

const gatewayRoutes = new Hono();

/**
 * POST /api/gateway/message
 *
 * Send a message to Gateway via WebSocket.
 *
 * Body:
 * {
 *   "method": "chat | search | status | ...",
 *   "params": { ... }
 * }
 *
 * Response:
 * {
 *   "id": "...",
 *   "result": { ... },
 *   "timestamp": 1234567890
 * }
 */
gatewayRoutes.post('/api/gateway/message', async (c) => {
  try {
    const body = await c.req.json();
    const { method, params } = body;

    if (!method) {
      return c.json({ error: 'Method is required' }, 400);
    }

    // Send to Gateway via WebSocket manager
    const response = await gatewayManager.send(method, params);

    return c.json(response);
  } catch (e) {
    console.error('Gateway message error:', e);
    return c.json({
      error: e instanceof Error ? e.message : 'Gateway request failed'
    }, 500);
  }
});

/**
 * GET /api/gateway/status
 *
 * Get Gateway connection status.
 */
gatewayRoutes.get('/api/gateway/status', (c) => {
  const status = gatewayManager.getStatus();
  return c.json(status);
});

/**
 * POST /api/gateway/connect
 *
 * Manually connect to Gateway (if auto-connect disabled).
 */
gatewayRoutes.post('/api/gateway/connect', async (c) => {
  try {
    await gatewayManager.connect();
    return c.json({ success: true, message: 'Gateway connected' });
  } catch (e) {
    console.error('Gateway connect error:', e);
    return c.json({
      error: e instanceof Error ? e.message : 'Failed to connect'
    }, 500);
  }
});

/**
 * POST /api/gateway/disconnect
 *
 * Disconnect from Gateway.
 */
gatewayRoutes.post('/api/gateway/disconnect', (c) => {
  try {
    gatewayManager.disconnect();
    return c.json({ success: true, message: 'Gateway disconnected' });
  } catch (e) {
    console.error('Gateway disconnect error:', e);
    return c.json({
      error: e instanceof Error ? e.message : 'Failed to disconnect'
    }, 500);
  }
});

/**
 * GET /api/gateway/methods
 *
 * Get list of allowed Gateway methods (for documentation).
 */
gatewayRoutes.get('/api/gateway/methods', (c) => {
  const methods = gatewayManager.getAllowedMethods();
  return c.json({ methods });
});

// ============================================================================
// Convenience Endpoints (typed shortcuts for common operations)
// ============================================================================

/**
 * POST /api/gateway/chat
 *
 * Send chat message to Gateway.
 *
 * Body:
 * {
 *   "message": "Hello",
 *   "agentId": "optional-agent-id"
 * }
 */
gatewayRoutes.post('/api/gateway/chat', async (c) => {
  try {
    const body = await c.req.json();
    const { message, agentId } = body;

    if (!message) {
      return c.json({ error: 'Message is required' }, 400);
    }

    const response = await gateway.chat(message, agentId);
    return c.json(response);
  } catch (e) {
    console.error('Gateway chat error:', e);
    return c.json({
      error: e instanceof Error ? e.message : 'Chat failed'
    }, 500);
  }
});

/**
 * POST /api/gateway/search
 *
 * Search via Gateway.
 *
 * Body:
 * {
 *   "query": "search term",
 *   "limit": 20
 * }
 */
gatewayRoutes.post('/api/gateway/search', async (c) => {
  try {
    const body = await c.req.json();
    const { query, limit } = body;

    if (!query) {
      return c.json({ error: 'Query is required' }, 400);
    }

    const response = await gateway.search(query, limit);
    return c.json(response);
  } catch (e) {
    console.error('Gateway search error:', e);
    return c.json({
      error: e instanceof Error ? e.message : 'Search failed'
    }, 500);
  }
});

/**
 * GET /api/gateway/agents
 *
 * List all agents.
 */
gatewayRoutes.get('/api/gateway/agents', async (c) => {
  try {
    const response = await gateway.listAgents();
    return c.json(response);
  } catch (e) {
    console.error('Gateway list agents error:', e);
    return c.json({
      error: e instanceof Error ? e.message : 'Failed to list agents'
    }, 500);
  }
});

/**
 * GET /api/gateway/agents/:id
 *
 * Get agent details.
 */
gatewayRoutes.get('/api/gateway/agents/:id', async (c) => {
  try {
    const agentId = c.req.param('id');
    const response = await gateway.getAgent(agentId);
    return c.json(response);
  } catch (e) {
    console.error('Gateway get agent error:', e);
    return c.json({
      error: e instanceof Error ? e.message : 'Failed to get agent'
    }, 500);
  }
});

/**
 * GET /api/gateway/health
 *
 * Health check via Gateway.
 */
gatewayRoutes.get('/api/gateway/health', async (c) => {
  try {
    const response = await gateway.health();
    return c.json(response);
  } catch (e) {
    console.error('Gateway health error:', e);
    return c.json({
      error: e instanceof Error ? e.message : 'Health check failed'
    }, 500);
  }
});

export { gatewayRoutes };

/**
 * Register gateway routes with the main app
 */
export function registerGatewayRoutes(app: Hono) {
  app.route('/', gatewayRoutes);
}
