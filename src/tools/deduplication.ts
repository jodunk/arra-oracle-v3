/**
 * Memory Deduplication System (mem0-inspired)
 * Prevents duplicate learnings in Oracle knowledge base
 *
 * Port of ψ/lib/memory_deduplication.py to TypeScript
 */

import type { ToolContext } from './types.ts';

// ============================================================================
// Configuration
// ============================================================================

interface DedupConfig {
  SEMANTIC_SIMILARITY_THRESHOLD: number;  // 0.85 = 85% similar
  EXACT_MATCH_THRESHOLD: number;         // 0.95 = 95% similar
  USE_LLM_DECISION?: boolean;             // Use LLM for semantic decisions (P2.2)
  LLM_MODEL?: string;                     // Claude model for decisions
}

const DEFAULT_CONFIG: DedupConfig = {
  SEMANTIC_SIMILARITY_THRESHOLD: 0.85,
  EXACT_MATCH_THRESHOLD: 0.95,
  USE_LLM_DECISION: false,  // Disabled by default (opt-in)
  LLM_MODEL: 'claude-sonnet-4-6'  // Fast model for decisions
};

// ============================================================================
// Decision Types (mem0 pattern)
// ============================================================================

export type DedupDecision = 'ADD' | 'UPDATE' | 'SKIP' | 'ENHANCE';

export interface DedupResult {
  decision: DedupDecision;
  reasoning: string;
  similarLearning?: {
    id: string;
    sourceFile: string;
    similarity: number;
  };
}

// ============================================================================
// Text Similarity Calculator
// ============================================================================

export class TextSimilarityCalculator {
  /**
   * Calculate Jaccard similarity (word overlap)
   */
  jaccardSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    if (words1.size === 0 && words2.size === 0) return 1.0;
    if (words1.size === 0 || words2.size === 0) return 0.0;

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return union.size === 0 ? 0.0 : intersection.size / union.size;
  }

  /**
   * Calculate Levenshtein distance ratio
   */
  levenshteinRatio(text1: string, text2: string): number {
    if (text1 === text2) return 1.0;

    const len1 = text1.length;
    const len2 = text2.length;

    if (len1 === 0 || len2 === 0) return 0.0;

    // Use simple ratio based on length difference and character matches
    const maxLen = Math.max(len1, len2);
    const minLen = Math.min(len1, len2);
    const lengthRatio = minLen / maxLen;

    // Count matching characters in sequence
    let matches = 0;
    const limit = Math.min(len1, len2);
    for (let i = 0; i < limit; i++) {
      if (text1[i] === text2[i]) matches++;
    }

    return (matches / maxLen) * lengthRatio;
  }

  /**
   * Combine multiple similarity metrics
   */
  combinedSimilarity(text1: string, text2: string): number {
    const jaccard = this.jaccardSimilarity(text1, text2);
    const levenshtein = this.levenshteinRatio(text1, text2);

    // Weighted average (Jaccard 30%, Levenshtein 70%)
    return jaccard * 0.3 + levenshtein * 0.7;
  }
}

// ============================================================================
// Similarity-based Deduplication
// ============================================================================

interface ExistingLearning {
  id: string;
  sourceFile: string;
  content: string;
  concepts?: string;
}

interface SimilarLearning {
  learning: ExistingLearning;
  similarity: number;
}

export class SimilarityDeduplicator {
  private config: DedupConfig;
  private similarityCalc: TextSimilarityCalculator;

  constructor(config: DedupConfig = DEFAULT_CONFIG) {
    this.config = config;
    this.similarityCalc = new TextSimilarityCalculator();
  }

