import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

export const header = style({
  display: "flex",
  alignItems: "center",
  padding: `${vars.space.sm} ${vars.space.lg}`,
  backgroundColor: "transparent",
  flexShrink: 0,
});

export const left = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.md,
  flex: 1,
  minWidth: 0,
});

export const logoLink = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  textDecoration: "none",
  color: vars.color.text,
});

export const logoText = style({
  fontSize: "20px",
  fontWeight: 700,
  letterSpacing: "-0.02em",
  color: vars.color.text,
  fontFamily: "var(--font-plus-jakarta), sans-serif",
});

export const nav = style({
  display: "flex",
  alignItems: "center",
  gap: "4px",
});

export const navLink = style({
  padding: "6px 12px",
  fontSize: vars.fontSize.md,
  color: vars.color.text,
  textDecoration: "none",
  borderRadius: "6px",
  ":hover": {
    backgroundColor: vars.color.surfaceHover,
  },
});

export const center = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.sm,
});

export const right = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.sm,
  flex: 1,
  justifyContent: "flex-end",
  minWidth: 0,
});

export const iconLink = style({
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  color: vars.color.text,
  borderRadius: "6px",
  textDecoration: "none",
  ":hover": {
    backgroundColor: vars.color.surfaceHover,
    color: vars.color.text,
  },
});
