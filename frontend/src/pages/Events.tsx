import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import styles from './Events.module.css';

interface Event {
  id: string;
  type: string;
  data: any;
  metadata: any;
  timestamp: Date;
}

interface Projection {
  name: string;
  lastEventId: string;
  state: any;
  updatedAt: Date;
}

interface EventStats {
  totalEvents: number;
  eventsByType: Record<string, number>;
  latestEventId: string;
}

const EVENT_TYPES = ['all', 'LEARNING_CREATED', 'LEARNING_UPDATED', 'RETROSPECTIVE_CREATED', 'RETROSPECTIVE_UPDATED', 'PATTERN_DISCOVERED', 'SUPERSERSION_LOGGED', 'SESSION_STARTED', 'SESSION_ENDED'] as const;
type EventType = typeof EVENT_TYPES[number];

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function getEventIcon(eventType: string): string {
  switch (eventType) {
    case 'LEARNING_CREATED': return '💡';
    case 'LEARNING_UPDATED': return '🔄';
    case 'RETROSPECTIVE_CREATED': return '📝';
    case 'RETROSPECTIVE_UPDATED': return '📝';
    case 'PATTERN_DISCOVERED': return '🔍';
    case 'SUPERSERSION_LOGGED': return '🔄';
    case 'SESSION_STARTED': return '🟢';
    case 'SESSION_ENDED': return '⏹️';
    default: return '✨';
  }
}

function getEventColor(eventType: string): string {
  switch (eventType) {
    case 'LEARNING_CREATED': return '#10b981';
    case 'LEARNING_UPDATED': return '#f59e0b';
    case 'RETROSPECTIVE_CREATED': return '#3b82f6';
    case 'RETROSPECTIVE_UPDATED': return '#6366f1';
    case 'PATTERN_DISCOVERED': return '#8b5cf6';
    case 'SUPERSERSION_LOGGED': return '#ef4444';
    case 'SESSION_STARTED': return '#22c55e';
    case 'SESSION_ENDED': return '#6b7280';
    default: return '#64748b';
  }
}

