/**
 * Memory Projection
 *
 * Tracks all learnings, retrospectives, and related data.
 * Built from events.
 */

import type { ProjectionHandler } from '../projection-manager.ts';
import type { Event } from '../types.ts';

export interface MemoryState {
  learnings: Map<string, Learning>;
  retrospectives: Map<string, Retrospective>;
  patterns: Map<string, Pattern>;
  supersessions: SupersessionRegistry;
  lastUpdated: number;
}

export interface Learning {
  id: string;
  pattern: string;
  concepts: string[];
  source?: string;
  project?: string;
  createdAt: number;
  updatedAt?: number;
  deleted?: boolean;
}

export interface Retrospective {
  id: string;
  content: string;
  sessionId: string;
  tasks: string[];
  lessons: string[];
  createdAt: number;
  updatedAt?: number;
}

export interface Pattern {
  id: string;
  pattern: string;
  category: 'principle' | 'pattern' | 'learning' | 'retro';
  context?: string;
  source?: string;
  discoveredAt: number;
}

export interface SupersessionRegistry {
  [oldId: string]: string; // oldId -> newId mapping
}

/**
 * Memory Projection Handler
 */
export const memoryProjection: ProjectionHandler<MemoryState> = {
  name: 'memory',

  initialState(): MemoryState {
    return {
      learnings: new Map(),
      retrospectives: new Map(),
      patterns: new Map(),
      supersessions: {},
      lastUpdated: Date.now(),
    };
  },

  apply(event: Event, currentState: MemoryState): MemoryState {
    const newState = {
      ...currentState,
      lastUpdated: Date.now(),
    };

    switch (event.type) {
      case 'LEARNING_CREATED': {
        const data = event.data as import('../types.ts').LearningCreatedData;
        const learning: Learning = {
          id: data.id,
          pattern: data.pattern,
          concepts: data.concepts,
          source: data.source,
          project: data.project,
          createdAt: event.timestamp,
        };
        newState.learnings = new Map(currentState.learnings);
        newState.learnings.set(data.id, learning);
        break;
      }

      case 'LEARNING_UPDATED': {
        const data = event.data as import('../types.ts').LearningUpdatedData;
        const existing = currentState.learnings.get(data.id);
        if (existing) {
          const learning: Learning = {
            ...existing,
            ...(data.pattern && { pattern: data.pattern }),
            ...(data.concepts && { concepts: data.concepts }),
            updatedAt: event.timestamp,
          };
          newState.learnings = new Map(currentState.learnings);
          newState.learnings.set(data.id, learning);
        }
        break;
      }

      case 'LEARNING_DELETED': {
        const data = event.data as import('../types.ts').LearningDeletedData;
        const existing = currentState.learnings.get(data.id);
        if (existing) {
          const learning: Learning = {
            ...existing,
            deleted: true,
            updatedAt: event.timestamp,
          };
          newState.learnings = new Map(currentState.learnings);
          newState.learnings.set(data.id, learning);
        }
        break;
      }

      case 'RETROSPECTIVE_CREATED': {
        const data = event.data as import('../types.ts').RetrospectiveCreatedData;
        const retrospective: Retrospective = {
          id: data.id,
          content: data.content,
          sessionId: data.sessionId,
          tasks: data.tasks || [],
          lessons: data.lessons || [],
          createdAt: event.timestamp,
        };
        newState.retrospectives = new Map(currentState.retrospectives);
        newState.retrospectives.set(data.id, retrospective);
        break;
      }

      case 'RETROSPECTIVE_UPDATED': {
        const data = event.data as import('../types.ts').RetrospectiveUpdatedData;
        const existing = currentState.retrospectives.get(data.id);
        if (existing) {
          const retrospective: Retrospective = {
            ...existing,
            ...(data.content && { content: data.content }),
            ...(data.tasks && { tasks: data.tasks }),
            ...(data.lessons && { lessons: data.lessons }),
            updatedAt: event.timestamp,
          };
          newState.retrospectives = new Map(currentState.retrospectives);
          newState.retrospectives.set(data.id, retrospective);
        }
        break;
      }

      case 'PATTERN_DISCOVERED': {
        const data = event.data as import('../types.ts').PatternDiscoveredData;
        const patternId = `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const pattern: Pattern = {
          id: patternId,
          pattern: data.pattern,
          category: data.category,
          context: data.context,
          source: data.source,
          discoveredAt: event.timestamp,
        };
        newState.patterns = new Map(currentState.patterns);
        newState.patterns.set(patternId, pattern);
        break;
      }

      case 'SUPERSERSION_LOGGED': {
        const data = event.data as import('../types.ts').SupersessionLoggedData;
        newState.supersessions = {
          ...currentState.supersessions,
          [data.oldId]: data.newId,
        };
        break;
      }
    }

    return newState;
  },
};
