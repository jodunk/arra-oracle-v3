/**
 * Events API Routes
 *
 * Endpoints for interacting with the event sourcing system.
 */

import { Hono } from 'hono';
import { eventStore, projectionManager } from '../server/events/index.ts';
import { migrateToEventSourcing, validateMigration } from '../server/events/migrate.ts';

const eventsRoutes = new Hono();

/**
 * GET /api/events/stats
 *
 * Get event store statistics
 */
eventsRoutes.get('/api/events/stats', async (c) => {
  try {
    const stats = await eventStore.getStats();
    return c.json(stats);
  } catch (error) {
    console.error('Error in /api/events/stats:', error);
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, 500);
  }
});

/**
 * GET /api/events
 *
 * Query events with optional filters
 *
 * Query params:
 * - sinceId: string
 * - untilId: string
 * - type: string (comma-separated)
 * - limit: number
 * - agentId: string
 * - project: string
 */
eventsRoutes.get('/api/events', async (c) => {
  const sinceId = c.req.query('sinceId');
  const untilId = c.req.query('untilId');
  const typeParam = c.req.query('type');
  const limit = c.req.query('limit');
  const agentId = c.req.query('agentId');
  const project = c.req.query('project');

  const query: {
    sinceId?: string;
    untilId?: string;
    types?: string[];
    limit?: number;
    agentId?: string;
    project?: string;
  } = {};

  if (sinceId) query.sinceId = sinceId;
  if (untilId) query.untilId = untilId;
  if (typeParam) query.types = typeParam.split(',');
  if (limit) query.limit = parseInt(limit);
  if (agentId) query.agentId = agentId;
  if (project) query.project = project;

  const events = await eventStore.getEvents(query);

  return c.json({ events, total: events.length });
});

/**
 * GET /api/events/:id
 *
 * Get a specific event by ID
 */
eventsRoutes.get('/api/events/:id', async (c) => {
  const id = c.req.param('id');
  const event = await eventStore.getEvent(id);

  if (!event) {
    return c.json({ error: 'Event not found' }, 404);
  }

  return c.json(event);
});

/**
 * GET /api/projections
 *
 * Get all projections
 */
eventsRoutes.get('/api/projections', async (c) => {
  const stats = await projectionManager.getStats();
  return c.json(stats);
});

/**
 * GET /api/projections/:name
 *
 * Get a specific projection
 */
eventsRoutes.get('/api/projections/:name', async (c) => {
  const name = c.req.param('name');
  const projection = await projectionManager.getProjection(name);

  if (!projection) {
    return c.json({ error: 'Projection not found' }, 404);
  }

  return c.json(projection);
});

/**
 * POST /api/projections/:name/rebuild
 *
 * Rebuild a projection from event history
 */
eventsRoutes.post('/api/projections/:name/rebuild', async (c) => {
  const name = c.req.param('name');
  const body = await c.req.json();
  const options = body.options || {};

  try {
    await projectionManager.rebuildProjection(name, options);
    return c.json({ success: true, message: `Projection ${name} rebuilt` });
  } catch (e) {
    console.error(`Failed to rebuild projection ${name}:`, e);
    return c.json({
      error: e instanceof Error ? e.message : 'Rebuild failed'
    }, 500);
  }
});

/**
 * POST /api/projections/:name/snapshot
 *
 * Create a snapshot of a projection
 */
eventsRoutes.post('/api/projections/:name/snapshot', async (c) => {
  const name = c.req.param('name');

  try {
    await projectionManager.createSnapshot(name);
    return c.json({ success: true, message: `Snapshot created for ${name}` });
  } catch (e) {
    console.error(`Failed to create snapshot for ${name}:`, e);
    return c.json({
      error: e instanceof Error ? e.message : 'Snapshot failed'
    }, 500);
  }
});

/**
 * POST /api/events/migrate
 *
 * Run migration to convert existing data to events
 */
eventsRoutes.post('/api/events/migrate', async (c) => {
  try {
    await migrateToEventSourcing();
    return c.json({ success: true, message: 'Migration complete' });
  } catch (e) {
    console.error('Migration failed:', e);
    return c.json({
      error: e instanceof Error ? e.message : 'Migration failed'
    }, 500);
  }
});

/**
 * POST /api/events/migrate/rollback
 *
 * Rollback migration (USE WITH CAUTION!)
 */
eventsRoutes.post('/api/events/migrate/rollback', async (c) => {
  const confirm = c.req.header('X-Confirm-Rollback');
  if (confirm !== 'YES-IRREVERSIBLE') {
    return c.json({
      error: 'Must include X-Confirm-Rollback: YES-IRREVERSIBLE header'
    }, 400);
  }

  try {
    const { rollbackMigration } = await import('../events/migrate.ts');
    await rollbackMigration();
    return c.json({ success: true, message: 'Migration rolled back' });
  } catch (e) {
    console.error('Rollback failed:', e);
    return c.json({
      error: e instanceof Error ? e.message : 'Rollback failed'
    }, 500);
  }
});

/**
 * GET /api/events/migrate/validate
 *
 * Validate migration integrity
 */
eventsRoutes.get('/api/events/migrate/validate', async (c) => {
  const validation = await validateMigration();
  return c.json(validation);
});

/**
 * GET /api/events/memory
 *
 * Get memory projection (convenience endpoint)
 */
eventsRoutes.get('/api/events/memory', async (c) => {
  const projection = await projectionManager.getProjection('memory');

  if (!projection) {
    return c.json({ error: 'Memory projection not found' }, 404);
  }

  return c.json(projection);
});

/**
 * GET /api/events/memory/at
 *
 * Get memory state at a specific point in time (time travel!)
 *
 * Query params:
 * - timestamp: number (milliseconds since epoch)
 */
eventsRoutes.get('/api/events/memory/at', async (c) => {
  const timestampParam = c.req.query('timestamp');
  if (!timestampParam) {
    return c.json({ error: 'timestamp parameter required' }, 400);
  }

  const timestamp = parseInt(timestampParam);
  if (isNaN(timestamp)) {
    return c.json({ error: 'Invalid timestamp' }, 400);
  }

  try {
    const { events } = await import('../server/events/index.ts');
    const state = await events.getMemoryAt(timestamp);
    return c.json(state);
  } catch (e) {
    console.error('Failed to get memory at timestamp:', e);
    return c.json({
      error: e instanceof Error ? e.message : 'Query failed'
    }, 500);
  }
});

export { eventsRoutes };

/**
 * Register event routes with the main app
 */
export function registerEventsRoutes(app: Hono) {
  app.route('/', eventsRoutes);
}
