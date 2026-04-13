import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

export const container = style({
  padding: vars.space.md,
  backgroundColor: vars.color.surface,
  borderRadius: vars.radius.lg,
  border: `1px solid ${vars.color.border}`,
});

export const title = style({
  fontSize: vars.fontSize.xs,
  color: vars.color.textMuted,
  fontFamily: vars.font.mono,
  marginBottom: vars.space.sm,
  userSelect: "none",
});

export const board = style({
  display: "inline-grid",
  gap: "1px",
  backgroundColor: vars.color.border,
  border: `2px solid ${vars.color.border}`,
  borderRadius: vars.radius.sm,
});

export const cell = style({
  width: "36px",
  height: "36px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "18px",
  fontWeight: "bold",
  transition: "background-color 0.15s ease",
});
