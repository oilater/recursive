"use client";

import * as styles from "./shared-ui.css";

type BadgeVariant = "call" | "return" | "easy" | "medium" | "hard" | "premium" | "custom";

const VARIANT_STYLES: Record<BadgeVariant, { bg: string; color: string }> = {
  call: { bg: "rgba(34, 197, 94, 0.15)", color: "#22c55e" },
  return: { bg: "rgba(239, 68, 68, 0.15)", color: "#ef4444" },
  easy: { bg: "#22c55e20", color: "#22c55e" },
  medium: { bg: "#f59e0b20", color: "#f59e0b" },
  hard: { bg: "#ef444420", color: "#ef4444" },
  premium: { bg: "#f59e0b20", color: "#f59e0b" },
  custom: { bg: "#6366f120", color: "#6366f1" },
};

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
}

export function Badge({ variant, children }: BadgeProps) {
  const { bg, color } = VARIANT_STYLES[variant];
  return (
    <span className={styles.badge} style={{ backgroundColor: bg, color }}>
      {children}
    </span>
  );
}
