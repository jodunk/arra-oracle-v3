# Content-Aware Layout - Usage Guide

**Created**: 2026-03-28
**Pattern Source**: OpenClaw Studio

---

## Overview

Content-aware layout automatically adjusts display width based on content type:
- **Plain text** → 65ch (optimal reading width)
- **Code blocks** → 100% (full width for readability)
- **Diagrams** → 100% (Mermaid, flowcharts)
- **Tables** → 100% (prevent cramped layouts)

---

## Quick Start

### Basic Usage

```tsx
import { ContentAwareMessage } from './components/ContentAwareMessage';
import Markdown from 'react-markdown';

function ChatMessage({ content }) {
  return (
    <ContentAwareMessage content={content} variant="bubble">
      <Markdown>{content}</Markdown>
    </ContentAwareMessage>
  );
}
```

### Oracle Chat Example

```tsx
import { ContentAwareMessage } from './components/ContentAwareMessage';

function OracleMessage({ message, role }) {
  const variant = role === 'user' ? 'user-message' : 'assistant-message';

  return (
    <ContentAwareMessage
      content={message}
      variant={variant}
    >
      <Markdown remarkPlugins={[remarkGfm]}>
        {message}
      </Markdown>
    </ContentAwareMessage>
  );
}
```

---

## Examples

### Example 1: Plain Text (Narrow)

```tsx
<ContentAwareMessage content="This is plain text.">
  <p>This is plain text.</p>
</ContentAwareMessage>
```

**Result**: Max-width 65ch, centered, readable.

### Example 2: Code Block (Wide)

```tsx
<ContentAwareMessage content={`\`\`\`python\ndef hello():\n    print('world')\n\`\`\``}>
  <Markdown>{content}</Markdown>
</ContentAwareMessage>
```

**Result**: Full width, horizontal scroll if needed.

### Example 3: Mermaid Diagram (Wide)

```tsx
<ContentAwareMessage content="graph TD\n  A[Start] --> B[End]">
  <Markdown>{content}</Markdown>
</ContentAwareMessage>
```

**Result**: Full width for diagram rendering.

### Example 4: Mixed Content

```tsx
<ContentAwareMessage
  content={`Some text, then:\n\`\`\`js\nconsole.log('code')\n\`\`\`\nThen more text.`}
>
  <Markdown>{content}</Markdown>
</ContentAwareMessage>
```

**Result**: Wide (because it contains code block).

---

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | - | Content to render |
| `content` | `string` | `''` | Raw content for width detection |
| `className` | `string` | `''` | Additional CSS classes |
| `variant` | `'default' \| 'card' \| 'bubble'` | `'default'` | Visual style |

---

## Custom Styling

### Override width

```css
.custom-message {
  max-width: 80ch !important; /* Force specific width */
}
```

### Add animations

```css
.animated-message {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
```

---

## Integration: Overview Page

To integrate into existing pages like `Overview.tsx`:

```tsx
// Before
<div className={styles.wisdomContent}>
  <Markdown>{wisdom.content}</Markdown>
</div>

// After
import { ContentAwareMessage } from '../components/ContentAwareMessage';

<ContentAwareMessage
  content={wisdom.content}
  variant="card"
  className={styles.wisdomContent}
>
  <Markdown remarkPlugins={[remarkGfm]}>{wisdom.content}</Markdown>
</ContentAwareMessage>
```

---

## Performance Notes

### `content-visibility: auto`

The component uses `content-visibility: auto` for performance:

```css
.container {
  content-visibility: auto;
  contain-intrinsic-size: auto 200px;
}
```

**Benefits**:
- Skips rendering off-screen content
- Faster initial page load
- Smoother scrolling

**Trade-offs**:
- Slight delay when scrolling to content (browser paints on-demand)
- `contain-intrinsic-size` reserves space to prevent layout shift

### When NOT to Use

- Very short content (< 100 chars) - overhead not worth it
- Animations that need to be visible immediately
- Print styles (disabled via `@media print`)

---

## Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| `content-visibility` | 85+ | 103+ | 16.4+ | 85+ |
| `oklch()` | 111+ | 113+ | 15.4+ | 111+ |
| `color-mix()` | 111+ | 113+ | 16.2+ | 111+ |

**Fallback**: For older browsers, provide a graceful degradation strategy.

---

## Testing

### Visual Regression

```bash
# Take screenshots of message components
npm run test:visual

# Compare before/after
npm run test:visual:compare
```

### Manual Checklist

- [ ] Plain text renders at 65ch max-width
- [ ] Code blocks expand to full width
- [ ] Diagrams render correctly
- [ ] Tables don't overflow awkwardly
- [ ] Transition between narrow/wide is smooth
- [ ] Mobile responsive (max-width: 768px)
- [ ] Dark mode colors have sufficient contrast
- [ ] Light mode colors have sufficient contrast

---

## Troubleshooting

### Content not expanding?

Check that the `content` prop is passed:

```tsx
// ❌ Wrong - won't detect code blocks
<ContentAwareMessage variant="bubble">
  <Markdown>{content}</Markdown>
</ContentAwareMessage>

// ✅ Correct - detects code blocks
<ContentAwareMessage content={content} variant="bubble">
  <Markdown>{content}</Markdown>
</ContentAwareMessage>
```

### Width too narrow on mobile?

The component has responsive styles at 768px breakpoint. Adjust if needed:

```css
@media (max-width: 768px) {
  .narrow, .wide {
    padding: 0.75rem;
  }
}
```

### Performance issues with many messages?

Consider pagination or virtual scrolling:

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

// Virtualize long message lists
const virtualizer = useVirtualizer({
  count: messages.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 200, // Average message height
});
```

---

## Next Steps

1. **Integrate into Overview page** - Update wisdom card
2. **Add to DocDetail page** - Document viewer
3. **Create chat UI** - When we build chat interface
4. **Measure impact** - Lighthouse scores, layout shift metrics

---

**Status**: ✅ Ready for integration
**Files**:
- `/Users/jodunk/.local/share/arra-oracle-v3/frontend/src/components/ContentAwareMessage.tsx`
- `/Users/jodunk/.local/share/arra-oracle-v3/frontend/src/components/ContentAwareMessage.module.css`
- `/Users/jodunk/.local/share/arra-oracle-v3/frontend/src/hooks/useIsWideContent.ts`