  /**
   * Find learnings similar to new content
   */
  findSimilar(
    newContent: string,
    existingLearnings: ExistingLearning[],
    threshold?: number
  ): SimilarLearning[] {
    const thresh = threshold ?? this.config.SEMANTIC_SIMILARITY_THRESHOLD;
    const similar: SimilarLearning[] = [];

    for (const learning of existingLearnings) {
      const similarity = this.similarityCalc.combinedSimilarity(newContent, learning.content);

      if (similarity >= thresh) {
        similar.push({ learning, similarity });
      }
    }

    // Sort by similarity (highest first)
    similar.sort((a, b) => b.similarity - a.similarity);

    return similar;
  }

  /**
   * Decide operation based on similarity scores (fallback method)
   */
  decideOperationSimilarity(
    newContent: string,
    similarLearnings: SimilarLearning[]
  ): { decision: DedupDecision; reasoning: string } {
    if (similarLearnings.length === 0) {
      return {
        decision: 'ADD',
        reasoning: 'No similar learnings found'
      };
    }

    const bestMatch = similarLearnings[0];
    const { learning, similarity } = bestMatch;

    // Check for exact match
    if (similarity >= this.config.EXACT_MATCH_THRESHOLD) {
      return {
        decision: 'SKIP',
        reasoning: `Exact match found (${(similarity * 100).toFixed(0)}% similar)`
      };
    }

    // Check for high similarity
    if (similarity >= this.config.SEMANTIC_SIMILARITY_THRESHOLD) {
      const contentLength = newContent.length;
      const existingLength = learning.content.length;

      if (contentLength > existingLength * 1.5) {
        return {
          decision: 'ENHANCE',
          reasoning: `New learning enhances existing (${(similarity * 100).toFixed(0)}% similar)`
        };
      } else if (Math.abs(contentLength - existingLength) / existingLength < 0.2) {
        return {
          decision: 'UPDATE',
          reasoning: `Similar size, likely update (${(similarity * 100).toFixed(0)}% similar)`
        };
      } else {
        return {
          decision: 'SKIP',
          reasoning: `Too similar, no new info (${(similarity * 100).toFixed(0)}% similar)`
        };
      }
    }

    return {
      decision: 'ADD',
      reasoning: 'No sufficiently similar learnings'
    };
  }
}

// ============================================================================
// LLM-based Decision (P2.2: mem0 pattern)
// ============================================================================

/**
 * LLM-based memory decision using Claude API
 * Provides semantic understanding beyond text similarity
 */
export class LLMMemoryDecision {
  private enabled: boolean;
  private client: any;  // Anthropic client (lazy loaded)
  private model: string;

