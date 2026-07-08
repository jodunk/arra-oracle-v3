/**
 * Event Store Implementation
 *
 * Append-only event store with replay capability.
 * Based on event sourcing patterns.
 */

import { desc, and, eq, gt, lt, sql } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { events, projections, snapshots } from './schema.ts';
import type {
  Event,
  NewEvent,
  EventQuery,
  ReplayOptions,
  EventType,
  EventData,
  Projection
} from './types.ts';

/**
 * Event Store - Singleton
 */
class EventStore {
  private eventHandlers = new Map<EventType, Array<(event: Event) => void>>();

  /**
   * Append a new event to the store
   */
  async appendEvent(
    type: EventType,
    data: EventData,
    metadata: Record<string, unknown> = {}
  ): Promise<Event> {
    const id = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Date.now();

    const newEvent: NewEvent = {
      id,
      type,
      data: JSON.stringify(data),
      metadata: JSON.stringify(metadata),
      timestamp: new Date(timestamp),
      agentId: metadata.agentId ? String(metadata.agentId) : undefined,
      userId: metadata.userId ? String(metadata.userId) : undefined,
      correlationId: metadata.correlationId ? String(metadata.correlationId) : undefined,
      causationId: metadata.causationId ? String(metadata.causationId) : undefined,
      project: metadata.project ? String(metadata.project) : undefined,
    };

    await db.insert(events).values(newEvent);

    const event: Event = {
      id,
      type,
      data,
      metadata,
      timestamp,
    };

    console.log(`📝 Event appended: ${type} (${id})`);

    // Trigger event handlers
    this.dispatchEvent(event);

    return event;
  }

  /**
   * Get events with optional filtering
   */
  async getEvents(query: EventQuery = {}): Promise<Event[]> {
    const { sinceId, untilId, types, limit, agentId, project } = query;

    let dbQuery = db.select().from(events);

    // Filter by ID range
    if (sinceId) {
      dbQuery = dbQuery.where(gt(events.id, sinceId));
    }
    if (untilId) {
      dbQuery = dbQuery.where(lt(events.id, untilId));
    }

    // Filter by type
    if (types && types.length > 0) {
      dbQuery = dbQuery.where(sql`${events.type} IN ${types}`);
    }

    // Filter by agent
    if (agentId) {
      dbQuery = dbQuery.where(eq(events.agentId, agentId));
    }

    // Filter by project
    if (project) {
      dbQuery = dbQuery.where(eq(events.project, project));
    }

    // Order by timestamp
    dbQuery = dbQuery.orderBy(desc(events.timestamp));

    // Limit
    if (limit) {
      dbQuery = dbQuery.limit(limit);
    }

    const rows = await dbQuery.execute();

    return rows.map((row) => this.deserializeEvent(row));
  }

  /**
   * Get a single event by ID
   */
  async getEvent(id: string): Promise<Event | null> {
    const row = await db
      .select()
      .from(events)
      .where(eq(events.id, id))
      .limit(1)
      .execute();

    if (row.length === 0) {
      return null;
    }

    return this.deserializeEvent(row[0]);
  }

  /**
   * Get the latest event
   */
  async getLatestEvent(): Promise<Event | null> {
    const row = await db
      .select()
      .from(events)
      .orderBy(desc(events.timestamp))
      .limit(1)
      .execute();

    if (row.length === 0) {
      return null;
    }

    return this.deserializeEvent(row[0]);
  }

  /**
   * Replay events from a given starting point
   */
  async replayEvents(
    options: ReplayOptions = {}
  ): Promise<Event[]> {
    const { fromId, toId } = options;

    const query: EventQuery = {
      sinceId: fromId,
      untilId: toId,
    };

    return this.getEvents(query);
  }

  /**
   * Get event statistics
   */
  async getStats(): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    latestEventId: string | null;
    oldestEventTimestamp: number | null;
    newestEventTimestamp: number | null;
  }> {
    // Total events
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(events)
      .execute();

    const totalEvents = totalResult[0].count;

    // Events by type
    const byTypeResult = await db
      .select({
        type: events.type,
        count: sql<number>`count(*)`,
      })
      .from(events)
      .groupBy(events.type)
      .execute();

    const eventsByType: Record<string, number> = {};
    for (const row of byTypeResult) {
      eventsByType[row.type] = row.count;
    }

    // Latest event
    const latestEvent = await this.getLatestEvent();

    // Timestamp range
    const timeRangeResult = await db
      .select({
        min: sql<number>`min(${events.timestamp})`,
        max: sql<number>`max(${events.timestamp})`,
      })
      .from(events)
      .execute();

    return {
      totalEvents,
      eventsByType,
      latestEventId: latestEvent?.id || null,
      oldestEventTimestamp: timeRangeResult[0]?.min || null,
      newestEventTimestamp: timeRangeResult[0]?.max || null,
    };
  }

  /**
   * Register an event handler for a specific type
   */
  on(type: EventType, handler: (event: Event) => void): void {
    if (!this.eventHandlers.has(type)) {
      this.eventHandlers.set(type, []);
    }
    this.eventHandlers.get(type)!.push(handler);
  }

  /**
   * Unregister event handlers for a type
   */
  off(type: EventType, handler: (event: Event) => void): void {
    const handlers = this.eventHandlers.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Dispatch event to registered handlers
   */
  private dispatchEvent(event: Event): void {
    const handlers = this.eventHandlers.get(event.type);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(event);
        } catch (e) {
          console.error(`Event handler error for ${event.type}:`, e);
        }
      }
    }
  }

  /**
   * Deserialize database row to Event
   */
  private deserializeEvent(row: Record<string, unknown>): Event {
    return {
      id: String(row.id),
      type: row.type as EventType,
      data: JSON.parse(String(row.data)),
      metadata: JSON.parse(String(row.metadata)),
      timestamp: new Date(String(row.timestamp)).getTime(),
    };
  }

  /**
   * Clear all events (USE WITH CAUTION - mainly for testing)
   */
  async clear(): Promise<void> {
    await db.delete(events).execute();
    console.log('🗑️ Event store cleared');
  }

  /**
   * Get events since a given timestamp
   */
  async getEventsSince(timestamp: number): Promise<Event[]> {
    const rows = await db
      .select()
      .from(events)
      .where(gt(events.timestamp, new Date(timestamp)))
      .orderBy(desc(events.timestamp))
      .execute();

    return rows.map((row) => this.deserializeEvent(row));
  }
}

// Singleton instance
export const eventStore = new EventStore();
