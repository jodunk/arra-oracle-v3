import { useMemo } from 'react';

/**
 * Detects if content should be rendered in wide layout
 * Based on OpenClaw Studio pattern
 *
 * Wide content triggers:
 * - Code blocks (triple backticks)
 * - Mermaid diagrams (graph TD, flowchart TD, etc.)
 * - Tables
 * - Embedded iframes
 *
 * @param content - The content string to analyze
 * @returns true if content should use wide layout
 */
export function useIsWideContent(content: string): boolean {
  return useMemo(() => {
    if (!content || typeof content !== 'string') {
      return false;
    }

    // Pattern for code blocks with triple backticks
    const codeBlockPattern = /```[\s\S]*```/;

    // Pattern for Mermaid diagrams
    const diagramPattern = /graph TD|flowchart TD|graph LR|flowchart LR|mermaid|sequenceDiagram|classDiagram|stateDiagram|erDiagram|pie|gitGraph/i;

    // Pattern for tables
    const tablePattern = /\|.*\|/;

    // Pattern for iframes or embeds
    const embedPattern = /<iframe|<embed|<video|<audio/i;

    return (
      codeBlockPattern.test(content) ||
      diagramPattern.test(content) ||
      tablePattern.test(content) ||
      embedPattern.test(content)
    );
  }, [content]);
}
