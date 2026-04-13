import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

export const container = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.md,
  padding: vars.space.md,
  backgroundColor: vars.color.surface,
  borderRadius: vars.radius.lg,
  border: `1px solid ${vars.color.border}`,
  flexWrap: "wrap",
});

export const label = style({
  fontSize: vars.fontSize.sm,
  color: vars.color.textMuted,
  whiteSpace: "nowrap",
});

export const input = style({
  padding: `${vars.space.xs} ${vars.space.sm}`,
  backgroundColor: vars.color.surfaceAlt,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  color: vars.color.text,
  fontFamily: vars.font.mono,
  fontSize: vars.fontSize.sm,
  width: "180px",
  outline: "none",
  ":focus": {
    borderColor: vars.color.primary,
  },
});

export const smallInput = style([
  input,
  {
    width: "60px",
    textAlign: "center",
  },
]);

export const applyButton = style({
  padding: `${vars.space.xs} ${vars.space.md}`,
  backgroundColor: vars.color.primary,
  color: "white",
  borderRadius: vars.radius.md,
  fontSize: vars.fontSize.sm,
  fontWeight: "500",
  transition: "background-color 0.15s ease",
  ":hover": {
    backgroundColor: vars.color.primaryLight,
  },
});

export const error = style({
  fontSize: vars.fontSize.xs,
  color: vars.color.error,
  width: "100%",
});
