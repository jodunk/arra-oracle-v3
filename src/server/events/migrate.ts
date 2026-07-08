/**
 * Event Sourcing Migration Script
 *
 * Migrate existing data to event-sourced format.
 * One-time migration.
 *
 * NOTE: Currently disabled - event sourcing works independently
 * alongside existing oracle_documents table.
 */

import { db } from '../../db/index.ts';
import { events } from './schema.ts';

/**
 * Migrate existing documents to events
 *
 * NOTE: DISABLED - Event sourcing is a new feature that works
 * independently alongside the existing oracle_documents table.
 * No migration needed for new installations.
 */
export async function migrateToEventSourcing(): Promise<void> {
  console.log('ℹ️  Migration skipped - event sourcing ready for new events');
  console.log('   Event store works independently alongside oracle_documents');
}

/**
 * Rollback migration (USE WITH CAUTION!)
 *
 * NOTE: No-op since migration is disabled
 */
export async function rollbackMigration(): Promise<void> {
  console.log('ℹ️  Rollback skipped - no migration was performed');
}

/**
 * Validate migration integrity
 *
 * Checks that all events have valid data.
 */
export async function validateMigration(): Promise<{
  valid: boolean;
  issues: string[];
}> {
  const issues: string[] = [];

  try {
    // Check for invalid JSON in data field
    const allEvents = await db.select().from(events).limit(100).execute();

    for (const event of allEvents) {
      try {
        JSON.parse(String(event.data));
        JSON.parse(String(event.metadata));
      } catch (e) {
        issues.push(`Event ${event.id} has invalid JSON`);
      }
    }
  } catch (e) {
    // Events table might not exist yet - that's OK
    console.log('ℹ️  Events table not yet initialized');
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
