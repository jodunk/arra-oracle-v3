import { useState, useEffect } from 'react';
import styles from './Tasks.module.css';

interface Task {
  id: string;
  agent: string;
  task: string;
  status: string;
  deadline: string;
  priority: 'critical' | 'medium' | 'low' | 'done' | 'progress';
}

interface VOTasksResponse {
  updated_at: string;
  tasks: Task[];
}

export function Tasks() {
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Fetch tasks from API
  useEffect(() => {
    async function fetchTasks() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/vo-tasks');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data: VOTasksResponse = await response.json();
        setTasks(data.tasks);
        setLastUpdated(data.updated_at);
      } catch (e) {
        console.error('Failed to load tasks:', e);
        setError(e instanceof Error ? e.message : 'Failed to load tasks');
        // Set empty array on error
        setTasks([]);
      } finally {
        setLoading(false);
      }
    }

    fetchTasks();

    // Refresh every 30 seconds
    const interval = setInterval(fetchTasks, 30000);
    return () => clearInterval(interval);
  }, []);

  // Show loading state
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>📋 Tasks</h1>
          <p className={styles.subtitle}>Loading tasks...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>📋 Tasks</h1>
          <p className={styles.subtitle} style={{ color: '#ef4444' }}>
            Error: {error}
          </p>
        </div>
      </div>
    );
  }

  const filteredTasks = tasks.filter(task => {
    if (filter === 'pending') {
      return task.priority === 'critical' || task.priority === 'medium' || task.priority === 'low' || task.priority === 'progress';
    }
    if (filter === 'completed') {
      return task.priority === 'done';
    }
    return true;
  });

  const criticalCount = tasks.filter(t => t.priority === 'critical').length;
  const mediumCount = tasks.filter(t => t.priority === 'medium').length;
  const lowCount = tasks.filter(t => t.priority === 'low').length;
  const progressCount = tasks.filter(t => t.priority === 'progress').length;
  const doneCount = tasks.filter(t => t.priority === 'done').length;

  const lastUpdatedDate = lastUpdated ? new Date(lastUpdated) : null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>📋 Tasks</h1>
        <p className={styles.subtitle}>
          Track Oracle tasks and progress • Monitoring Week: Day 3/7 (43% complete)
          {lastUpdatedDate && (
            <span style={{ marginLeft: '8px', opacity: 0.7 }}>
              • Last updated: {lastUpdatedDate.toLocaleTimeString()}
            </span>
          )}
        </p>
      </div>

      {/* Summary Cards */}
      <div className={styles.summaryGrid}>
        <div className={`${styles.summaryCard} ${styles.critical}`}>
          <div className={styles.summaryIcon}>🔴</div>
          <div className={styles.summaryInfo}>
            <div className={styles.summaryValue}>{criticalCount}</div>
            <div className={styles.summaryLabel}>Critical</div>
          </div>
        </div>

        <div className={`${styles.summaryCard} ${styles.medium}`}>
          <div className={styles.summaryIcon}>🟡</div>
          <div className={styles.summaryInfo}>
            <div className={styles.summaryValue}>{mediumCount}</div>
            <div className={styles.summaryLabel}>Medium</div>
          </div>
        </div>

        <div className={`${styles.summaryCard} ${styles.low}`}>
          <div className={styles.summaryIcon}>🟢</div>
          <div className={styles.summaryInfo}>
            <div className={styles.summaryValue}>{lowCount}</div>
            <div className={styles.summaryLabel}>Low</div>
          </div>
        </div>

        <div className={`${styles.summaryCard} ${styles.progress}`}>
          <div className={styles.summaryIcon}>🔄</div>
          <div className={styles.summaryInfo}>
            <div className={styles.summaryValue}>{progressCount}</div>
            <div className={styles.summaryLabel}>In Progress</div>
          </div>
        </div>

        <div className={`${styles.summaryCard} ${styles.done}`}>
          <div className={styles.summaryIcon}>✅</div>
          <div className={styles.summaryInfo}>
            <div className={styles.summaryValue}>{doneCount}</div>
            <div className={styles.summaryLabel}>Done</div>
          </div>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className={styles.filters}>
        <button
          className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({tasks.length})
        </button>
        <button
          className={`${styles.filterBtn} ${filter === 'pending' ? styles.active : ''}`}
          onClick={() => setFilter('pending')}
        >
          Pending ({tasks.length - doneCount})
        </button>
        <button
          className={`${styles.filterBtn} ${filter === 'completed' ? styles.active : ''}`}
          onClick={() => setFilter('completed')}
        >
          Completed ({doneCount})
        </button>
      </div>

      {/* Next Deadline Alert */}
      <div className={styles.alertBox}>
        <div className={styles.alertIcon}>⏰</div>
        <div className={styles.alertContent}>
          <div className={styles.alertTitle}>Next Critical Deadline</div>
          <div className={styles.alertText}>April 2, 2026 (5 days) - P1.3 Threshold Tuning</div>
        </div>
      </div>

      {/* Tasks List */}
      <div className={styles.tasksList}>
        {filteredTasks.map((task) => (
          <div
            key={task.id}
            className={`${styles.taskCard} ${styles[task.priority]}`}
          >
            <div className={styles.taskHeader}>
              <div className={styles.taskAgent}>{task.agent}</div>
              <div className={styles.taskId}>{task.id}</div>
            </div>

            <div className={styles.taskBody}>
              <div className={styles.taskTitle}>{task.task}</div>
              <div className={styles.taskMeta}>
                <span className={styles.taskStatus}>{task.status}</span>
                <span className={styles.taskDeadline}>{task.deadline}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <p className={styles.footerText}>
          📌 Auto-reminders sent to Discord: 9:00 AM & 6:00 PM daily
        </p>
        <p className={styles.footerText}>
          💡 Tasks updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
        </p>
      </div>
    </div>
  );
}
