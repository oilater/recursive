import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

export const loadingBox = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: vars.space.sm,
  padding: vars.space.lg,
  color: vars.color.textMuted,
  fontSize: vars.fontSize.md,
});