  constructor(config: DedupConfig) {
    this.model = config.LLM_MODEL || 'claude-sonnet-4-6';
    this.enabled = config.USE_LLM_DECISION || false;

    if (this.enabled) {
      try {
        // Lazy import to avoid errors if Anthropic SDK not installed
        const anthropic = require('@anthropic-ai/sdk');
        this.client = new anthropic.Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY
        });
        console.error('[LLMDecision] Enabled with model:', this.model);
      } catch (error) {
        console.error('[LLMDecision] Failed to initialize Anthropic client:', error);
        this.enabled = false;
      }
    } else {
      console.error('[LLMDecision] Disabled (USE_LLM_DECISION=false)');
    }
  }

  /**
   * Decide operation using LLM semantic understanding
   *
   * Returns: { decision: DedupDecision, reasoning: string, llm_used: boolean }
   */
  async decideOperation(
    newContent: string,
    existingContent: string,
    metadata: { tags?: string[]; [key: string]: any }
  ): Promise<{ decision: DedupDecision; reasoning: string; llm_used: boolean }> {
    // Fallback to similarity if LLM disabled
    if (!this.enabled) {
      return {
        decision: 'ADD',
        reasoning: 'LLM decision disabled',
        llm_used: false
      };
    }

    try {
      const prompt = `You are a memory deduplication assistant. Compare two learnings and decide what to do.

EXISTING LEARNING:
---
${existingContent.substring(0, 1000)}
---

NEW LEARNING:
---
${newContent.substring(0, 1000)}
---

DECISION OPTIONS:
- ADD: New learning is unique, add it to knowledge base
- UPDATE: New learning updates/enhances existing learning, merge them
- SKIP: New learning is too similar, don't add
- ENHANCE: New learning adds complementary info, add as enhancement

METADATA:
- Existing: ${metadata.tags?.join(', ') || 'none'}
- New: ${metadata.tags?.join(', ') || 'none'}

Respond in format:
DECISION: [ADD/UPDATE/SKIP/ENHANCE]
REASONING: [1-2 sentences explaining why]

IMPORTANT:
- Prefer consolidation over duplication
- If content is 85%+ similar, SKIP or UPDATE
- If content adds new perspective, UPDATE or ENHANCE
- If content is orthogonal (different topic), ADD
- Be concise in reasoning (max 2 sentences)`;

      const startTime = Date.now();
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 200,
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }]
      });

      const responseTime = Date.now() - startTime;
      const responseText = response.content[0].text;

      // Parse response
      let decision: DedupDecision = 'ADD';
      let reasoning = 'Default to ADD (parsing failed)';

      for (const line of responseText.split('\n')) {
        const trimmed = line.trim();
        if (trimmed.startsWith('DECISION:')) {
          const decisionStr = trimmed.split(':', 2)[1]?.trim().toUpperCase();
          if (decisionStr && ['ADD', 'UPDATE', 'SKIP', 'ENHANCE'].includes(decisionStr)) {
            decision = decisionStr as DedupDecision;
          }
        } else if (trimmed.startsWith('REASONING:')) {
          reasoning = trimmed.split(':', 2)[1]?.trim() || 'No reasoning provided';
        }
      }

      console.error(`[LLMDecision] Decision: ${decision} (${responseTime}ms) - ${reasoning}`);

      return {
        decision,
        reasoning: `${reasoning} (LLM-based decision)`,
        llm_used: true
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[LLMDecision] LLM call failed:', errorMsg);

      // Fallback to ADD on error
      return {
        decision: 'ADD',
        reasoning: `LLM error: ${errorMsg.substring(0, 100)}`,
        llm_used: false
      };
    }
  }
}

// ============================================================================
// Main Deduplication System
// ============================================================================

export class MemoryDeduplicator {
  private config: DedupConfig;
  private deduplicator: SimilarityDeduplicator;
  private llmDecision: LLMMemoryDecision | null;
  private metricsPath: string;
  private startTime: number = 0;

  constructor(config?: Partial<DedupConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.deduplicator = new SimilarityDeduplicator(this.config);

    // Initialize LLM decision (if enabled)
    this.llmDecision = this.config.USE_LLM_DECISION
      ? new LLMMemoryDecision(this.config)
      : null;
    // Metrics path in Oracle project
    this.metricsPath = '/Users/jodunk/Documents/Project/volt-oracle/ψ/tmp/dedup_metrics.jsonl';

    // Ensure metrics directory exists
    this.ensureMetricsDir();
  }

