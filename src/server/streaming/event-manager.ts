/**
 * Event Manager for SSE Streaming
 *
 * Manages event broadcasting to SSE clients.
 * Based on OpenClaw Studio pattern.
 */

export interface StreamEvent {
  id: string;
  type: 'learning' | 'consultation' | 'search' | 'status' | 'error';
  data: unknown;
  timestamp: number;
}

export interface SSEClient {
  id: string;
  controller: ReadableStreamDefaultController;
  lastEventId: string | null;
}

/**
 * Event Manager - Singleton for managing SSE connections
 */
class EventManager {
  private clients = new Map<string, SSEClient>();
  private eventHistory: StreamEvent[] = [];
  private lastId = 0;
  private maxHistorySize = 1000; // Keep last 1000 events for replay

  /**
   * Register a new SSE client
   */
  registerClient(clientId: string, controller: ReadableStreamDefaultController, lastEventId: string | null): void {
    const client: SSEClient = {
      id: clientId,
      controller,
      lastEventId
    };

    this.clients.set(clientId, client);

    // If client provided lastEventId, replay missed events
    if (lastEventId) {
      this.replayEvents(client, lastEventId);
    }

    console.log(`📡 SSE Client connected: ${clientId} (Last-Event-ID: ${lastEventId || 'none'})`);
  }

  /**
   * Unregister an SSE client
   */
  unregisterClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      try {
        client.controller.close();
      } catch (e) {
        // Already closed
      }
      this.clients.delete(clientId);
      console.log(`📡 SSE Client disconnected: ${clientId}`);
    }
  }

  /**
   * Broadcast event to all connected clients
   */
  broadcast(event: Omit<StreamEvent, 'id' | 'timestamp'>): void {
    const streamEvent: StreamEvent = {
      ...event,
      id: String(++this.lastId),
      timestamp: Date.now()
    };

    // Store in history
    this.eventHistory.push(streamEvent);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift(); // Remove oldest
    }

    // Send to all clients
    const eventData = JSON.stringify(streamEvent.data);
    const message = `id: ${streamEvent.id}\nevent: ${streamEvent.type}\ndata: ${eventData}\n\n`;

    for (const [clientId, client] of this.clients.entries()) {
      try {
        client.controller.enqueue(new TextEncoder().encode(message));
      } catch (e) {
        // Client disconnected, remove them
        console.error(`Failed to send to client ${clientId}:`, e);
        this.unregisterClient(clientId);
      }
    }
  }

  /**
   * Replay events to a client that reconnected with Last-Event-ID
   */
  private replayEvents(client: SSEClient, lastEventId: string): void {
    const startIndex = this.eventHistory.findIndex(e => e.id === lastEventId);

    if (startIndex === -1) {
      // Event not found in history, send everything
      console.log(`📡 Replaying all ${this.eventHistory.length} events to client ${client.id}`);
      for (const event of this.eventHistory) {
        this.sendToClient(client, event);
      }
    } else {
      // Send events after the last one
      const missedEvents = this.eventHistory.slice(startIndex + 1);
      console.log(`📡 Replaying ${missedEvents.length} missed events to client ${client.id}`);
      for (const event of missedEvents) {
        this.sendToClient(client, event);
      }
    }
  }

  /**
   * Send single event to specific client
   */
  private sendToClient(client: SSEClient, event: StreamEvent): void {
    try {
      const eventData = JSON.stringify(event.data);
      const message = `id: ${event.id}\nevent: ${event.type}\ndata: ${eventData}\n\n`;
      client.controller.enqueue(new TextEncoder().encode(message));
    } catch (e) {
      console.error(`Failed to replay event to client ${client.id}:`, e);
    }
  }

  /**
   * Get current client count
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Get event history stats
   */
  getStats() {
    return {
      connectedClients: this.clients.size,
      totalEvents: this.lastId,
      historySize: this.eventHistory.length,
      maxHistorySize: this.maxHistorySize
    };
  }
}

// Singleton instance
export const eventManager = new EventManager();

/**
 * Helper functions for broadcasting common events
 */
export const broadcast = {
  learning: (data: { document_id: string; pattern_preview: string; concepts: string[] }) => {
    eventManager.broadcast({ type: 'learning', data });
  },

  consultation: (data: { query: string; result: string }) => {
    eventManager.broadcast({ type: 'consultation', data });
  },

  search: (data: { query: string; results_count: number; time_ms: number }) => {
    eventManager.broadcast({ type: 'search', data });
  },

  status: (data: { message: string; progress?: number }) => {
    eventManager.broadcast({ type: 'status', data });
  },

  error: (data: { message: string; code?: string }) => {
    eventManager.broadcast({ type: 'error', data });
  }
};
