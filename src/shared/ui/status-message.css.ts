import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

const base = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: vars.space.xl,
  fontSize: vars.fontSize.md,
} as const;

export const loading = style({
  ...base,
  color: vars.color.textMuted,
});

export const error = style({
  ...base,
  color: vars.color.error,
});
