import { style } from "@vanilla-extract/css";
import { vars } from "./theme.css";

export const panelContainer = style({
  padding: vars.space.md,
  backgroundColor: vars.color.surface,
  borderRadius: vars.radius.lg,
  border: `1px solid ${vars.color.border}`,
  overflow: "auto",
});

export const panelTitle = style({
  fontSize: vars.fontSize.xs,
  color: vars.color.textMuted,
  fontFamily: vars.font.mono,
  marginBottom: vars.space.sm,
  userSelect: "none",
});

export const panelTitleWithBadge = style({
  fontSize: vars.fontSize.xs,
  color: vars.color.textMuted,
  fontFamily: vars.font.mono,
  marginBottom: vars.space.sm,
  userSelect: "none",
  display: "flex",
  alignItems: "center",
  gap: vars.space.xs,
});
