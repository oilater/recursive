import { style, globalStyle } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

export const container = style({
  width: "100%",
  height: "100%",
  overflow: "auto",
  backgroundColor: "#0d1117",
  borderRadius: vars.radius.lg,
  border: `1px solid ${vars.color.border}`,
  fontSize: "14px",
  lineHeight: 1.6,
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
  padding: 0,
  background: "transparent !important",
});

globalStyle(`${container} code`, {
  display: "block",
  padding: `0 ${vars.space.sm}`,
  fontSize: 0,
  fontVariantLigatures: "none",
  fontFeatureSettings: "'liga' 0, 'calt' 0",
});

globalStyle(`${container} span`, {
  margin: 0,
  padding: 0,
});

globalStyle(`${container} span.line`, {
  display: "block",
  position: "relative",
  paddingLeft: vars.space.sm,
  paddingRight: "80px",
  borderLeft: "3px solid transparent",
  fontSize: "14px", // code의 fontSize:0에서 복원
  lineHeight: 1.5,
  transition: "background-color 0.15s ease, border-color 0.15s ease",
});

globalStyle(`${container} .line.highlighted-line`, {
  backgroundColor: "rgba(251, 191, 36, 0.15)",
  borderLeftColor: "#fbbf24",
});

globalStyle(`${container} .caller-badge`, {
  position: "absolute",
  right: vars.space.md,
  top: "50%",
  transform: "translateY(-50%)",
  padding: `0 ${vars.space.xs}`,
  fontSize: vars.fontSize.xs,
  fontFamily: vars.font.mono,
  color: "#60a5fa",
  backgroundColor: "rgba(96, 165, 250, 0.12)",
  border: "1px solid rgba(96, 165, 250, 0.4)",
  borderRadius: vars.radius.sm,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  userSelect: "none",
  pointerEvents: "none",
});
