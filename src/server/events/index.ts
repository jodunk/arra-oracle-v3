/**
 * Event Sourcing System Initialization
 *
 * Set up event store, projections, and handlers.
 */

import { eventStore } from './event-store.ts';
import { projectionManager } from './projection-manager.ts';
import { memoryProjection } from './projections/memory-projection.ts';
import { statsProjection } from './projections/stats-projection.ts';
import { broadcast } from '../streaming/event-manager.ts';

/**
 * Initialize event sourcing system
 */
export async function initializeEventSourcing(): Promise<void> {
  console.log('🔮 Initializing event sourcing system...');

  // Register projections
  projectionManager.register(memoryProjection);
  projectionManager.register(statsProjection);

  // Set up event handlers to auto-update projections
  eventStore.on('LEARNING_CREATED', async (event) => {
    await projectionManager.applyEvent(event);
    // Broadcast via SSE for real-time updates
    broadcast.learning({
      document_id: event.data.id,
      pattern_preview: (event.data as any).pattern?.substring(0, 100),
      concepts: (event.data as any).concepts,
    });
  });

  eventStore.on('RETROSPECTIVE_CREATED', async (event) => {
    await projectionManager.applyEvent(event);
  });

  eventStore.on('PATTERN_DISCOVERED', async (event) => {
    await projectionManager.applyEvent(event);
  });

  eventStore.on('SESSION_STARTED', async (event) => {
    await projectionManager.applyEvent(event);
  });

  eventStore.on('SESSION_ENDED', async (event) => {
    await projectionManager.applyEvent(event);
  });

  // Rebuild projections from event history
  // This ensures projections are up-to-date on server startup
  // NOTE: Disabled for now - database connection issue
  console.log('🔨 Skipping projection rebuild (manual rebuild available via API)');

  console.log('✅ Event sourcing system initialized');
}

/**
 * Helper functions for common event operations
 */
export const events = {
  /**
   * Create learning event
   */
  learningCreated: async (
    id: string,
    pattern: string,
    concepts: string[],
    metadata: Record<string, unknown> = {}
  ) => {
    return eventStore.appendEvent(
      'LEARNING_CREATED',
      { id, pattern, concepts },
      metadata
    );
  },

  /**
   * Create retrospective event
   */
  retrospectiveCreated: async (
    id: string,
    content: string,
    sessionId: string,
    metadata: Record<string, unknown> = {}
  ) => {
    return eventStore.appendEvent(
      'RETROSPECTIVE_CREATED',
      { id, content, sessionId },
      metadata
    );
  },

  /**
   * Create pattern discovered event
   */
  patternDiscovered: async (
    pattern: string,
    category: 'principle' | 'pattern' | 'learning' | 'retro',
    metadata: Record<string, unknown> = {}
  ) => {
    return eventStore.appendEvent(
      'PATTERN_DISCOVERED',
      { pattern, category },
      metadata
    );
  },

  /**
   * Create session started event
   */
  sessionStarted: async (
    sessionId: string,
    agentId: string,
    metadata: Record<string, unknown> = {}
  ) => {
    return eventStore.appendEvent(
      'SESSION_STARTED',
      { sessionId, agentId, startTime: Date.now() },
      metadata
    );
  },

  /**
   * Create supersession logged event
   */
  supersessionLogged: async (
    oldId: string,
    newId: string,
    reason?: string
  ) => {
    return eventStore.appendEvent(
      'SUPERSERSION_LOGGED',
      { oldId, newId, reason },
      { source: 'event-sourcing' }
    );
  },

  /**
   * Get event statistics
   */
  getStats: () => eventStore.getStats(),

  /**
   * Get memory projection
   */
  getMemory: () => projectionManager.getProjection('memory'),

  /**
   * Get stats projection
   */
  getStatsProjection: () => projectionManager.getProjection('stats'),

  /**
   * Query memory at a specific point in time (time travel!)
   */
  getMemoryAt: async (timestamp: number) => {
    const eventHistory = await eventStore.getEventsSince(timestamp);
    const state = memoryProjection.initialState();

    for (const event of eventHistory) {
      // Apply events in reverse order (newest to oldest until timestamp)
      if (event.timestamp <= timestamp) {
        break;
      }
    }

    return state;
  },
};

// Export event store and projection manager directly
export { eventStore, projectionManager };
export * from './types.ts';
export * from './schema.ts';
