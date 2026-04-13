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

// Shiki 출력 초기화: pre, code, span 모두 여백 제거
globalStyle(`${container} pre`, {
  margin: 0,
  padding: 0,
  background: "transparent !important",
});

globalStyle(`${container} code`, {
  display: "block",
  padding: `0 ${vars.space.sm}`,
  fontSize: 0, // span 사이 \n 텍스트 노드의 공간 제거
});

globalStyle(`${container} span`, {
  margin: 0,
  padding: 0,
});

globalStyle(`${container} span.line`, {
  display: "block",
  paddingLeft: vars.space.sm,
  borderLeft: "3px solid transparent",
  fontSize: "14px", // code의 fontSize:0에서 복원
  lineHeight: 1.5,
  transition: "background-color 0.15s ease, border-color 0.15s ease",
});

globalStyle(`${container} .line.highlighted-line`, {
  backgroundColor: "rgba(251, 191, 36, 0.15)",
  borderLeftColor: "#fbbf24",
});
