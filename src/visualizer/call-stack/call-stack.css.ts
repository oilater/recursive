import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

export const container = style({
  padding: vars.space.md,
  backgroundColor: vars.color.surface,
  borderRadius: vars.radius.lg,
  border: `1px solid ${vars.color.border}`,
  overflow: "auto",
  maxHeight: "200px",
});

export const title = style({
  fontSize: vars.fontSize.xs,
  color: vars.color.textMuted,
  fontFamily: vars.font.mono,
  marginBottom: vars.space.sm,
  userSelect: "none",
  display: "flex",
  alignItems: "center",
  gap: vars.space.xs,
});

export const depthBadge = style({
  padding: `0 ${vars.space.xs}`,
  borderRadius: vars.radius.full,
  backgroundColor: vars.color.surfaceAlt,
  fontSize: vars.fontSize.xs,
  fontFamily: vars.font.mono,
});

export const frame = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.xs,
  padding: `3px ${vars.space.sm}`,
  fontFamily: vars.font.mono,
  fontSize: vars.fontSize.xs,
  color: vars.color.textMuted,
  borderLeft: "2px solid transparent",
  transition: "all 0.15s ease",
});

export const frameActive = style([
  frame,
  {
    color: vars.color.text,
    backgroundColor: "rgba(251, 191, 36, 0.1)",
    borderLeftColor: vars.color.highlight,
    fontWeight: "600",
  },
]);

export const frameIndent = style({
  display: "inline-block",
  width: "16px",
  flexShrink: 0,
});

export const frameArrow = style({
  color: vars.color.primary,
  flexShrink: 0,
});