  private ensureMetricsDir() {
    try {
      const fs = require('fs');
      const path = require('path');
      const dir = path.dirname(this.metricsPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch (error) {
      // Non-fatal: metrics logging is optional
      console.error('[Dedup] Could not create metrics directory:', error);
    }
  }

  private logMetric(decision: DedupDecision, reasoning: string, similarity?: number, llmUsed: boolean = false) {
    try {
      const fs = require('fs');

      const metric = {
        timestamp: new Date().toISOString(),
        decision,
        reasoning,
        similarity: similarity?.toFixed(4),
        decisionTimeMs: Date.now() - this.startTime,
        llmUsed  // Track LLM vs vector decision
      };

      fs.appendFileSync(this.metricsPath, JSON.stringify(metric) + '\n');
    } catch (error) {
      // Non-fatal: don't fail deduplication if metrics fail
      console.error('[Dedup] Could not write metric:', error);
    }
  }

  /**
   * Check if new learning duplicates existing
   *
   * Returns: Promise<DedupResult>
   */
  async checkDuplicates(
    ctx: ToolContext,
    newPattern: string
  ): Promise<DedupResult> {
    this.startTime = Date.now();
    const newContent = newPattern.substring(0, 1000); // Use first 1000 chars for comparison

    try {
      // Use ChromaDB vector search instead of FTS (mem0 pattern)
      await ctx.vectorStore.ensureCollection();

      // ChromaDB API: query(queryText, limit, whereFilter)
      const queryResults = await ctx.vectorStore.query(
        newPattern,
        10,
        { type: 'learning' }
      );

      if (!queryResults || queryResults.ids.length === 0) {
        this.logMetric('ADD', 'No similar learnings found');
        return {
          decision: 'ADD',
          reasoning: 'No similar learnings found'
        };
      }

      // Convert ChromaDB results to existing learnings format
      const existingLearnings: ExistingLearning[] = [];
      const similarities: number[] = [];

      for (let i = 0; i < queryResults.ids.length; i++) {
        const id = queryResults.ids[i];
        const document = queryResults.documents[i];
        const metadata = queryResults.metadatas[i];
        const distance = queryResults.distances?.[i];

        if (!id || !metadata) continue;

        // Convert ChromaDB distance to similarity (ChromaDB uses L2 distance)
        // L2 distance: 0 = identical, higher = more different
        // Similarity: 1.0 = identical, 0.0 = completely different
        const similarity = distance !== undefined ? Math.max(0, 1 - distance) : 0.5;

        existingLearnings.push({
          id,
          sourceFile: (metadata.source_file as string) || '',
          content: document.substring(0, 1000),
          concepts: metadata.concepts as string
        });

        similarities.push(similarity);
      }

      if (existingLearnings.length === 0) {
        this.logMetric('ADD', 'No similar learnings found');
        return {
          decision: 'ADD',
          reasoning: 'No similar learnings found'
        };
      }

      // Find best match (highest similarity from vector search)
      const bestIdx = similarities.indexOf(Math.max(...similarities));
      const bestSimilarity = similarities[bestIdx];
      const bestLearning = existingLearnings[bestIdx];

      // ============================================================================
      // LLM-based Decision (P2.2: mem0 pattern) - When enabled
      // ============================================================================

      let decision: DedupDecision;
      let reasoning: string;
      let llmUsed = false;

      // Use LLM for semantic decision if:
      // 1. LLM decision is enabled
      // 2. We have a best match (similarity > threshold)
      // 3. Not an exact match (LLM would be redundant)
      if (this.llmDecision &&
          bestSimilarity >= this.config.SEMANTIC_SIMILARITY_THRESHOLD &&
          bestSimilarity < this.config.EXACT_MATCH_THRESHOLD) {

        console.error(`[Dedup] Using LLM-based decision (similarity: ${(bestSimilarity * 100).toFixed(0)}%)`);

        const llmResult = await this.llmDecision.decideOperation(
          newPattern,
          bestLearning.content,
          { tags: bestLearning.concepts?.split(', ') }
        );

        decision = llmResult.decision;
        reasoning = llmResult.reasoning;
        llmUsed = llmResult.llm_used;

      } else {
        // Fallback to vector similarity decision
        if (bestSimilarity >= this.config.EXACT_MATCH_THRESHOLD) {
          decision = 'SKIP';
          reasoning = `Exact match found (${(bestSimilarity * 100).toFixed(0)}% similar via vector search)`;
        } else if (bestSimilarity >= this.config.SEMANTIC_SIMILARITY_THRESHOLD) {
          const newLength = newPattern.length;
          const existingLength = bestLearning.content.length;

          if (newLength > existingLength * 1.5) {
            decision = 'ENHANCE';
            reasoning = `New learning enhances existing (${(bestSimilarity * 100).toFixed(0)}% similar)`;
          } else if (Math.abs(newLength - existingLength) / existingLength < 0.2) {
            decision = 'UPDATE';
            reasoning = `Similar size, likely update (${(bestSimilarity * 100).toFixed(0)}% similar)`;
          } else {
            decision = 'SKIP';
            reasoning = `Too similar (${(bestSimilarity * 100).toFixed(0)}% similar)`;
          }
        } else {
          decision = 'ADD';
          reasoning = 'No sufficiently similar learnings';
        }
      }

      // Log metric (with LLM usage flag)
      this.logMetric(decision, reasoning, bestSimilarity, llmUsed);

      return {
        decision,
        reasoning,
        similarLearning: {
          id: bestLearning.id,
          sourceFile: bestLearning.sourceFile,
          similarity: bestSimilarity
        }
      };

    } catch (error) {
      // Fallback to text similarity if vector search fails
      console.error(`[Dedup] Vector search failed, falling back to text similarity: ${error}`);

      const newTitle = newPattern.split('\n')[0].substring(0, 200);

      // Query FTS as fallback
      const similarResults = ctx.sqlite.prepare(`
        SELECT id, source_file, concepts
        FROM oracle_fts
        WHERE oracle_fts MATCH ?
        ORDER BY rank
        LIMIT 10
      `).all(newTitle);

      if (!similarResults || similarResults.length === 0) {
        this.logMetric('ADD', 'No similar learnings found (fallback mode)');
        return {
          decision: 'ADD',
          reasoning: 'No similar learnings found (fallback mode)'
        };
      }

      // Get full content for similar learnings
      const existingLearnings: ExistingLearning[] = [];
      for (const row of similarResults as any[]) {
        try {
          const fs = await import('fs');
          const path = await import('path');

          const repoRoot = ctx.repoRoot;
          const filePath = path.join(repoRoot, row.source_file);

          if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            const patternMatch = content.match(/---\n[\s\S]*?\n---\n([\s\S]*)/);
            const pattern = patternMatch ? patternMatch[1].trim() : content;

            existingLearnings.push({
              id: row.id,
              sourceFile: row.source_file,
              content: pattern.substring(0, 1000),
              concepts: row.concepts
            });
          }
        } catch (err) {
          continue;
        }
      }

      if (existingLearnings.length === 0) {
        this.logMetric('ADD', 'No similar learnings found (fallback mode)');
        return {
          decision: 'ADD',
          reasoning: 'No similar learnings found (fallback mode)'
        };
      }

      // Use text similarity as fallback
      const similar = this.deduplicator.findSimilar(newContent, existingLearnings);

      if (similar.length === 0) {
        this.logMetric('ADD', 'No sufficiently similar learnings (fallback mode)');
        return {
          decision: 'ADD',
          reasoning: 'No sufficiently similar learnings (fallback mode)'
        };
      }

      const { decision, reasoning } = this.deduplicator.decideOperationSimilarity(
        newContent,
        similar
      );

      // Log metric (fallback mode)
      this.logMetric(decision, `${reasoning} (fallback mode)`, similar[0].similarity);

      return {
        decision,
        reasoning: `${reasoning} (fallback mode)`,
        similarLearning: {
          id: similar[0].learning.id,
          sourceFile: similar[0].learning.sourceFile,
          similarity: similar[0].similarity
        }
      };
    }
  }

  /**
   * Get deduplication statistics
   */
  getStats(): {
    similarityThreshold: number;
    exactMatchThreshold: number;
  } {
    return {
      similarityThreshold: this.config.SEMANTIC_SIMILARITY_THRESHOLD,
      exactMatchThreshold: this.config.EXACT_MATCH_THRESHOLD
    };
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let dedupInstance: MemoryDeduplicator | null = null;

export function getDeduplicator(config?: Partial<DedupConfig>): MemoryDeduplicator {
  if (!dedupInstance) {
    dedupInstance = new MemoryDeduplicator(config);
  }
  return dedupInstance;
}
