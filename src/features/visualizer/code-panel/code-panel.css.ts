import { style, globalStyle } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

export const container = style({
  width: "100%",
  height: "100%",
  overflow: "auto",
  backgroundColor: "#0d1117",
  borderRadius: vars.radius.lg,
  border: `1px solid ${vars.color.border}`,
  fontSize: vars.fontSize.sm,
  lineHeight: 1.7,
});

export const header = style({
  padding: `${vars.space.sm} ${vars.space.md}`,
  borderBottom: `1px solid ${vars.color.border}`,
  color: vars.color.textMuted,
  fontSize: vars.fontSize.xs,
  fontFamily: vars.font.mono,
  userSelect: "none",
});

export const codeWrapper = style({
  padding: `${vars.space.sm} 0`,
});

// Shiki output styling
globalStyle(`${container} pre`, {
  margin: 0,
  padding: `0 ${vars.space.md}`,
  background: "transparent !important",
});

globalStyle(`${container} code`, {
  display: "block",
});

globalStyle(`${container} .line`, {
  display: "block",
  padding: `2px ${vars.space.md}`,
  marginLeft: `-${vars.space.md}`,
  marginRight: `-${vars.space.md}`,
  borderLeft: "3px solid transparent",
  transition: "background-color 0.15s ease, border-color 0.15s ease",
});

globalStyle(`${container} .line.highlighted-line`, {
  backgroundColor: "rgba(251, 191, 36, 0.15)",
  borderLeftColor: "#fbbf24",
});
