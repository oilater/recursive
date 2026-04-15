import { style, globalStyle } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

export const footer = style({
  textAlign: "center",
  padding: `${vars.space.md} ${vars.space.lg} ${vars.space.xl}`,
  marginTop: "auto",
  flexShrink: 0,
});

export const links = style({
  display: "flex",
  justifyContent: "center",
  gap: vars.space.md,
  marginBottom: vars.space.sm,
  fontSize: vars.fontSize.sm,
});

globalStyle(`${links} a`, {
  color: vars.color.textSubtle,
  textDecoration: "none",
});

export const dot = style({
  color: vars.color.borderLight,
});

export const copy = style({
  fontSize: vars.fontSize.xs,
  color: vars.color.textFaint,
});
