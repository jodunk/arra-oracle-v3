/**
 * Event Sourcing Type Definitions
 *
 * Core types for event sourcing implementation.
 * Based on event sourcing patterns from OpenClaw Studio.
 */

/**
 * Base event interface
 */
export interface Event {
  id: string;
  type: EventType;
  data: EventData;
  metadata: EventMetadata;
  timestamp: number;
}

/**
 * Event types - discriminated union
 */
export type EventType =
  | 'LEARNING_CREATED'
  | 'LEARNING_UPDATED'
  | 'LEARNING_DELETED'
  | 'RETROSPECTIVE_CREATED'
  | 'RETROSPECTIVE_UPDATED'
  | 'SESSION_STARTED'
  | 'SESSION_ENDED'
  | 'PATTERN_DISCOVERED'
  | 'PRINCIPLE_RECORDED'
  | 'SUPERSERSION_LOGGED'
  | 'THREAD_CREATED'
  | 'THREAD_MESSAGE_ADDED'
  | 'THREAD_UPDATED'
  | 'SCHEDULE_ADDED'
  | 'SCHEDULE_UPDATED'
  | 'TRACE_CREATED'
  | 'PROJECTION_UPDATED';

/**
 * Event data - discriminated by type
 */
export type EventData =
  | LearningCreatedData
  | LearningUpdatedData
  | LearningDeletedData
  | RetrospectiveCreatedData
  | RetrospectiveUpdatedData
  | SessionStartedData
  | SessionEndedData
  | PatternDiscoveredData
  | PrincipleRecordedData
  | SupersessionLoggedData
  | ThreadCreatedData
  | ThreadMessageAddedData
  | ThreadUpdatedData
  | ScheduleAddedData
  | ScheduleUpdatedData
  | TraceCreatedData
  | ProjectionUpdatedData;

/**
 * Event metadata
 */
export interface EventMetadata {
  agentId?: string;
  userId?: string;
  correlationId?: string;
  causationId?: string;
  [key: string]: string | number | boolean | undefined;
}

// ============================================================================
// Learning Events
// ============================================================================

export interface LearningCreatedData {
  id: string;
  pattern: string;
  concepts: string[];
  source?: string;
  project?: string;
}

export interface LearningUpdatedData {
  id: string;
  pattern?: string;
  concepts?: string[];
  previousPattern?: string;
  previousConcepts?: string[];
}

export interface LearningDeletedData {
  id: string;
  reason?: string;
}

// ============================================================================
// Retrospective Events
// ============================================================================

export interface RetrospectiveCreatedData {
  id: string;
  content: string;
  sessionId: string;
  tasks?: string[];
  lessons?: string[];
}

export interface RetrospectiveUpdatedData {
  id: string;
  content?: string;
  tasks?: string[];
  lessons?: string[];
}

// ============================================================================
// Session Events
// ============================================================================

export interface SessionStartedData {
  sessionId: string;
  agentId: string;
  startTime: number;
  goal?: string;
}

export interface SessionEndedData {
  sessionId: string;
  endTime: number;
  duration: number;
  tasksCompleted: number;
}

// ============================================================================
// Pattern & Principle Events
// ============================================================================

export interface PatternDiscoveredData {
  pattern: string;
  category: 'principle' | 'pattern' | 'learning' | 'retro';
  context?: string;
  source?: string;
}

export interface PrincipleRecordedData {
  principle: string;
  category: string;
  context?: string;
}

// ============================================================================
// Supersession Events
// ============================================================================

export interface SupersessionLoggedData {
  oldId: string;
  newId: string;
  reason?: string;
}

// ============================================================================
// Thread Events
// ============================================================================

export interface ThreadCreatedData {
  threadId: number;
  title: string;
  initialMessage: string;
}

export interface ThreadMessageAddedData {
  threadId: number;
  messageId: number;
  role: 'user' | 'assistant';
  content: string;
}

export interface ThreadUpdatedData {
  threadId: number;
  status: 'active' | 'closed' | 'answered' | 'pending';
}

// ============================================================================
// Schedule Events
// ============================================================================

export interface ScheduleAddedData {
  date: string;
  event: string;
  time?: string;
  notes?: string;
  recurring?: 'daily' | 'weekly' | 'monthly';
}

export interface ScheduleUpdatedData {
  date: string;
  event: string;
  previousEvent?: string;
}

// ============================================================================
// Trace Events
// ============================================================================

export interface TraceCreatedData {
  traceId: string;
  query: string;
  queryType: 'general' | 'project' | 'pattern';
  foundFiles?: number;
  foundCommits?: number;
  foundIssues?: number;
}

// ============================================================================
// Projection Events
// ============================================================================

export interface ProjectionUpdatedData {
  projectionName: string;
  lastEventId: string;
  state: Record<string, unknown>;
}

// ============================================================================
// Type Guards
// ============================================================================

export function isLearningCreated(data: EventData): data is LearningCreatedData {
  return data && typeof data === 'object' && 'id' in data && 'pattern' in data && 'concepts' in data;
}

export function isRetrospectiveCreated(data: EventData): data is RetrospectiveCreatedData {
  return data && typeof data === 'object' && 'id' in data && 'content' in data && 'sessionId' in data;
}

export function isSessionStarted(data: EventData): data is SessionStartedData {
  return data && typeof data === 'object' && 'sessionId' in data && 'agentId' in data && 'startTime' in data;
}

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Projection state
 */
export interface Projection<T = Record<string, unknown>> {
  name: string;
  lastEventId: string;
  state: T;
  updatedAt: number;
}

/**
 * Event store query options
 */
export interface EventQuery {
  sinceId?: string;
  untilId?: string;
  types?: EventType[];
  limit?: number;
  agentId?: string;
  project?: string;
}

/**
 * Event replay options
 */
export interface ReplayOptions {
  fromId?: string;
  toId?: string;
  snapshot?: boolean;
}
