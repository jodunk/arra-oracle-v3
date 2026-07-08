# Color System Baseline & Migration

**Date**: 2026-03-28
**Branch**: feature/modern-ui-css

---

## Current System (HEX)

```css
--bg-primary: #0a0a0f;      /* Very dark purple/blue */
--bg-secondary: #0f0f1a;    /* Slightly lighter */
--bg-card: #1a1a2e;         /* Card background */
--border: #2a2a3a;          /* Subtle borders */
--text-primary: #e0e0e0;    /* Main text */
--text-secondary: #888;     /* Secondary text */
--text-muted: #666;         /* Muted text */
--accent: #a78bfa;          /* Purple accent */
--accent-hover: #6d28d9;    /* Darker purple */
--success: #4ade80;         /* Green */
--warning: #fbbf24;         /* Yellow/amber */
```

---

## Target System (oklch)

### Conversion Formula
Using perceptual uniformity:
- **L** (Lightness): 0% = black, 100% = white
- **C** (Chroma): 0 = gray, 0.3+ = vibrant
- **H** (Hue): 0-360 (similar to HSL)

### Mapped Values

| Variable | Old (HEX) | New (oklch) | Rationale |
|----------|-----------|-------------|-----------|
| `--bg-primary` | #0a0a0f | `oklch(15% 0.02 270)` | Dark purple-blue base |
| `--bg-secondary` | #0f0f1a | `oklch(18% 0.025 270)` | Slightly lighter |
| `--bg-card` | #1a1a2e | `oklch(25% 0.03 270)` | Card elevation |
| `--border` | #2a2a3a | `oklch(35% 0.04 270)` | Subtle separation |
| `--text-primary` | #e0e0e0 | `oklch(92% 0.01 270)` | High contrast |
| `--text-secondary` | #888 | `oklch(55% 0.02 270)` | Softer text |
| `--text-muted` | #666 | `oklch(45% 0.02 270)` | Very subtle |
| `--accent` | #a78bfa | `oklch(70% 0.18 290)` | Purple primary |
| `--accent-hover` | #6d28d9 | `oklch(55% 0.20 290)` | Darker accent |
| `--success` | #4ade80 | `oklch(75% 0.15 145)` | Green |
| `--warning` | #fbbf24 | `oklch(80% 0.18 85)` | Amber |

---

## New Utilities (color-mix)

```css
/* Hover states */
--bg-hover: color-mix(in oklch, var(--bg-primary), currentColor 8%);
--bg-active: color-mix(in oklch, var(--bg-primary), currentColor 12%);

/* Border variants */
--border-subtle: color-mix(in oklch, var(--bg-primary), var(--border) 50%);
--border-strong: color-mix(in oklch, var(--bg-primary), var(--text-primary) 25%);

/* Surface elevation */
--surface-1: color-mix(in oklch, var(--bg-primary), var(--bg-card) 50%);
--surface-2: color-mix(in oklch, var(--bg-primary), var(--bg-card) 100%);
```

---

## Dark Mode Strategy

Instead of separate themes, use **lightness adjustments**:

```css
[data-theme="light"] {
  --bg-primary: oklch(98% 0.01 270);  /* Near white */
  --text-primary: oklch(15% 0.02 270); /* Near black */
  /* Keep same chroma/hue, just flip lightness */
}
```

**Benefit**: Maintain perceptual relationships across themes.

---

## Migration Checklist

- [x] Document current colors
- [ ] Convert all CSS variables
- [ ] Add color-mix() utilities
- [ ] Implement dark mode toggle
- [ ] Test WCAG contrast (AA: 4.5:1, AAA: 7:1)
- [ ] Update component usage if hardcoded colors found
- [ ] Visual regression testing

---

## References

- **oklch() spec**: https://www.w3.org/TR/css-color-4/#funcdef-oklch
- **Color picker**: https://oklch.com
- **Contrast checker**: https://contrast.tools
- **OpenClaw reference**: ψ/learn/grp06/openclaw-studio/2026-03-28/0223_CODE-SNIPPETS.md

---

**Status**: 🔄 In progress
**Next**: Implement oklch() conversion in index.css
