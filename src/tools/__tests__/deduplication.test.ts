/**
 * Memory Deduplication Tests
 */

import { describe, it, expect } from 'vitest';
import { TextSimilarityCalculator, SimilarityDeduplicator, MemoryDeduplicator } from '../deduplication.ts';

describe('TextSimilarityCalculator', () => {
  const calc = new TextSimilarityCalculator();

  it('should calculate Jaccard similarity for identical strings', () => {
    const result = calc.jaccardSimilarity('hello world', 'hello world');
    expect(result).toBe(1.0);
  });

  it('should calculate Jaccard similarity for similar strings', () => {
    const result = calc.jaccardSimilarity('hello world', 'hello there');
    expect(result).toBeGreaterThan(0.3);
  });

  it('should calculate Jaccard similarity for different strings', () => {
    const result = calc.jaccardSimilarity('hello world', 'foo bar baz');
    expect(result).toBeLessThan(0.3);
  });

  it('should handle empty strings', () => {
    const result = calc.jaccardSimilarity('', '');
    expect(result).toBe(1.0);
  });

  it('should calculate combined similarity', () => {
    const result = calc.combinedSimilarity('test pattern here', 'test pattern there');
    expect(result).toBeGreaterThan(0.5);
  });
});

describe('SimilarityDeduplicator', () => {
  const dedup = new SimilarityDeduplicator();

  it('should find no similar learnings when none exist', () => {
    const result = dedup.findSimilar('new unique pattern', []);
    expect(result).toHaveLength(0);
  });

  it('should find similar learnings', () => {
    const existing = [
      {
        id: '1',
        sourceFile: 'test.md',
        content: 'Observer pattern prevents memory explosion in autonomous agents'
      }
    ];

    const result = dedup.findSimilar('Observer pattern prevents memory explosion in autonomous agents', existing);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].similarity).toBeGreaterThan(0.8);
  });

  it('should decide ADD for unique patterns', () => {
    const result = dedup.decideOperationSimilarity('completely unique pattern here', []);
    expect(result.decision).toBe('ADD');
  });

  it('should decide SKIP for exact matches', () => {
    const existing = [
      { id: '1', sourceFile: 'test.md', content: 'Observer pattern prevents memory explosion' }
    ];

    const result = dedup.decideOperationSimilarity(
      'Observer pattern prevents memory explosion',
      [{ learning: existing[0], similarity: 1.0 }]
    );

    expect(result.decision).toBe('SKIP');
    expect(result.reasoning).toContain('Exact match');
  });
});

describe('MemoryDeduplicator', () => {
  it('should create instance', () => {
    const dedup = new MemoryDeduplicator();
    expect(dedup).toBeDefined();
  });

  it('should return stats', () => {
    const dedup = new MemoryDeduplicator();
    const stats = dedup.getStats();

    expect(stats.similarityThreshold).toBe(0.85);
    expect(stats.exactMatchThreshold).toBe(0.95);
  });
});
