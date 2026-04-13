import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

export const container = style({
  padding: vars.space.md,
  backgroundColor: vars.color.surface,
  borderRadius: vars.radius.lg,
  border: `1px solid ${vars.color.border}`,
  overflow: "auto",
});

export const title = style({
  fontSize: vars.fontSize.xs,
  color: vars.color.textMuted,
  fontFamily: vars.font.mono,
  marginBottom: vars.space.sm,
  userSelect: "none",
});

export const row = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.sm,
  padding: `${vars.space.xs} 0`,
  borderBottom: `1px solid ${vars.color.border}`,
  ":last-child": {
    borderBottom: "none",
  },
});

export const varName = style({
  fontSize: vars.fontSize.md,
  color: vars.color.textMuted,
  fontFamily: vars.font.mono,
  minWidth: "70px",
  flexShrink: 0,
});

export const varValue = style({
  fontSize: vars.fontSize.md,
  color: vars.color.text,
  fontFamily: vars.font.mono,
  wordBreak: "break-all",
});

export const arrayContainer = style({
  display: "flex",
  gap: "2px",
  flexWrap: "wrap",
});

export const rowChanged = style([
  row,
  {
    backgroundColor: "rgba(251, 191, 36, 0.06)",
    borderRadius: vars.radius.sm,
    padding: `${vars.space.xs} ${vars.space.xs}`,
    transition: "background-color 0.3s ease",
  },
]);

export const arrayItem = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "28px",
  height: "28px",
  padding: `0 ${vars.space.xs}`,
  backgroundColor: vars.color.surfaceAlt,
  borderRadius: vars.radius.sm,
  fontSize: vars.fontSize.sm,
  fontFamily: vars.font.mono,
  color: vars.color.text,
});
