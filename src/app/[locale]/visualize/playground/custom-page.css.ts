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
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  color: vars.color.textMuted,
  fontSize: vars.fontSize.sm,
  textDecoration: "none",
  whiteSpace: "nowrap",
  ":hover": { color: vars.color.text },
});

export const title = style({
  fontSize: vars.fontSize.lg,
  fontWeight: "600",
  color: vars.color.text,
});

export const editLayout = style({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  padding: vars.space.lg,
  maxWidth: "900px",
  width: "100%",
  margin: "0 auto",
  overflow: "auto",
  gap: vars.space.md,
});

export const editorPanel = style({
  flex: 1,
  overflow: "auto",
  minHeight: "300px",
  borderRadius: vars.radius.lg,
  border: `1px solid ${vars.color.border}`,
});

export const argsPanel = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.md,
  justifyContent: "flex-end",
});

export const leftPanel = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.sm,
  overflow: "hidden",
  flexShrink: 0,
  flex: 3,
  minWidth: 0,
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
  flex: 2,
  minWidth: 0,
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

export const hintBanner = style({
  padding: `${vars.space.sm} ${vars.space.md}`,
  backgroundColor: "rgba(56, 189, 248, 0.08)",
  border: `1px solid rgba(56, 189, 248, 0.2)`,
  borderRadius: vars.radius.md,
  color: vars.color.textMuted,
  fontSize: vars.fontSize.sm,
  lineHeight: 1.5,
});

export const editorFullHeight = style({
  display: "flex",
  flexDirection: "column",
  height: "100%",
});

export const runButton = style({
  padding: `${vars.space.sm} ${vars.space.xl}`,
  backgroundColor: "#38bdf8",
  color: "#0a0a0a",
  borderRadius: vars.radius.md,
  fontSize: vars.fontSize.sm,
  fontWeight: "700",
  whiteSpace: "nowrap",
  transition: "all 0.15s ease",
  flexShrink: 0,
  ":hover": {
    backgroundColor: "#0ea5e9",
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

export const editButton = style({
  marginLeft: "auto",
  padding: `${vars.space.xs} ${vars.space.md}`,
  backgroundColor: "transparent",
  color: vars.color.textMuted,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  fontSize: vars.fontSize.sm,
  cursor: "pointer",
  ":hover": {
    color: vars.color.text,
    borderColor: vars.color.text,
  },
});
