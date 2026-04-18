import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

export const wrapper = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.md,
  flexWrap: "wrap",
});

export const container = style({
  display: "flex",
  gap: "4px",
  backgroundColor: vars.color.surfaceAlt,
  borderRadius: vars.radius.md,
  padding: "3px",
});

const base = {
  padding: `${vars.space.sm} ${vars.space.lg}`,
  fontSize: vars.fontSize.sm,
  border: "none",
  cursor: "pointer",
  borderRadius: vars.radius.sm,
  transition: "all 0.15s ease",
} as const;

export const button = style({
  ...base,
  backgroundColor: "transparent",
  color: vars.color.textMuted,
  ":hover": {
    color: vars.color.text,
  },
});

export const buttonActive = style({
  ...base,
  backgroundColor: "rgba(74, 222, 128, 0.15)",
  color: "#4ade80",
  fontWeight: 600,
});

export const defaultTag = style({
  fontWeight: 400,
  opacity: 0.7,
});

export const defaultButton = style({
  fontSize: vars.fontSize.sm,
  color: vars.color.textMuted,
  backgroundColor: "transparent",
  border: "none",
  cursor: "pointer",
  whiteSpace: "nowrap",
  ":hover": {
    color: vars.color.text,
  },
});

