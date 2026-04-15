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

export const algoTitle = style({
  fontSize: vars.fontSize.lg,
  fontWeight: "600",
  color: vars.color.text,
});

export const mainContent = style({
  display: "flex",
  flexDirection: "column",
  flex: 1,
  overflow: "hidden",
  padding: vars.space.sm,
  gap: vars.space.sm,
});

export const leftPanel = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.sm,
  overflow: "hidden",
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