export default function Events() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [projections, setProjections] = useState<Projection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'events' | 'projections' | 'stats'>('events');

  // URL-persisted filters
  const eventType = (searchParams.get('type') as EventType) || 'all';

  function setEventType(type: EventType) {
    setSearchParams(prev => {
      const params = new URLSearchParams(prev);
      if (type === 'all') {
        params.delete('type');
      } else {
        params.set('type', type);
      }
      return params;
    });
  }

  useEffect(() => {
    loadData();
  }, [eventType, selectedTab]);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      if (selectedTab === 'stats') {
        await loadStats();
      } else if (selectedTab === 'projections') {
        await loadProjections();
      } else {
        await loadEvents();
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadEvents() {
    const params = new URLSearchParams();
    if (eventType !== 'all') {
      params.set('type', eventType);
    }
    params.set('limit', '50');

    const res = await fetch(`/api/events?${params}`);
    if (!res.ok) throw new Error('Failed to load events');

    const data = await res.json();
    const eventsData: Event[] = data.events || [];

    // Convert timestamps
    setEvents(eventsData.map(e => ({
      ...e,
      timestamp: new Date(e.timestamp)
    })));
  }

  async function loadStats() {
    const res = await fetch('/api/events/stats');
    if (!res.ok) throw new Error('Failed to load stats');

    const data: EventStats = await res.json();
    setStats(data);
  }

  async function loadProjections() {
    const res = await fetch('/api/projections');
    if (!res.ok) throw new Error('Failed to load projections');

    const data = await res.json();
    const projectionsData: Projection[] = data.projections || [];

    // Convert timestamps
    setProjections(projectionsData.map((p: any) => ({
      ...p,
      updatedAt: new Date(p.updatedAt)
    })));
  }

  if (loading && events.length === 0 && stats === null) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>🎯 Event Sourcing</h1>
        <p className={styles.subtitle}>
          Complete audit trail of Oracle knowledge changes
        </p>
      </header>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${selectedTab === 'events' ? styles.active : ''}`}
          onClick={() => setSelectedTab('events')}
        >
          📝 Events
        </button>
        <button
          type="button"
          className={`${styles.tab} ${selectedTab === 'projections' ? styles.active : ''}`}
          onClick={() => setSelectedTab('projections')}
        >
          🔄 Projections
        </button>
        <button
          type="button"
          className={`${styles.tab} ${selectedTab === 'stats' ? styles.active : ''}`}
          onClick={() => setSelectedTab('stats')}
        >
          📊 Stats
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className={styles.error}>
          <p>{error}</p>
          <button onClick={loadData} className={styles.retryBtn}>Retry</button>
        </div>
      )}

      {/* EVENTS TAB */}
      {selectedTab === 'events' && (
        <>
          {/* Filters */}
          <div className={styles.filters}>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Event Type</label>
              <div className={styles.filterButtons}>
                {EVENT_TYPES.map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setEventType(type)}
                    className={`${styles.filterBtn} ${eventType === type ? styles.active : ''}`}
                  >
                    {type === 'all' ? 'All' : type.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Events List */}
          <div className={styles.eventsList}>
            {events.length === 0 && !loading ? (
              <div className={styles.empty}>
                <p>No events found</p>
                <p className={styles.emptyHint}>
                  Events are created when learnings, patterns, or retrospectives are added
                </p>
              </div>
            ) : (
              events.map((event) => (
                <div key={event.id} className={styles.eventCard}>
                  <div className={styles.eventIcon} style={{ color: getEventColor(event.type) }}>
                    {getEventIcon(event.type)}
                  </div>
                  <div className={styles.eventContent}>
                    <div className={styles.eventHeader}>
                      <span className={styles.eventType}>{event.type.replace(/_/g, ' ')}</span>
                      <span className={styles.eventId}>{event.id.slice(0, 8)}...</span>
                      <span className={styles.eventTime}>{formatTimeAgo(event.timestamp)}</span>
                    </div>

                    {/* Event Data Preview */}
                    {event.data && (
                      <div className={styles.eventData}>
                        <details>
                          <summary style={{ cursor: 'pointer', color: '#666' }}>
                            Data Preview
                          </summary>
                          <pre style={{
                            background: '#f5f5f5',
                            padding: '8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            overflow: 'auto',
                            marginTop: '8px'
                          }}>
                            {JSON.stringify(event.data, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}

                    {/* Metadata */}
                    {event.metadata && (
                      <div className={styles.eventMeta}>
                        {event.metadata.agentId && (
                          <div className={styles.metaItem}>
                            <Avatar
                              name={event.metadata.agentId}
                              size={24}
                              variant="circle"
                            />
                            <span>{event.metadata.agentId}</span>
                          </div>
                        )}
                        {event.metadata.userId && (
                          <div className={styles.metaItem}>
                            <Avatar
                              name={event.metadata.userId}
                              size={24}
                              variant="circle"
                            />
                            <span>{event.metadata.userId}</span>
                          </div>
                        )}
                        {event.data.project && (
                          <span className={styles.metaItem}>📁 {event.data.project}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* PROJECTIONS TAB */}
      {selectedTab === 'projections' && (
        <div className={styles.projectionsList}>
          {projections.length === 0 && !loading ? (
            <div className={styles.empty}>
              <p>No projections found</p>
              <p className={styles.emptyHint}>
                Projections are read-optimized views built from events
              </p>
            </div>
          ) : (
            projections.map((projection) => (
              <div key={projection.name} className={styles.projectionCard}>
                <div className={styles.projectionHeader}>
                  <h3 className={styles.projectionName}>{projection.name}</h3>
                  <span className={styles.projectionTime}>
                    Updated {formatTimeAgo(projection.updatedAt)}
                  </span>
                </div>
                <div className={styles.projectionInfo}>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Last Event:</span>
                    <span className={styles.infoValue}>{projection.lastEventId?.slice(0, 8)}...</span>
                  </div>
                </div>
                <div className={styles.projectionState}>
                  <details>
                    <summary style={{ cursor: 'pointer' }}>State Preview</summary>
                    <pre style={{
                      background: '#f5f5f5',
                      padding: '12px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      overflow: 'auto',
                      maxHeight: '300px'
                    }}>
                      {JSON.stringify(projection.state, null, 2)}
                    </pre>
                  </details>
                </div>
                <div className={styles.projectionActions}>
                  <button
                    onClick={async () => {
                      await fetch(`/api/projections/${projection.name}/rebuild`, { method: 'POST' });
                      loadProjections();
                    }}
                    className={styles.actionBtn}
                  >
                    🔄 Rebuild
                  </button>
                  <button
                    onClick={async () => {
                      await fetch(`/api/projections/${projection.name}/snapshot`, { method: 'POST' });
                      loadProjections();
                    }}
                    className={styles.actionBtn}
                  >
                    📸 Snapshot
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* STATS TAB */}
      {selectedTab === 'stats' && stats && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.totalEvents.toLocaleString()}</div>
            <div className={styles.statLabel}>Total Events</div>
          </div>

          <div className={styles.statsByType}>
            <h3 className={styles.statsTitle}>Events by Type</h3>
            {Object.entries(stats.eventsByType).map(([type, count]) => (
              <div key={type} className={styles.typeStat}>
                <span className={styles.typeIcon} style={{ color: getEventColor(type) }}>
                  {getEventIcon(type)}
                </span>
                <span className={styles.typeName}>{type.replace(/_/g, ' ')}</span>
                <span className={styles.typeCount}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
