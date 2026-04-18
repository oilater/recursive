import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

export const page = style({
  width: "100%",
  maxWidth: "1040px",
  padding: `${vars.space.md} ${vars.space.lg}`,
  margin: "0 auto",
});

export const hero = style({
  marginBottom: vars.space.xl,
  paddingTop: vars.space.xxl,
  paddingBottom: vars.space.md,
});

export const title = style({
  fontSize: "56px",
  fontWeight: "700",
  letterSpacing: "-0.03em",
  lineHeight: 1.15,
  marginBottom: vars.space.md,
  fontFamily: "var(--font-plus-jakarta), sans-serif",
  background: "linear-gradient(135deg, #4ade80 0%, #22d3ee 50%, #a78bfa 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  filter: "drop-shadow(0 0 30px rgba(74, 222, 128, 0.15))",
});

export const titleWhite = style({
  background: "none",
  WebkitBackgroundClip: "unset",
  WebkitTextFillColor: "#ffffff",
});

export const subtitle = style({
  fontSize: "16px",
  color: vars.color.text,
  opacity: 0.85,
  lineHeight: 1.7,
  maxWidth: "500px",
});

export const docsGuide = style({
  fontSize: "16px",
  color: vars.color.text,
  opacity: 0.85,
  lineHeight: 1.7,
  maxWidth: "500px",
  marginTop: vars.space.xs,
});

export const docsGuideCenter = style({
  textAlign: "right",
  marginTop: vars.space.sm,
});

export const docsLink = style({
  fontSize: "16px",
  color: vars.color.text,
  opacity: 0.85,
  textDecoration: "none",
  ":hover": {
    color: "#4ade80",
    opacity: 1,
  },
});

export const langRow = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.sm,
  marginTop: vars.space.sm,
});

export const langBadge = style({
  fontSize: vars.fontSize.xs,
  color: "#4ade80",
  fontFamily: vars.font.mono,
  padding: `2px ${vars.space.sm}`,
  backgroundColor: "rgba(74, 222, 128, 0.1)",
  border: "1px solid rgba(74, 222, 128, 0.25)",
  borderRadius: vars.radius.sm,
});

export const langList = style({
  fontSize: vars.fontSize.xs,
  color: vars.color.text,
  opacity: 0.7,
  fontFamily: vars.font.mono,
});

export const errorText = style({
  fontSize: vars.fontSize.sm,
  color: vars.color.error,
  fontFamily: vars.font.mono,
  marginRight: "auto",
});

// ── Home editor ──

export const editorCard = style({
  display: "flex",
  flexDirection: "column",
  borderRadius: "16px",
  border: `1px solid ${vars.color.border}`,
  backgroundColor: vars.color.bg,
  overflow: "hidden",
  transition: "border-color 0.2s ease",
  selectors: {
    "&:focus-within": {
      borderColor: "rgba(74, 222, 128, 0.4)",
      boxShadow: "0 0 12px rgba(74, 222, 128, 0.15)",
    },
  },
});

export const actionBar = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.sm,
  marginBottom: vars.space.md,
});

export const actionRight = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.sm,
  marginLeft: "auto",
});

export const runButton = style({
  padding: `${vars.space.sm} ${vars.space.xl}`,
  background: "linear-gradient(135deg, #4ade80, #22d3ee)",
  color: "#0a0a0a",
  borderRadius: "20px",
  fontSize: vars.fontSize.sm,
  fontWeight: "700",
  whiteSpace: "nowrap",
  transition: "all 0.15s ease",
  flexShrink: 0,
  ":hover": {
    opacity: 0.9,
  },
  selectors: {
    "&:disabled": {
      opacity: 0.3,
      cursor: "not-allowed",
    },
  },
});

export const editorBody = style({
  height: "350px",
  overflow: "auto",
  cursor: "text",
});

export const exampleRow = style({
  display: "flex",
  gap: vars.space.sm,
  marginTop: vars.space.sm,
});

export const exampleButton = style({
  padding: `${vars.space.xs} ${vars.space.md}`,
  backgroundColor: "transparent",
  color: vars.color.text,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.sm,
  fontSize: vars.fontSize.xs,
  fontFamily: vars.font.mono,
  cursor: "pointer",
  transition: "all 0.15s ease",
  ":hover": {
    color: "#ffffff",
    borderColor: "rgba(74, 222, 128, 0.4)",
    backgroundColor: "rgba(74, 222, 128, 0.05)",
  },
});
