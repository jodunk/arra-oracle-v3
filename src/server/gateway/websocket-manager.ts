/**
 * Gateway WebSocket Manager
 *
 * Server-owned WebSocket connection to external Gateway.
 * Browser never connects directly to Gateway - all communication via HTTP API.
 *
 * Based on OpenClaw Studio pattern.
 */

import { eventManager } from '../streaming/event-manager.ts';

export interface GatewayConfig {
  url: string;
  token?: string;
  reconnectInterval?: number;
  pingInterval?: number;
}

export interface GatewayMessage {
  id: string;
  method: string;
  params?: Record<string, unknown>;
  timestamp: number;
}

export interface GatewayResponse {
  id: string;
  result?: unknown;
  error?: string;
  timestamp: number;
}

/**
 * Method allowlist for security
 * Only these methods can be called via HTTP API
 */
const ALLOWED_METHODS = new Set([
  // Status & health
  'status',
  'health_check',
  'ping',

  // Chat & communication
  'chat',
  'send_message',
  'consult',

  // Agent management
  'list_agents',
  'get_agent',
  'create_agent',
  'update_agent',
  'delete_agent',

  // Knowledge base
  'search',
  'get_learnings',
  'add_learning',

  // Capabilities
  'list_capabilities',
  'check_capability'
]);

/**
 * Gateway WebSocket Manager - Singleton
 */
class GatewayWebSocketManager {
  private ws: WebSocket | null = null;
  private config: GatewayConfig | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private messageHandlers = new Map<string, (response: GatewayResponse) => void>();
  private messageId = 0;
  private connectionPromise: Promise<void> | null = null;
  private connectionResolve: (() => void) | null = null;

  /**
   * Configure Gateway connection
   */
  configure(config: GatewayConfig): void {
    this.config = {
      ...config,
      reconnectInterval: config.reconnectInterval || 5000,
      pingInterval: config.pingInterval || 30000
    };

    console.log('🔌 Gateway configured:', this.config.url);
  }

