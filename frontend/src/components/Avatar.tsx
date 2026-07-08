/**
 * Avatar Component - OpenClaw Studio inspired
 *
 * Displays user/agent avatars with fallback to generated SVG
 */

import { useMemo } from 'react';
import styles from './Avatar.module.css';

export interface AvatarProps {
  seed?: string;
  name: string;
  avatarUrl?: string | null;
  size?: number;
  isSelected?: boolean;
  variant?: 'circle' | 'square';
}

/**
 * Generate SVG avatar from seed
 */
function generateAvatarSvg(seed: string, size: number): string {
  // Generate consistent colors from seed
  const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hue = hash % 360;
  const saturation = 70;
  const lightness = 50;

  // Get initials from name
  const initials = name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad-${hash}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:hsl(${hue}, ${saturation}%, 40%);stop-opacity:1" />
          <stop offset="100%" style="stop-color:hsl(${hue}, ${saturation}%, 60%);stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" fill="url(#grad-${hash})" />
      <text
        x="50%"
        y="50%"
        dominant-baseline="central"
        text-anchor="middle"
        fill="white"
        font-family="var(--font-sans)"
        font-weight="600"
        font-size="${size * 0.4}"
      >
        ${initials}
      </text>
    </svg>
  `;

  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export function Avatar({
  seed,
  name,
  avatarUrl,
  size = 48,
  isSelected = false,
  variant = 'circle',
}: AvatarProps) {
  const src = useMemo(() => {
    const trimmed = avatarUrl?.trim();
    if (trimmed) return trimmed;
    return generateAvatarSvg(seed || name, size);
  }, [avatarUrl, seed, name, size]);

  const className = [
    styles.avatar,
    styles[variant],
    isSelected ? styles.selected : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={className}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {avatarUrl?.trim() ? (
        <img
          src={src}
          alt={`${name} avatar`}
          className={styles.image}
          draggable={false}
        />
      ) : (
        <div
          className={styles.svg}
          style={{ backgroundImage: `url(${src})` }}
          aria-label={`${name} avatar`}
        />
      )}
    </div>
  );
}
