import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

// ── Panel Header ──

export const panelHeader = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: `${vars.space.sm} ${vars.space.md}`,
  backgroundColor: vars.color.surface,
  borderBottom: `1px solid ${vars.color.border}`,
  borderRadius: `${vars.radius.lg} ${vars.radius.lg} 0 0`,
});

export const panelHeaderTitle = style({
  fontSize: vars.fontSize.xs,
  color: vars.color.textMuted,
  fontFamily: vars.font.mono,
  userSelect: "none",
});

export const panelHeaderAction = style({
  padding: `2px ${vars.space.sm}`,
  fontSize: vars.fontSize.xs,
  backgroundColor: vars.color.surfaceAlt,
  color: vars.color.text,
  borderRadius: vars.radius.md,
  cursor: "pointer",
  transition: "background-color 0.15s ease",
  ":hover": {
    backgroundColor: vars.color.primary,
  },
});

// ── Badge ──

export const badge = style({
  display: "inline-block",
  padding: `1px ${vars.space.sm}`,
  borderRadius: vars.radius.sm,
  fontSize: "10px",
  fontWeight: 700,
  lineHeight: "16px",
  whiteSpace: "nowrap",
});

// ── Empty State ──

export const emptyState = style({
  fontSize: vars.fontSize.sm,
  color: vars.color.textMuted,
  opacity: 0.5,
  padding: vars.space.sm,
});