  /**
   * Connect to Gateway WebSocket
   */
  async connect(): Promise<void> {
    if (!this.config) {
      throw new Error('Gateway not configured. Call configure() first.');
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        const wsUrl = new URL(this.config!.url);
        if (this.config!.token) {
          wsUrl.searchParams.set('token', this.config!.token);
        }

        console.log('🔌 Connecting to Gateway:', wsUrl.toString().replace(/token=[^&]+/, 'token=***'));

        this.ws = new WebSocket(wsUrl.toString());

        this.ws.onopen = () => {
          console.log('🔌 Gateway WebSocket connected');
          this.startPing();
          if (this.connectionResolve) {
            this.connectionResolve();
          }
          resolve();

          // Notify all clients via SSE
          eventManager.broadcast({
            type: 'status',
            data: { message: 'Gateway connected', connected: true }
          });
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          console.error('🔌 Gateway WebSocket error:', error);
          eventManager.broadcast({
            type: 'error',
            data: { message: 'Gateway connection error', code: 'GATEWAY_WS_ERROR' }
          });
        };

        this.ws.onclose = () => {
          console.log('🔌 Gateway WebSocket disconnected');
          this.stopPing();
          this.scheduleReconnect();

          // Notify all clients via SSE
          eventManager.broadcast({
            type: 'status',
            data: { message: 'Gateway disconnected', connected: false }
          });
        };

        this.connectionResolve = resolve;
      } catch (e) {
        console.error('🔌 Failed to create WebSocket:', e);
        reject(e);
        this.scheduleReconnect();
      }
    });

    return this.connectionPromise;
  }

  /**
   * Disconnect from Gateway
   */
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.stopPing();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.connectionPromise = null;
    this.connectionResolve = null;

    console.log('🔌 Gateway disconnected');
  }

  /**
   * Send message to Gateway
   */
  async send(method: string, params?: Record<string, unknown>): Promise<GatewayResponse> {
    // Check method allowlist
    if (!ALLOWED_METHODS.has(method)) {
      throw new Error(`Method not allowed: ${method}`);
    }

    // Ensure connected
    await this.ensureConnected();

    return new Promise((resolve, reject) => {
      const message: GatewayMessage = {
        id: `gw-${Date.now()}-${++this.messageId}`,
        method,
        params,
        timestamp: Date.now()
      };

      // Register handler for response
      this.messageHandlers.set(message.id, (response) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });

      // Send message
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(message));
        console.log('🔌 → Gateway:', method);
      } else {
        this.messageHandlers.delete(message.id);
        reject(new Error('Gateway not connected'));
      }

      // Timeout after 30s
      setTimeout(() => {
        if (this.messageHandlers.has(message.id)) {
          this.messageHandlers.delete(message.id);
          reject(new Error('Gateway request timeout'));
        }
      }, 30000);
    });
  }

  /**
   * Ensure Gateway is connected
   */
  private async ensureConnected(): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect();
    }
  }

  /**
   * Handle incoming message from Gateway
   */
  private handleMessage(data: string): void {
    try {
      const message: GatewayResponse = JSON.parse(data);

      // Check if this is a response to a request
      const handler = this.messageHandlers.get(message.id);
      if (handler) {
        handler(message);
        this.messageHandlers.delete(message.id);
        console.log('🔌 ← Gateway response:', message.id);
      } else {
        // This is an unsolicited message from Gateway (broadcast/push)
        console.log('🔌 ← Gateway broadcast:', message);
        this.handleBroadcast(message);
      }
    } catch (e) {
      console.error('🔌 Failed to handle Gateway message:', e);
    }
  }

  /**
   * Handle broadcast message from Gateway
   */
  private handleBroadcast(message: GatewayResponse): void {
    // Broadcast to all SSE clients
    eventManager.broadcast({
      type: 'status',
      data: {
        message: 'Gateway broadcast',
        data: message.result
      }
    });
  }

  /**
   * Schedule reconnection
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      return; // Already scheduled
    }

    const interval = this.config?.reconnectInterval || 5000;
    console.log(`🔌 Scheduling reconnect in ${interval}ms`);

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connectionPromise = null;
      this.connect().catch((e) => {
        console.error('🔌 Reconnect failed:', e);
      });
    }, interval);
  }

  /**
   * Start ping interval to keep connection alive
   */
  private startPing(): void {
    this.stopPing();

    const interval = this.config?.pingInterval || 30000;
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          id: `ping-${Date.now()}`,
          method: 'ping',
          timestamp: Date.now()
        }));
      }
    }, interval);
  }

  /**
   * Stop ping interval
   */
  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Get connection status
   */
  getStatus(): { connected: boolean; url?: string } {
    return {
      connected: this.ws?.readyState === WebSocket.OPEN,
      url: this.config?.url
    };
  }

  /**
   * Get method allowlist (for documentation)
   */
  getAllowedMethods(): string[] {
    return Array.from(ALLOWED_METHODS);
  }
}

// Singleton instance
export const gatewayManager = new GatewayWebSocketManager();

/**
 * Helper functions for common Gateway operations
 */
export const gateway = {
  /**
   * Get Gateway status
   */
  status: () => gatewayManager.send('status'),

  /**
   * Health check
   */
  health: () => gatewayManager.send('health_check'),

  /**
   * Send chat message
   */
  chat: (message: string, agentId?: string) =>
    gatewayManager.send('chat', { message, agent_id: agentId }),

  /**
   * Search knowledge base
   */
  search: (query: string, limit?: number) =>
    gatewayManager.send('search', { query, limit }),

  /**
   * List agents
   */
  listAgents: () =>
    gatewayManager.send('list_agents'),

  /**
   * Get agent details
   */
  getAgent: (agentId: string) =>
    gatewayManager.send('get_agent', { agent_id: agentId })
};
