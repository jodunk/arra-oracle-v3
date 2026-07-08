/**
 * Lobster Mascot Component - OpenClaw Studio inspired
 *
 * Displays the pixel lobster mascot as an inline SVG
 */

import styles from './LobsterMascot.module.css';

export interface LobsterMascotProps {
  size?: number;
  className?: string;
}

export function LobsterMascot({ size = 64, className = '' }: LobsterMascotProps) {
  return (
    <img
      src="/assets/pixel-lobster.svg"
      alt="Lobster Mascot"
      width={size}
      height={size}
      className={`${styles.lobster} ${className}`.trim()}
      style={{ width: size, height: size }}
    />
  );
}
