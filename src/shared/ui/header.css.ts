import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

export const header = style({
  display: "flex",
  alignItems: "center",
  padding: `${vars.space.sm} 0`,
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
  fontSize: "16px",
  fontWeight: 600,
  letterSpacing: "-0.02em",
  color: "#e2e8f0",
  fontFamily: "var(--font-plus-jakarta), sans-serif",
});

export const center = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.sm,
});

export const right = style({
  display: "flex",
  alignItems: "center",
  gap: "4px",
  flex: 1,
  justifyContent: "flex-end",
  minWidth: 0,
});

export const iconLink = style({
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  color: "#94a3b8",
  borderRadius: "6px",
  textDecoration: "none",
  ":hover": {
    backgroundColor: "#1e293b",
    color: "#e2e8f0",
  },
});
