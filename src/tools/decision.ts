/**
 * Oracle Decision Journal Handler
 *
 * Track decisions with packet grounding for feedback loops.
 * Enables UCB1 bandit algorithm for exploration/exploitation balance.
 */

import { randomUUID } from 'node:crypto';
import { decisionJournal } from '../db/schema.ts';
import type { ToolContext, ToolResponse, OracleRecordDecisionInput, OracleUpdateOutcomeInput } from './types.ts';

// ============================================================================
// UCB1 Bandit Algorithm
// ============================================================================

/**
 * Calculate UCB1 score for a packet (exploration vs exploitation balance).
 *
 * UCB1 = avg_rating + 2 * sqrt(ln(total_trials) / n)
 *
 * where:
 * - avg_rating: average rating (0-5)
 * - total_trials: total number of decision entries
 * - n: number of times this packet was used
 *
 * High UCB1 = either high rating (exploitation) or low usage (exploration)
 */
export function calculateUCB1(
  avgRating: number | null,
  usedInDecisions: number,
  totalDecisions: number
): number {
  // If packet never used, prioritize exploration (maximum UCB1)
  if (usedInDecisions === 0) return Infinity;

  // If no ratings yet, use neutral rating
  const rating = avgRating ?? 2.5;

  // UCB1 formula: balance exploitation (rating) vs exploration (sqrt(ln(N)/n))
  const explorationBonus = 2 * Math.sqrt(Math.log(totalDecisions) / usedInDecisions);
  return rating + explorationBonus;
}

/**
 * Recommend top-k packets using UCB1 algorithm.
 * Balances exploitation (high-rated packets) vs exploration (under-explored packets).
 */
export function recommendPackets(
  packets: Array<{
    id: string;
    title: string;
    avgRating: number | null;
    usedInDecisions: number;
  }>,
  k: number = 5,
  totalDecisions: number = 100
): Array<typeof packets[0] & { ucb1Score: number }> {
  const scored = packets.map(p => ({
    ...p,
    ucb1Score: calculateUCB1(p.avgRating, p.usedInDecisions, totalDecisions)
  }));

  // Sort by UCB1 score descending
  scored.sort((a, b) => b.ucb1Score - a.ucb1Score);

  // Return top-k
  return scored.slice(0, k);
}

// ============================================================================
// Auto-Promotion Logic
// ============================================================================

/**
 * Check if packet should be auto-promoted based on usage, rating, and age.
 *
 * Promotion criteria:
 * - candidate → promoted: used 3+ times, avg rating ≥ 4.0, age ≥ 7 days
 * - promoted → benchmark: used 10+ times, avg rating ≥ 4.5, age ≥ 30 days
 * - benchmark → realworld_validated: used 50+ times, avg rating ≥ 4.8, age ≥ 90 days
 */
export function checkPromotion(
  currentLevel: string,
  usedInDecisions: number,
  avgRating: number | null,
  createdAt: number
): string | null {
  const ageInDays = (Date.now() - createdAt) / (1000 * 60 * 60 * 24);
  const rating = avgRating ?? 0;

  // candidate → promoted
  if (currentLevel === 'candidate' &&
      usedInDecisions >= 3 &&
      rating >= 4.0 &&
      ageInDays >= 7) {
    return 'promoted';
  }

  // promoted → benchmark
  if (currentLevel === 'promoted' &&
      usedInDecisions >= 10 &&
      rating >= 4.5 &&
      ageInDays >= 30) {
    return 'benchmark';
  }

  // benchmark → realworld_validated
  if (currentLevel === 'benchmark' &&
      usedInDecisions >= 50 &&
      rating >= 4.8 &&
      ageInDays >= 90) {
    return 'realworld_validated';
  }

  return null;
}

// ============================================================================
// Tool Definitions
// ============================================================================

export const recordDecisionToolDef = {
  name: 'arra_record_decision',
  description: 'Record a decision with packet grounding. Enables tracking which learnings informed real-world decisions for feedback loops.',
  inputSchema: {
    type: 'object',
    properties: {
      situation: {
        type: 'string',
        description: 'What problem was being solved'
      },
      choice: {
        type: 'string',
        description: 'What action was taken'
      },
      packetIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'Learning/packet IDs that informed this decision'
      },
      rationale: {
        type: 'string',
        description: 'Why these packets were chosen'
      },
      project: {
        type: 'string',
        description: 'Project context (optional)'
      }
    },
    required: ['situation', 'choice', 'packetIds']
  }
};

