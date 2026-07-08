/**
 * Projection Manager
 *
 * Manages projections - read-optimized views built from events.
 * Based on event sourcing patterns.
 */

import { eq, and, gt, sql } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { projections, snapshots } from './schema.ts';
import { eventStore } from './event-store.ts';
import type { Event, Projection } from './types.ts';

/**
 * Projection handler interface
 */
export interface ProjectionHandler<T = Record<string, unknown>> {
  name: string;

  /**
   * Initialize projection state
   */
  initialState(): T;

  /**
   * Apply event to projection state
   * Returns new state (must be immutable)
   */
  apply(event: Event, currentState: T): T;

  /**
   * Optional: Validate state before saving
   */
  validate?(state: T): boolean;
}

/**
 * Projection Manager - Singleton
 */
class ProjectionManager {
  private handlers = new Map<string, ProjectionHandler>();
  private cache = new Map<string, Projection>();

  /**
   * Register a projection handler
   */
  register<T>(handler: ProjectionHandler<T>): void {
    this.handlers.set(handler.name, handler);
    console.log(`📊 Projection registered: ${handler.name}`);
  }

  /**
   * Get current projection state
   */
  async getProjection<T = Record<string, unknown>>(
    name: string
  ): Promise<Projection<T> | null> {
    // Check cache first
    if (this.cache.has(name)) {
      return this.cache.get(name) as Projection<T>;
    }

    // Load from database
    const rows = await db
      .select()
      .from(projections)
      .where(eq(projections.name, name))
      .limit(1)
      .execute();

    if (rows.length === 0) {
      return null;
    }

    const projection: Projection<T> = {
      name: rows[0].name,
      lastEventId: rows[0].lastEventId,
      state: JSON.parse(rows[0].state),
      updatedAt: new Date(rows[0].updatedAt).getTime(),
    };

    // Cache it
    this.cache.set(name, projection);

    return projection;
  }

  /**
   * Update projection state
   */
  async updateProjection<T = Record<string, unknown>>(
    name: string,
    state: T,
    lastEventId: string
  ): Promise<void> {
    const updatedAt = new Date();

    await db
      .insert(projections)
      .values({
        name,
        lastEventId,
        state: JSON.stringify(state),
        updatedAt,
      })
      .onConflictDoUpdate({
        target: projections.name,
        set: {
          lastEventId,
          state: JSON.stringify(state),
          updatedAt,
        },
      });

    // Update cache
    this.cache.set(name, {
      name,
      lastEventId,
      state,
      updatedAt: updatedAt.getTime(),
    } as Projection<T>);

    console.log(`📊 Projection updated: ${name} (event: ${lastEventId})`);
  }

  /**
   * Rebuild projection from event history
   */
  async rebuildProjection<T = Record<string, unknown>>(
    name: string,
    options: { fromEventId?: string; toEventId?: string; useSnapshot?: boolean } = {}
  ): Promise<void> {
    const handler = this.handlers.get(name);
    if (!handler) {
      throw new Error(`Projection handler not found: ${name}`);
    }

    console.log(`🔨 Rebuilding projection: ${name}`);

    // Try to load snapshot first
    let state: T = handler.initialState();
    let fromEventId = options.fromEventId;

    if (options.useSnapshot !== false) {
      const snapshot = await this.loadLatestSnapshot(name);
      if (snapshot) {
        state = JSON.parse(snapshot.state);
        fromEventId = snapshot.eventId;
        console.log(`📸 Loaded snapshot: ${name} from event ${fromEventId}`);
      }
    }

    // Replay events from starting point
    const events = await eventStore.replayEvents({
      fromId: fromEventId,
      toId: options.toEventId,
    });

    console.log(`🔄 Replaying ${events.length} events for ${name}...`);

    for (const event of events) {
      try {
        state = handler.apply(event, state);
      } catch (e) {
        console.error(`Error applying event ${event.id} to projection ${name}:`, e);
        throw e;
      }
    }

    // Update projection
    const latestEvent = events.length > 0 ? events[events.length - 1] : null;
    const lastEventId = latestEvent?.id || fromEventId || 'evt_initial';

    await this.updateProjection(name, state, lastEventId);

    console.log(`✅ Projection rebuilt: ${name} (${events.length} events)`);
  }

  /**
   * Create snapshot of current projection state
   */
  async createSnapshot(name: string): Promise<void> {
    const projection = await this.getProjection(name);
    if (!projection) {
      throw new Error(`Projection not found: ${name}`);
    }

    const snapshotId = `snap_${name}_${Date.now()}`;

    await db.insert(snapshots).values({
      id: snapshotId,
      projectionName: name,
      eventId: projection.lastEventId,
      state: JSON.stringify(projection.state),
      createdAt: new Date(),
    });

    console.log(`📸 Snapshot created: ${name} (event: ${projection.lastEventId})`);
  }

  /**
   * Load latest snapshot for a projection
   */
  async loadLatestSnapshot(name: string): Promise<typeof snapshots.$inferSelect | null> {
    const rows = await db
      .select()
      .from(snapshots)
      .where(eq(snapshots.projectionName, name))
      .orderBy(sql`snapshots.created_at DESC`)
      .limit(1)
      .execute();

    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Apply single event to all relevant projections
   */
  async applyEvent(event: Event): Promise<void> {
    for (const [name, handler] of this.handlers.entries()) {
      try {
        // Get current state
        const projection = await this.getProjection(name);
        const currentState = projection?.state || handler.initialState();

        // Apply event
        const newState = handler.apply(event, currentState as Record<string, unknown>);

        // Validate if validator exists
        if (handler.validate && !handler.validate(newState)) {
          console.warn(`Projection ${name} validation failed for event ${event.id}`);
          continue;
        }

        // Update projection
        await this.updateProjection(name, newState, event.id);
      } catch (e) {
        console.error(`Error applying event ${event.id} to projection ${name}:`, e);
      }
    }
  }

  /**
   * Get all projection names
   */
  getProjectionNames(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Get projection stats
   */
  async getStats(): Promise<{
    projections: Array<{ name: string; lastEventId: string; updatedAt: number }>;
    snapshots: number;
  }> {
    const rows = await db.select().from(projections).execute();

    const snapshotRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(snapshots)
      .execute();

    return {
      projections: rows.map((row) => ({
        name: row.name,
        lastEventId: row.lastEventId,
        updatedAt: new Date(row.updatedAt).getTime(),
      })),
      snapshots: snapshotRows[0].count,
    };
  }

  /**
   * Clear projection cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Projection cache cleared');
  }

  /**
   * Clear projection (USE WITH CAUTION)
   */
  async clearProjection(name: string): Promise<void> {
    await db.delete(projections).where(eq(projections.name, name)).execute();
    this.cache.delete(name);
    console.log(`🗑️ Projection cleared: ${name}`);
  }
}

// Singleton instance
export const projectionManager = new ProjectionManager();
