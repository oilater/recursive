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

// CodeMirror 에디터가 부모 높이를 100% 채우도록
export const editorRoot = style({
  height: "100%",
  display: "flex",
  flexDirection: "column",
});

globalStyle(`${editorRoot} .cm-editor`, {
  flex: 1,
  height: "100%",
});

globalStyle(`${editorRoot} .cm-scroller`, {
  overflow: "auto",
});
