/**
 * Virtual Office Tasks Handler
 *
 * Returns VO tasks from JSON file for dynamic task management
 */

import fs from 'fs';
import path from 'path';

const VO_TASKS_PATH = '/Users/jodunk/Documents/Project/volt-oracle/psi/memory/shared/vo-tasks.json';

export interface VOTask {
  id: string;
  agent: string;
  task: string;
  status: string;
  deadline: string;
  priority: 'critical' | 'medium' | 'low' | 'done' | 'progress';
}

export interface VOTasksResponse {
  updated_at: string;
  tasks: VOTask[];
}

/**
 * Load VO tasks from JSON file
 */
export function handleVOTasks(): VOTasksResponse {
  try {
    // Read JSON file
    const content = fs.readFileSync(VO_TASKS_PATH, 'utf-8');
    const data = JSON.parse(content) as VOTasksResponse;

    return data;
  } catch (error) {
    console.error('Failed to load VO tasks:', error);

    // Return empty structure on error
    return {
      updated_at: new Date().toISOString(),
      tasks: []
    };
  }
}

/**
 * Update VO tasks (write to JSON file)
 */
export function handleVOTasksUpdate(tasks: VOTask[]): VOTasksResponse {
  try {
    const data: VOTasksResponse = {
      updated_at: new Date().toISOString(),
      tasks
    };

    // Write to JSON file
    fs.writeFileSync(VO_TASKS_PATH, JSON.stringify(data, null, 2), 'utf-8');

    return data;
  } catch (error) {
    console.error('Failed to update VO tasks:', error);
    throw error;
  }
}
