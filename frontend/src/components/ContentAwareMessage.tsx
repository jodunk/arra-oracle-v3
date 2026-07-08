import { useMemo } from 'react';
import { useIsWideContent } from '../hooks/useIsWideContent';
import styles from './ContentAwareMessage.module.css';

interface ContentAwareMessageProps {
  children: React.ReactNode;
  content?: string;
  className?: string;
  variant?: 'default' | 'card' | 'bubble';
}

/**
 * Content-aware message container that adjusts width based on content type
 *
 * Based on OpenClaw Studio pattern:
 * - Regular text: 65ch (optimal reading width)
 * - Code blocks/diagrams: 100% (full available width)
 * - Performance: content-visibility: auto for virtual scrolling
 *
 * @example
 * <ContentAwareMessage content="```python\nprint('hello')\n```">
 *   <Markdown>{content}</Markdown>
 * </ContentAwareMessage>
 */
export function ContentAwareMessage({
  children,
  content = '',
  className = '',
  variant = 'default'
}: ContentAwareMessageProps) {
  const isWide = useIsWideContent(content);

  const containerClass = useMemo(() => {
    const classes = [styles.container];

    if (variant) {
      classes.push(styles[variant]);
    }

    if (isWide) {
      classes.push(styles.wide);
    } else {
      classes.push(styles.narrow);
    }

    if (className) {
      classes.push(className);
    }

    return classes.join(' ');
  }, [isWide, variant, className]);

  return (
    <div className={containerClass}>
      {children}
    </div>
  );
}

/**
 * Preset message styles for common use cases
 */
export const MessagePresets = {
  /** Chat message from user */
  user: 'user-message',

  /** Chat message from AI/Oracle */
  assistant: 'assistant-message',

  /** System notification */
  system: 'system-message',

  /** Code snippet */
  code: 'code-message',

  /** Error message */
  error: 'error-message'
} as const;
