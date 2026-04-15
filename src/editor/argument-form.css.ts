import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

export const container = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.xs,
  flexWrap: "wrap",
});

export const label = style({
  fontSize: vars.fontSize.sm,
  color: vars.color.textMuted,
  fontFamily: vars.font.mono,
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

export const typeAnnotation = style({
  color: "#38bdf8",
});

export const equals = style({
  color: "#94a3b8",
  fontSize: vars.fontSize.sm,
  fontFamily: vars.font.mono,
});

export const hint = style({
  fontSize: vars.fontSize.xs,
  color: vars.color.textMuted,
  width: "100%",
});
