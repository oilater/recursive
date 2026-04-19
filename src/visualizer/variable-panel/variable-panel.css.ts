import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";
import { panelContainer, panelTitle } from "@/shared/styles/panel.css";

export const container = panelContainer;
export const title = panelTitle;

export const titleRow = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.sm,
  marginBottom: vars.space.md,
});

export const titleInRow = style([
  panelTitle,
  {
    marginBottom: 0,
    lineHeight: 1,
  },
]);

export const depthBadge = style({
  fontSize: vars.fontSize.xs,
  color: vars.color.textMuted,
  fontFamily: vars.font.mono,
  padding: `2px ${vars.space.sm}`,
  backgroundColor: vars.color.surfaceAlt,
  borderRadius: vars.radius.sm,
  border: `1px solid ${vars.color.border}`,
  lineHeight: 1,
  display: "inline-flex",
  alignItems: "center",
});

// ── Stack ──

export const stack = style({
  display: "flex",
  flexDirection: "column",
});

export const frameWrapper = style({
  display: "flex",
  flexDirection: "column",
});

export const stackConnector = style({
  width: "2px",
  height: vars.space.md,
  backgroundColor: vars.color.border,
  marginLeft: vars.space.lg,
});

// ── Frame card ──

export const frameCard = style({
  borderRadius: vars.radius.md,
  border: `1px solid ${vars.color.border}`,
  backgroundColor: vars.color.surfaceAlt,
  overflow: "hidden",
  opacity: 0.55,
  transition: "opacity 0.15s ease, border-color 0.15s ease",
});

export const frameCardActive = style([
  frameCard,
  {
    opacity: 1,
    borderColor: "#fbbf24",
    borderWidth: "1.5px",
    boxShadow: "0 0 0 2px rgba(251, 191, 36, 0.12)",
  },
]);

export const frameCardRoot = style([
  frameCard,
  {
    opacity: 0.85,
    borderColor: "#60a5fa",
    borderWidth: "1.5px",
  },
]);


export const frameHeader = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.sm,
  padding: `${vars.space.sm} ${vars.space.md}`,
  backgroundColor: "rgba(0, 0, 0, 0.18)",
  borderBottom: `1px solid ${vars.color.border}`,
});

export const frameDepth = style({
  fontSize: vars.fontSize.xs,
  color: vars.color.textMuted,
  fontFamily: vars.font.mono,
  padding: `2px ${vars.space.xs}`,
  backgroundColor: "rgba(0, 0, 0, 0.25)",
  borderRadius: vars.radius.sm,
});

export const frameName = style({
  fontSize: vars.fontSize.md,
  color: vars.color.text,
  fontFamily: vars.font.mono,
  fontWeight: 600,
  flex: 1,
});

export const activeBadge = style({
  fontSize: vars.fontSize.xs,
  fontFamily: vars.font.mono,
  color: "#fbbf24",
  backgroundColor: "rgba(251, 191, 36, 0.15)",
  border: "1px solid rgba(251, 191, 36, 0.4)",
  borderRadius: vars.radius.sm,
  padding: `2px ${vars.space.sm}`,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
});

export const frameBody = style({
  padding: `${vars.space.sm} ${vars.space.md}`,
});

export const frameEmpty = style({
  padding: `${vars.space.sm} ${vars.space.md}`,
  fontSize: vars.fontSize.sm,
  color: vars.color.textMuted,
  fontFamily: vars.font.mono,
  fontStyle: "italic",
});

// ── Variable row ──

export const row = style({
  display: "flex",
  alignItems: "baseline",
  gap: vars.space.sm,
  padding: `${vars.space.xs} 0`,
  borderBottom: `1px dashed ${vars.color.border}`,
  ":last-child": {
    borderBottom: "none",
  },
});

export const rowChanged = style([
  row,
  {
    backgroundColor: "rgba(251, 191, 36, 0.06)",
    borderRadius: vars.radius.sm,
    padding: `${vars.space.xs} ${vars.space.xs}`,
  },
]);

export const varName = style({
  fontSize: vars.fontSize.md,
  color: vars.color.textMuted,
  fontFamily: vars.font.mono,
  minWidth: "70px",
  flexShrink: 0,
});

export const varValue = style({
  fontSize: vars.fontSize.md,
  color: vars.color.text,
  fontFamily: vars.font.mono,
  wordBreak: "break-all",
});

export const varValueHighlighted = style([
  varValue,
  {
    outline: "1.5px solid #fbbf24",
    outlineOffset: "1px",
    borderRadius: "4px",
  },
]);

// ── Grid ──

export const grid = style({
  display: "flex",
  gap: "2px",
  flexWrap: "wrap",
});

export const grid2d = style({
  display: "flex",
  flexDirection: "column",
  gap: "2px",
});

export const gridRow = style({
  display: "flex",
  gap: "2px",
});

export const cell = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "32px",
  height: "32px",
  padding: `0 ${vars.space.xs}`,
  backgroundColor: vars.color.surfaceAlt,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.sm,
  fontSize: vars.fontSize.sm,
  fontFamily: vars.font.mono,
  color: vars.color.text,
  transition: "all 0.2s ease",
});

export const cellChanged = style([
  cell,
  {
    backgroundColor: "rgba(251, 191, 36, 0.15)",
    borderColor: "#fbbf24",
    color: "#fbbf24",
    fontWeight: 600,
  },
]);

// ── Function value card (closure visualization) ──

export const functionCard = style({
  display: "inline-flex",
  flexDirection: "column",
  borderRadius: vars.radius.sm,
  border: `1px solid #c084fc`,
  backgroundColor: "rgba(192, 132, 252, 0.08)",
  overflow: "hidden",
  minWidth: "120px",
});

export const functionCardHighlighted = style([
  functionCard,
  {
    outline: "1.5px solid #fbbf24",
    outlineOffset: "1px",
    borderRadius: "6px",
  },
]);

export const functionCardHeader = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.xs,
  padding: `${vars.space.xs} ${vars.space.sm}`,
  backgroundColor: "rgba(192, 132, 252, 0.12)",
  borderBottom: `1px solid rgba(192, 132, 252, 0.3)`,
});

export const functionLabel = style({
  fontSize: vars.fontSize.xs,
  fontFamily: vars.font.mono,
  color: "#c084fc",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  fontWeight: 600,
});

export const functionName = style({
  fontSize: vars.fontSize.sm,
  fontFamily: vars.font.mono,
  color: vars.color.text,
  fontWeight: 600,
});

export const functionSignature = style({
  fontSize: vars.fontSize.sm,
  fontFamily: vars.font.mono,
  color: vars.color.textMuted,
});


export const functionCardBody = style({
  padding: `${vars.space.xs} ${vars.space.sm}`,
});

export const functionRow = style({
  display: "flex",
  alignItems: "flex-start",
  gap: vars.space.sm,
  padding: `2px 0`,
});

export const functionVarName = style({
  fontSize: vars.fontSize.sm,
  color: vars.color.textMuted,
  fontFamily: vars.font.mono,
  minWidth: "50px",
});
