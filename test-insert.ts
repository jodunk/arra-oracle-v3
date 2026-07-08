import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import * as schema from './src/db/schema.ts';

const sqlite = new Database('/Users/jodunk/.oracle/oracle.db');
const db = drizzle(sqlite, { schema });

// Test the INSERT that learn.ts does
const testId = 'test_' + Date.now();
try {
  const result = db.insert(schema.oracleDocuments).values({
    id: testId,
    type: 'learning',
    sourceFile: 'test.md',
    concepts: '[]',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    indexedAt: Date.now(),
    origin: null,
    project: null,
    createdBy: 'test',
  }).run();

  console.log('SUCCESS:', result);
} catch (error) {
  console.error('ERROR:', error);
} finally {
  sqlite.close();
}
