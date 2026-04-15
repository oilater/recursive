import { style } from "@vanilla-extract/css";
import { vars } from "./theme.css";

export const page = style({
  display: "flex",
  flexDirection: "column",
  height: "100vh",
  overflow: "hidden",
});

export const backLink = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  color: vars.color.text,
  fontSize: vars.fontSize.md,
  textDecoration: "none",
  whiteSpace: "nowrap",
  ":hover": { color: vars.color.text },
});

export const leftPanel = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.sm,
  overflow: "hidden",
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
