import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";
import { panelContainer, panelTitle } from "@/shared/styles/panel.css";

export const container = panelContainer;

export const title = panelTitle;

export const row = style({
  display: "flex",
  alignItems: "flex-start",
  gap: vars.space.sm,
  padding: `${vars.space.xs} 0`,
  borderBottom: `1px solid ${vars.color.border}`,
  ":last-child": {
    borderBottom: "none",
  },
});

export const varName = style({
  fontSize: vars.fontSize.md,
  color: vars.color.textMuted,
  fontFamily: vars.font.mono,
  minWidth: "70px",
  flexShrink: 0,
  paddingTop: "4px",
});

export const varValue = style({
  fontSize: vars.fontSize.md,
  color: vars.color.text,
  fontFamily: vars.font.mono,
  wordBreak: "break-all",
});

export const rowChanged = style([
  row,
  {
    backgroundColor: "rgba(251, 191, 36, 0.06)",
    borderRadius: vars.radius.sm,
    padding: `${vars.space.xs} ${vars.space.xs}`,
    transition: "background-color 0.3s ease",
  },
]);

// ── Grid (1D array) ──

export const grid = style({
  display: "flex",
  gap: "2px",
  flexWrap: "wrap",
});

// ── Grid (2D array) ──

export const grid2d = style({
  display: "flex",
  flexDirection: "column",
  gap: "2px",
});

export const gridRow = style({
  display: "flex",
  gap: "2px",
});

// ── Cell ──

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

// ── Frame stack ──

export const frame = style({
  marginTop: vars.space.sm,
  paddingLeft: vars.space.sm,
  borderLeft: `2px solid ${vars.color.border}`,
  opacity: 0.55,
  transition: "opacity 0.15s ease",
});

export const frameActive = style([
  frame,
  {
    opacity: 1,
    borderLeftColor: "#fbbf24",
  },
]);

export const frameHeader = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.xs,
  fontSize: vars.fontSize.sm,
  color: vars.color.textMuted,
  fontFamily: vars.font.mono,
  padding: `${vars.space.xs} 0`,
});

export const frameArrow = style({
  color: vars.color.textMuted,
  fontFamily: vars.font.mono,
});

export const frameName = style({
  color: vars.color.text,
  fontWeight: 600,
});

export const frameEmpty = style({
  fontSize: vars.fontSize.sm,
  color: vars.color.textMuted,
  fontFamily: vars.font.mono,
  paddingLeft: vars.space.md,
  paddingBottom: vars.space.xs,
});
