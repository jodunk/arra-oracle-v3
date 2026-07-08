/**
 * useEventStream Hook
 *
 * Subscribe to Server-Sent Events for real-time updates.
 * Based on OpenClaw Studio pattern.
 *
 * @example
 * const { events, connected, error } = useEventStream();
 * useEffect(() => {
 *   const learning = events.find(e => e.type === 'learning');
 *   if (learning) {
 *     console.log('New learning:', learning.data);
 *   }
 * }, [events]);
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface StreamEvent {
  id: string;
  type: 'learning' | 'consultation' | 'search' | 'status' | 'error';
  data: unknown;
  timestamp: number;
}

export interface UseEventStreamReturn {
  events: StreamEvent[];
  connected: boolean;
  error: string | null;
  reconnect: () => void;
  stats: { connectedClients: number; totalEvents: number };
}

export function useEventStream(): UseEventStreamReturn {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ connectedClients: 0, totalEvents: 0 });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastEventIdRef = useRef<string | null>(null);

  /**
   * Fetch current stats
   */
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stream/stats');
      if (res.ok) {
        const data = await res.json();
        setStats({
          connectedClients: data.connectedClients || 0,
          totalEvents: data.totalEvents || 0
        });
      }
    } catch (e) {
      console.error('Failed to fetch stream stats:', e);
    }
  }, []);

  /**
   * Connect to SSE stream
   */
  const connect = useCallback(() => {
    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    setError(null);

    try {
      // Create EventSource with Last-Event-ID for reconnection
      const eventSource = new EventSource('/api/stream', {
        withCredentials: true
      });

      eventSourceRef.current = eventSource;

      // Connection opened
      eventSource.onopen = () => {
        console.log('📡 SSE Connected');
        setConnected(true);
        setError(null);
        fetchStats();
      };

      // Connection error
      eventSource.onerror = (e) => {
        console.error('📡 SSE Error:', e);
        setConnected(false);
        setError('Connection error');

        // Auto-reconnect after delay (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, events.length), 30000);
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('📡 Reconnecting...');
          connect();
        }, delay);
      };

      // Generic message handler (fallback)
      eventSource.onmessage = (e) => {
        const newEvent: StreamEvent = {
          id: e.lastEventId || Date.now().toString(),
          type: 'status',
          data: JSON.parse(e.data),
          timestamp: Date.now()
        };
        setEvents(prev => [...prev.slice(-100), newEvent]); // Keep last 100
        lastEventIdRef.current = newEvent.id;
      };

      // Typed event handlers
      eventSource.addEventListener('learning', (e: MessageEvent) => {
        const newEvent: StreamEvent = {
          id: e.lastEventId || Date.now().toString(),
          type: 'learning',
          data: JSON.parse(e.data),
          timestamp: Date.now()
        };
        setEvents(prev => [...prev.slice(-100), newEvent]);
        lastEventIdRef.current = newEvent.id;
      });

      eventSource.addEventListener('consultation', (e: MessageEvent) => {
        const newEvent: StreamEvent = {
          id: e.lastEventId || Date.now().toString(),
          type: 'consultation',
          data: JSON.parse(e.data),
          timestamp: Date.now()
        };
        setEvents(prev => [...prev.slice(-100), newEvent]);
        lastEventIdRef.current = newEvent.id;
      });

      eventSource.addEventListener('search', (e: MessageEvent) => {
        const newEvent: StreamEvent = {
          id: e.lastEventId || Date.now().toString(),
          type: 'search',
          data: JSON.parse(e.data),
          timestamp: Date.now()
        };
        setEvents(prev => [...prev.slice(-100), newEvent]);
        lastEventIdRef.current = newEvent.id;
      });

      eventSource.addEventListener('status', (e: MessageEvent) => {
        const newEvent: StreamEvent = {
          id: e.lastEventId || Date.now().toString(),
          type: 'status',
          data: JSON.parse(e.data),
          timestamp: Date.now()
        };
        setEvents(prev => [...prev.slice(-100), newEvent]);
        lastEventIdRef.current = newEvent.id;
      });

      eventSource.addEventListener('error', (e: MessageEvent) => {
        const newEvent: StreamEvent = {
          id: e.lastEventId || Date.now().toString(),
          type: 'error',
          data: JSON.parse(e.data),
          timestamp: Date.now()
        };
        setEvents(prev => [...prev.slice(-100), newEvent]);
        lastEventIdRef.current = newEvent.id;
      });

    } catch (e) {
      console.error('Failed to create EventSource:', e);
      setError('Failed to connect');
      setConnected(false);
    }
  }, [events.length, fetchStats]);

  /**
   * Manual reconnection
   */
  const reconnect = useCallback(() => {
    connect();
  }, [connect]);

  /**
   * Connect on mount
   */
  useEffect(() => {
    connect();

    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  /**
   * Periodically fetch stats
   */
  useEffect(() => {
    if (connected) {
      const interval = setInterval(fetchStats, 5000); // Every 5s
      return () => clearInterval(interval);
    }
  }, [connected, fetchStats]);

  return {
    events,
    connected,
    error,
    reconnect,
    stats
  };
}

/**
 * Utility hook to subscribe to specific event types
 */
export function useEventStreamType<T = unknown>(
  eventType: StreamEvent['type']
): { events: Array<StreamEvent & { data: T }>; connected: boolean } {
  const { events, connected } = useEventStream();

  const filteredEvents = events
    .filter(e => e.type === eventType)
    .map(e => ({ ...e, data: e.data as T }));

  return {
    events: filteredEvents,
    connected
  };
}
