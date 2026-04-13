import { style, globalStyle } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

export const container = style({
  width: "100%",
  height: "100%",
  overflow: "auto",
  backgroundColor: "#0d1117",
  borderRadius: vars.radius.lg,
  border: `1px solid ${vars.color.border}`,
  fontSize: "12px",
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
  padding: `${vars.space.xs} 0`,
});

globalStyle(`${container} pre`, {
  margin: 0,
  padding: `0 ${vars.space.md}`,
  background: "transparent !important",
  lineHeight: "1.5",
});

globalStyle(`${container} code`, {
  display: "block",
  lineHeight: "1.5",
});

globalStyle(`${container} span.line`, {
  display: "block",
  padding: `0 ${vars.space.md}`,
  marginLeft: `-${vars.space.md}`,
  marginRight: `-${vars.space.md}`,
  borderLeft: "3px solid transparent",
  lineHeight: "1.5",
  transition: "background-color 0.15s ease, border-color 0.15s ease",
});

globalStyle(`${container} span.line:empty::after`, {
  content: "'\\200b'",
  lineHeight: "0.5",
});

globalStyle(`${container} .line.highlighted-line`, {
  backgroundColor: "rgba(251, 191, 36, 0.15)",
  borderLeftColor: "#fbbf24",
});
