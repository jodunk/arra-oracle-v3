/**
 * Event Store Schema (Drizzle ORM)
 *
 * Event sourcing database schema.
 * Based on event sourcing patterns.
 */

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

/**
 * Events table - append-only event log
 *
 * All events are stored here in chronological order.
 * This is the source of truth - all state is derived from events.
 */
export const events = sqliteTable('events', {
  // Event ID - globally unique
  id: text('id').primaryKey(),

  // Event type - discriminated union
  type: text('type').notNull(),

  // Event data - JSON serialized
  data: text('data').notNull(),

  // Event metadata - JSON serialized
  metadata: text('metadata').notNull(),

  // Timestamp - milliseconds since epoch
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),

  // Agent ID (optional) - which agent created this event
  agentId: text('agent_id'),

  // User ID (optional) - which user triggered this event
  userId: text('user_id'),

  // Correlation ID - for grouping related events
  correlationId: text('correlation_id'),

  // Causation ID - what event caused this one
  causationId: text('causation_id'),

  // Project (optional) - for project-specific events
  project: text('project'),
});

/**
 * Projections table - materialized views from events
 *
 * Projections are read-optimized views built from events.
 * Can be rebuilt by replaying events.
 */
export const projections = sqliteTable('projections', {
  // Projection name - e.g., 'memory', 'stats', 'active_sessions'
  name: text('name').primaryKey(),

  // Last event ID applied to this projection
  lastEventId: text('last_event_id').notNull(),

  // Projection state - JSON serialized
  state: text('state').notNull(),

  // Updated timestamp - milliseconds since epoch
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),

  // Snapshot flag - is this a snapshot?
  isSnapshot: integer('is_snapshot', { mode: 'boolean' }).default(false),

  // Snapshot event ID - what event this snapshot was taken at
  snapshotEventId: text('snapshot_event_id'),
});

/**
 * Snapshots table - periodic snapshots of projections
 *
 * Snapshots are taken every N events to speed up projection rebuilding.
 */
export const snapshots = sqliteTable('snapshots', {
  // Snapshot ID
  id: text('id').primaryKey(),

  // Projection name
  projectionName: text('projection_name').notNull(),

  // Event ID at time of snapshot
  eventId: text('event_id').notNull(),

  // Snapshot state - JSON serialized
  state: text('state').notNull(),

  // Created timestamp
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Event indexes - for faster queries
 *
 * Materialized indexes on common query patterns.
 */
export const eventIndexes = sqliteTable('event_indexes', {
  id: text('id').primaryKey(),

  // Index type - 'by_type', 'by_agent', 'by_project', 'by_date'
  indexType: text('index_type').notNull(),

  // Index key - e.g., event type, agent ID, project
  key: text('key').notNull(),

  // Event IDs matching this index - JSON array
  eventIds: text('event_ids').notNull(),

  // Updated timestamp
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type Projection = typeof projections.$inferSelect;
export type NewProjection = typeof projections.$inferInsert;
export type Snapshot = typeof snapshots.$inferSelect;
export type NewSnapshot = typeof snapshots.$inferInsert;