export const updateOutcomeToolDef = {
  name: 'arra_update_outcome',
  description: 'Update decision outcome and rate packets (1-5 stars). Enables feedback loops for UCB1 bandit algorithm.',
  inputSchema: {
    type: 'object',
    properties: {
      decisionId: {
        type: 'string',
        description: 'Decision ID (format: decision_YYYY-MM-DD_UUID)'
      },
      outcome: {
        type: 'string',
        enum: ['success', 'failure', 'mixed'],
        description: 'Decision outcome'
      },
      outcomeNotes: {
        type: 'string',
        description: 'What happened, why it worked/failed'
      },
      learned: {
        type: 'string',
        description: 'New insights from this decision'
      },
      packetRatings: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            packetId: { type: 'string' },
            rating: { type: 'number', minimum: 1, maximum: 5 }
          },
          required: ['packetId', 'rating']
        },
        description: 'Rate each packet used (1-5 stars)'
      }
    },
    required: ['decisionId', 'outcome']
  }
};

// ============================================================================
// Handlers
// ============================================================================

export async function handleRecordDecision(
  ctx: ToolContext,
  input: OracleRecordDecisionInput
): Promise<ToolResponse> {
  const { situation, choice, packetIds, rationale, project } = input;
  const now = Date.now();
  const dateStr = new Date().toISOString().split('T')[0];

  // Generate decision ID: decision_YYYY-MM-DD_UUID
  const decisionId = `decision_${dateStr}_${randomUUID().split('-')[0]}`;

  // Insert decision journal entry
  ctx.db.insert(decisionJournal).values({
    id: decisionId,
    timestamp: now,
    situation,
    choice,
    packetIds: JSON.stringify(packetIds),
    rationale: rationale || null,
    outcome: 'pending',
    outcomeNotes: null,
    learned: null,
    project: project || null,
    createdAt: now,
    updatedAt: now
  }).run();

  // Update packet usage counts
  for (const packetId of packetIds) {
    ctx.sqlite.prepare(`
      UPDATE oracle_documents
      SET used_in_decisions = used_in_decisions + 1,
          last_used_at = ?
      WHERE id = ?
    `).run(now, packetId);
  }

  console.error(`[MCP:DECISION] Recorded decision: ${decisionId} (${packetIds.length} packets)`);

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        decisionId,
        message: `Decision recorded with ${packetIds.length} packets`,
        situation,
        choice,
        packetCount: packetIds.length
      }, null, 2)
    }]
  };
}

export async function handleUpdateOutcome(
  ctx: ToolContext,
  input: OracleUpdateOutcomeInput
): Promise<ToolResponse> {
  const { decisionId, outcome, outcomeNotes, learned, packetRatings } = input;
  const now = Date.now();

  // Update decision outcome
  ctx.sqlite.prepare(`
    UPDATE decision_journal
    SET outcome = ?,
        outcome_notes = ?,
        learned = ?,
        updated_at = ?
    WHERE id = ?
  `).run(outcome, outcomeNotes || null, learned || null, now, decisionId);

  // Update packet ratings
  const updates: Array<{ packetId: string; oldRating: number | null; newRating: number }> = [];

  if (packetRatings) {
    for (const { packetId, rating } of packetRatings) {
      // Get current usage count and rating
      const row = ctx.sqlite.prepare(`
        SELECT used_in_decisions, average_rating
        FROM oracle_documents
        WHERE id = ?
      `).get(packetId) as { used_in_decisions: number; average_rating: number | null } | undefined;

      if (!row) {
        console.error(`[MCP:DECISION] Packet not found: ${packetId}`);
        continue;
      }

      const oldRating = row.average_rating;
      const usedCount = row.used_in_decisions;

      // Incremental average: new_avg = ((old_avg * n) + new_rating) / (n + 1)
      // But we want to update the average, not add a new data point
      // So: new_avg = (old_avg * (n-1) + new_rating) / n
      const n = usedCount;
      const newAvg = n > 1
        ? ((oldRating || 2.5) * (n - 1) + rating) / n
        : rating;

      ctx.sqlite.prepare(`
        UPDATE oracle_documents
        SET average_rating = ?
        WHERE id = ?
      `).run(newAvg, packetId);

      updates.push({ packetId, oldRating, newRating: newAvg });

      // Check for auto-promotion
      const packetRow = ctx.sqlite.prepare(`
        SELECT created_at, promotion_level
        FROM oracle_documents
        WHERE id = ?
      `).get(packetId) as { created_at: number; promotion_level: string } | undefined;

      if (packetRow) {
        const newLevel = checkPromotion(
          packetRow.promotion_level,
          usedCount,
          newAvg,
          packetRow.created_at
        );

        if (newLevel) {
          ctx.sqlite.prepare(`
            UPDATE oracle_documents
            SET promotion_level = ?
            WHERE id = ?
          `).run(newLevel, packetId);

          console.error(`[MCP:PROMOTE] ${packetId}: ${packetRow.promotion_level} → ${newLevel}`);
        }
      }
    }
  }

  console.error(`[MCP:DECISION] Updated outcome: ${decisionId} → ${outcome}`);

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        decisionId,
        outcome,
        ratingsUpdated: updates.length,
        updates: updates.map(u => ({
          packetId: u.packetId,
          oldRating: u.oldRating ?? 'unrated',
          newRating: u.newRating.toFixed(2)
        }))
      }, null, 2)
    }]
  };
}
