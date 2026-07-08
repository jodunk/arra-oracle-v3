/**
 * Stats Projection
 *
 * Tracks statistics and metrics.
 * Built from events.
 */

import type { ProjectionHandler } from '../projection-manager.ts';
import type { Event } from '../types.ts';

export interface StatsState {
  totalEvents: number;
  eventsByType: Record<string, number>;
  totalLearnings: number;
  totalRetrospectives: number;
  totalPatterns: number;
  activeSessions: number;
  lastActivity: number;
  dailyActivity: DailyActivity;
}

export interface DailyActivity {
  date: string; // YYYY-MM-DD
  learnings: number;
  retrospectives: number;
  patterns: number;
  sessions: number;
}

/**
 * Stats Projection Handler
 */
export const statsProjection: ProjectionHandler<StatsState> = {
  name: 'stats',

  initialState(): StatsState {
    const today = new Date().toISOString().split('T')[0];
    return {
      totalEvents: 0,
      eventsByType: {},
      totalLearnings: 0,
      totalRetrospectives: 0,
      totalPatterns: 0,
      activeSessions: 0,
      lastActivity: Date.now(),
      dailyActivity: {
        date: today,
        learnings: 0,
        retrospectives: 0,
        patterns: 0,
        sessions: 0,
      },
    };
  },

  apply(event: Event, currentState: StatsState): StatsState {
    const newState = { ...currentState };

    // Increment total events
    newState.totalEvents = currentState.totalEvents + 1;

    // Track by type
    newState.eventsByType = { ...currentState.eventsByType };
    newState.eventsByType[event.type] = (currentState.eventsByType[event.type] || 0) + 1;

    // Update last activity
    newState.lastActivity = event.timestamp;

    // Update daily activity
    const eventDate = new Date(event.timestamp).toISOString().split('T')[0];
    if (eventDate !== currentState.dailyActivity.date) {
      // New day - reset or could archive old data
      newState.dailyActivity = {
        date: eventDate,
        learnings: 0,
        retrospectives: 0,
        patterns: 0,
        sessions: 0,
      };
    }

    // Update specific counters
    switch (event.type) {
      case 'LEARNING_CREATED':
        newState.totalLearnings = currentState.totalLearnings + 1;
        newState.dailyActivity.learnings = currentState.dailyActivity.learnings + 1;
        break;

      case 'RETROSPECTIVE_CREATED':
        newState.totalRetrospectives = currentState.totalRetrospectives + 1;
        newState.dailyActivity.retrospectives = currentState.dailyActivity.retrospectives + 1;
        break;

      case 'PATTERN_DISCOVERED':
        newState.totalPatterns = currentState.totalPatterns + 1;
        newState.dailyActivity.patterns = currentState.dailyActivity.patterns + 1;
        break;

      case 'SESSION_STARTED':
        newState.activeSessions = currentState.activeSessions + 1;
        newState.dailyActivity.sessions = currentState.dailyActivity.sessions + 1;
        break;

      case 'SESSION_ENDED':
        newState.activeSessions = Math.max(0, currentState.activeSessions - 1);
        break;
    }

    return newState;
  },
};
