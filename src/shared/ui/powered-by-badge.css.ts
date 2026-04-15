import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

export const badge = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  alignSelf: "center",
  padding: `${vars.space.xs} ${vars.space.sm}`,
  fontSize: vars.fontSize.xs,
  color: vars.color.textMuted,
  textDecoration: "none",
  opacity: 0.6,
  transition: "opacity 0.15s ease",
  ":hover": {
    opacity: 1,
  },
});
