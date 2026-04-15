import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

export {
  page,
  backLink,
  leftPanel,
  codeSection,
  middlePanel,
  variableSection,
  rightPanel,
  treeSection,
  bottomPanel,
} from "@/shared/styles/visualizer-layout.css";

export const editLayout = style({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: vars.space.lg,
  overflow: "auto",
});

// ── Editor card ──

export const editorCard = style({
  display: "flex",
  flexDirection: "column",
  width: "100%",
  maxWidth: "960px",
  flex: 1,
  borderRadius: vars.radius.lg,
  border: `1px solid ${vars.color.border}`,
  backgroundColor: vars.color.bg,
  overflow: "hidden",
});

export const editorToolbar = style({
  display: "flex",
  alignItems: "center",
  padding: `${vars.space.sm} ${vars.space.md}`,
  borderBottom: `1px solid ${vars.color.border}`,
  backgroundColor: vars.color.surface,
});

export const toolbarBadge = style({
  fontSize: vars.fontSize.xs,
  color: "#4ade80",
  fontFamily: vars.font.mono,
  padding: `2px ${vars.space.sm}`,
  backgroundColor: "rgba(74, 222, 128, 0.1)",
  border: "1px solid rgba(74, 222, 128, 0.25)",
  borderRadius: vars.radius.sm,
  marginRight: vars.space.sm,
});

export const toolbarLabel = style({
  fontSize: vars.fontSize.xs,
  color: vars.color.textMuted,
  fontFamily: vars.font.mono,
});

export const toolbarRight = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.sm,
  marginLeft: "auto",
});

export const editorBody = style({
  flex: 1,
  overflow: "auto",
  minHeight: 0,
});

// ── Buttons ──

export const runButton = style({
  padding: `${vars.space.sm} ${vars.space.xl}`,
  background: "linear-gradient(135deg, #22d3ee, #38bdf8)",
  color: "#0a0a0a",
  borderRadius: vars.radius.md,
  fontSize: vars.fontSize.sm,
  fontWeight: "700",
  whiteSpace: "nowrap",
  transition: "all 0.15s ease",
  flexShrink: 0,
  ":hover": {
    backgroundColor: vars.color.accentHover,
  },
  selectors: {
    "&:disabled": {
      opacity: 0.3,
      cursor: "not-allowed",
    },
  },
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

// ── Viz layout ──

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
  gap: vars.space.md,
});

// ── Feedback ──

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
  maxWidth: "960px",
  width: "100%",
});