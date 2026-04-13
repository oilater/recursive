import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

export const page = style({
  display: "flex",
  flexDirection: "column",
  height: "100vh",
  overflow: "hidden",
});

export const header = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.md,
  padding: `${vars.space.sm} ${vars.space.lg}`,
  borderBottom: `1px solid ${vars.color.border}`,
  backgroundColor: vars.color.surface,
  flexShrink: 0,
});

export const backLink = style({
  color: vars.color.textMuted,
  fontSize: vars.fontSize.sm,
  textDecoration: "none",
  ":hover": { color: vars.color.text },
});

export const title = style({
  fontSize: vars.fontSize.lg,
  fontWeight: "600",
  color: vars.color.text,
});

export const editLayout = style({
  flex: 1,
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gridTemplateRows: "1fr auto",
  gap: vars.space.sm,
  padding: vars.space.sm,
  overflow: "hidden",
});

export const editorPanel = style({
  gridColumn: "1 / -1",
  overflow: "hidden",
  minHeight: 0,
});

export const argsPanel = style({
  gridColumn: "1 / -1",
});

export const leftPanel = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.sm,
  overflow: "hidden",
  flexShrink: 0,
});

export const codeSection = style({
  flex: 1,
  overflow: "hidden",
  minHeight: 0,
});

export const middlePanel = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.sm,
  overflow: "auto",
  flex: 2,
  minWidth: 0,
});

export const variableSection = style({
  flex: 1,
  overflow: "auto",
  minHeight: 0,
});

export const rightPanel = style({
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  gap: vars.space.sm,
});

export const treeSection = style({
  flex: 1,
  overflow: "hidden",
  minHeight: 0,
});

export const bottomPanel = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.sm,
  flexShrink: 0,
});

export const vizContainer = style({
  display: "flex",
  flexDirection: "column",
  flex: 1,
  overflow: "hidden",
  padding: vars.space.sm,
  gap: vars.space.sm,
});

export const vizRow = style({
  display: "flex",
  flex: 1,
  overflow: "hidden",
  gap: "16px",
});

export const editorFullHeight = style({
  display: "flex",
  flexDirection: "column",
  height: "100%",
});

export const runButton = style({
  padding: `${vars.space.md} ${vars.space.xxl}`,
  backgroundColor: "#4ade80",
  color: "#0a0a0a",
  borderRadius: vars.radius.md,
  fontSize: vars.fontSize.md,
  fontWeight: "700",
  whiteSpace: "nowrap",
  transition: "all 0.15s ease",
  flexShrink: 0,
  alignSelf: "stretch",
  ":hover": {
    backgroundColor: "#22c55e",
  },
  selectors: {
    "&:disabled": {
      opacity: 0.3,
      cursor: "not-allowed",
    },
  },
});

export const errorBox = style({
  padding: vars.space.md,
  backgroundColor: "#ef444420",
  border: `1px solid ${vars.color.error}`,
  borderRadius: vars.radius.md,
  color: vars.color.error,
  fontSize: vars.fontSize.sm,
  fontFamily: vars.font.mono,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
});

export const loadingOverlay = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: "100%",
  gap: vars.space.sm,
  color: vars.color.textMuted,
  fontSize: vars.fontSize.lg,
});
