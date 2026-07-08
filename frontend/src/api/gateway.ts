/**
 * Gateway API Client
 *
 * Client-side wrapper for Gateway HTTP API.
 * Communicates with Gateway via server-owned WebSocket.
 *
 * Based on OpenClaw Studio pattern.
 */

const API_BASE = '/api/gateway';

export interface GatewayMessage {
  method: string;
  params?: Record<string, unknown>;
}

export interface GatewayResponse {
  id: string;
  result?: unknown;
  error?: string;
  timestamp: number;
}

// ============================================================================
// Generic Gateway Operations
// ============================================================================

/**
 * Send a message to Gateway
 */
export async function sendGatewayMessage(
  method: string,
  params?: Record<string, unknown>
): Promise<GatewayResponse> {
  const res = await fetch(`${API_BASE}/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, params })
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Gateway request failed');
  }

  return res.json();
}

/**
 * Get Gateway connection status
 */
export async function getGatewayStatus(): Promise<{ connected: boolean; url?: string }> {
  const res = await fetch(`${API_BASE}/status`);
  return res.json();
}

/**
 * Manually connect to Gateway
 */
export async function connectGateway(): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/connect`, { method: 'POST' });
  return res.json();
}

/**
 * Disconnect from Gateway
 */
export async function disconnectGateway(): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/disconnect`, { method: 'POST' });
  return res.json();
}

/**
 * Get allowed methods
 */
export async function getAllowedMethods(): Promise<{ methods: string[] }> {
  const res = await fetch(`${API_BASE}/methods`);
  return res.json();
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Send chat message to Gateway
 */
export async function gatewayChat(
  message: string,
  agentId?: string
): Promise<GatewayResponse> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, agentId })
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Chat failed');
  }

  return res.json();
}

/**
 * Search via Gateway
 */
export async function gatewaySearch(
  query: string,
  limit?: number
): Promise<GatewayResponse> {
  const res = await fetch(`${API_BASE}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, limit })
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Search failed');
  }

  return res.json();
}

/**
 * List agents
 */
export async function listAgents(): Promise<GatewayResponse> {
  const res = await fetch(`${API_BASE}/agents`);

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to list agents');
  }

  return res.json();
}

/**
 * Get agent details
 */
export async function getAgent(agentId: string): Promise<GatewayResponse> {
  const res = await fetch(`${API_BASE}/agents/${encodeURIComponent(agentId)}`);

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to get agent');
  }

  return res.json();
}

/**
 * Health check via Gateway
 */
export async function gatewayHealth(): Promise<GatewayResponse> {
  const res = await fetch(`${API_BASE}/health`);

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Health check failed');
  }

  return res.json();
}

// ============================================================================
// React Hook
// ============================================================================

import { useState, useEffect } from 'react';

export interface UseGatewayReturn {
  connected: boolean;
  loading: boolean;
  error: string | null;
  chat: (message: string, agentId?: string) => Promise<GatewayResponse>;
  search: (query: string, limit?: number) => Promise<GatewayResponse>;
  listAgents: () => Promise<GatewayResponse>;
  getAgent: (agentId: string) => Promise<GatewayResponse>;
  health: () => Promise<GatewayResponse>;
}

/**
 * React hook for Gateway communication
 *
 * @example
 * const { connected, chat } = useGateway();
 *
 * const response = await chat('Hello, Oracle!');
 */
export function useGateway(): UseGatewayReturn {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Poll connection status every 5s
  useEffect(() => {
    let mounted = true;

    async function checkStatus() {
      try {
        const status = await getGatewayStatus();
        if (mounted) {
          setConnected(status.connected);
          setError(null);
        }
      } catch (e) {
        if (mounted) {
          setConnected(false);
          setError(e instanceof Error ? e.message : 'Failed to check status');
        }
      }
    }

    checkStatus();
    const interval = setInterval(checkStatus, 5000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const chat = async (message: string, agentId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await gatewayChat(message, agentId);
      return response;
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Chat failed';
      setError(errorMessage);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const search = async (query: string, limit?: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await gatewaySearch(query, limit);
      return response;
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Search failed';
      setError(errorMessage);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const listAgents = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await listAgents();
      return response;
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to list agents';
      setError(errorMessage);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const getAgent = async (agentId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await getAgent(agentId);
      return response;
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to get agent';
      setError(errorMessage);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const health = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await gatewayHealth();
      return response;
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Health check failed';
      setError(errorMessage);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  return {
    connected,
    loading,
    error,
    chat,
    search,
    listAgents,
    getAgent,
    health
  };
}
