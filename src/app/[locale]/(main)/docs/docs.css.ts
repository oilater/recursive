import { style, globalStyle } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

export const page = style({
  width: "100%",
  maxWidth: "1040px",
  padding: `${vars.space.md} ${vars.space.lg}`,
  margin: "0 auto",
});

export const hero = style({
  paddingTop: vars.space.xl,
  marginBottom: vars.space.xxl,
});

export const heroTitle = style({
  fontSize: "40px",
  fontWeight: "700",
  color: vars.color.text,
  fontFamily: "var(--font-plus-jakarta), sans-serif",
  marginBottom: vars.space.xs,
});

export const heroSubtitle = style({
  fontSize: vars.fontSize.lg,
  color: vars.color.textMuted,
});

export const githubLink = style({
  color: vars.color.text,
  textDecoration: "none",
  fontWeight: "600",
  ":hover": {
    textDecoration: "underline",
  },
});

export const tipBadge = style({
  color: "#4ade80",
  marginRight: vars.space.sm,
});

export const stepTitle = style({
  fontSize: vars.fontSize.xl,
  fontWeight: "700",
  color: vars.color.text,
  marginBottom: vars.space.sm,
});

export const stepDesc = style({
  fontSize: vars.fontSize.lg,
  color: vars.color.text,
  opacity: 0.8,
  lineHeight: 1.8,
  marginBottom: vars.space.lg,
});

// ── Sections ──

export const section = style({
  marginBottom: vars.space.xxl,
});

export const sectionTitle = style({
  fontSize: vars.fontSize.xl,
  fontWeight: "700",
  color: vars.color.text,
  marginBottom: vars.space.lg,
});

export const subTitle = style({
  fontSize: vars.fontSize.lg,
  fontWeight: "600",
  color: "#4ade80",
  marginTop: vars.space.lg,
  marginBottom: vars.space.sm,
});

export const body = style({
  fontSize: vars.fontSize.lg,
  color: vars.color.text,
  opacity: 0.85,
  lineHeight: 1.8,
  marginBottom: vars.space.md,
});

// ── Lists ──

export const list = style({
  padding: 0,
  paddingLeft: vars.space.lg,
  display: "flex",
  flexDirection: "column",
  gap: vars.space.md,
  fontSize: vars.fontSize.lg,
  color: vars.color.text,
  opacity: 0.85,
  lineHeight: 1.8,
});

export const numberedList = style({
  paddingLeft: vars.space.lg,
  display: "flex",
  flexDirection: "column",
  gap: vars.space.sm,
  fontSize: vars.fontSize.lg,
  color: vars.color.text,
  opacity: 0.85,
  lineHeight: 1.8,
  marginBottom: vars.space.lg,
});

// ── Examples ──

export const blockTitle = style({
  fontSize: vars.fontSize.xl,
  fontWeight: "600",
  color: vars.color.text,
  marginBottom: vars.space.sm,
});

export const blockHint = style({
  fontSize: vars.fontSize.sm,
  color: vars.color.textMuted,
  marginBottom: vars.space.sm,
});

export const example = style({
  marginBottom: vars.space.xxl,
});

export const exampleLabel = style({
  fontSize: vars.fontSize.md,
  fontWeight: "600",
  color: vars.color.textMuted,
  marginBottom: vars.space.sm,
});

export const embedFrame = style({
  width: "100%",
  height: "700px",
  border: "none",
  borderRadius: vars.radius.lg,
  marginTop: vars.space.md,
});

export const argsHint = style({
  fontSize: vars.fontSize.md,
  color: "#4ade80",
  fontFamily: vars.font.mono,
  marginTop: vars.space.sm,
});

export const codeBlock = style({
  margin: 0,
  padding: vars.space.md,
  backgroundColor: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  fontSize: vars.fontSize.md,
  fontFamily: vars.font.mono,
  color: vars.color.text,
  lineHeight: 1.6,
  overflow: "auto",
  whiteSpace: "pre",
  marginBottom: vars.space.md,
});

globalStyle(`${codeBlock} pre`, {
  margin: 0,
  padding: 0,
  background: "transparent !important",
});

globalStyle(`${codeBlock} code`, {
  background: "transparent !important",
});
