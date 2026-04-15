import { style, globalStyle } from "@vanilla-extract/css";
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

export const skeletonEditor = style({
  height: "100%",
  padding: `${vars.space.sm} ${vars.space.md}`,
  fontFamily: vars.font.mono,
  fontSize: vars.fontSize.sm,
  color: vars.color.textMuted,
  opacity: 0.3,
});

export const skeletonLine = style({
  display: "block",
  paddingLeft: vars.space.sm,
});

export const editorRoot = style({
  height: "100%",
  display: "flex",
  flexDirection: "column",
});

globalStyle(`${editorRoot} .cm-editor`, {
  flex: 1,
  height: "100%",
  backgroundColor: "transparent !important",
});

globalStyle(`${editorRoot} .cm-scroller`, {
  overflow: "auto",
  paddingTop: vars.space.sm,
  backgroundColor: "transparent !important",
});

globalStyle(`${editorRoot} .cm-gutters`, {
  backgroundColor: "transparent !important",
  paddingLeft: vars.space.sm,
});

globalStyle(`${editorRoot} .cm-placeholder`, {
  color: vars.color.text,
  opacity: 0.4,
});
