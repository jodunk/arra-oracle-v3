/**
 * Event Stream Demo Component
 *
 * Shows real-time events from SSE stream.
 * Use this to test and visualize streaming functionality.
 */

import { useEventStream } from '../hooks/useEventStream';
import styles from './EventStreamDemo.module.css';

export function EventStreamDemo() {
  const { events, connected, error, reconnect, stats } = useEventStream();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>📡 Real-time Events</h2>
        <div className={styles.status}>
          <span className={`${styles.indicator} ${connected ? styles.connected : styles.disconnected}`} />
          <span>{connected ? 'Connected' : 'Disconnected'}</span>
          {!connected && (
            <button onClick={reconnect} className={styles.reconnectBtn}>
              Reconnect
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className={styles.error}>
          ⚠️ {error}
        </div>
      )}

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Connected Clients:</span>
          <span className={styles.statValue}>{stats.connectedClients}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Total Events:</span>
          <span className={styles.statValue}>{stats.totalEvents}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Session Events:</span>
          <span className={styles.statValue}>{events.length}</span>
        </div>
      </div>

      <div className={styles.eventsList}>
        {events.length === 0 ? (
          <div className={styles.empty}>
            Waiting for events...
            <br />
            <small>Try adding a learning or performing a search</small>
          </div>
        ) : (
          events.slice().reverse().map(event => (
            <div key={event.id} className={`${styles.event} ${styles[event.type]}`}>
              <div className={styles.eventHeader}>
                <span className={styles.eventType}>{event.type}</span>
                <span className={styles.eventTime}>
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <pre className={styles.eventData}>
                {JSON.stringify(event.data, null, 2)}
              </pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
