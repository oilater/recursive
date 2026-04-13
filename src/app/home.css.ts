import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

export const page = style({
  minHeight: "100vh",
  padding: `${vars.space.xxl} ${vars.space.lg}`,
  maxWidth: "960px",
  margin: "0 auto",
});

export const hero = style({
  textAlign: "center",
  marginBottom: vars.space.xxl,
  paddingTop: vars.space.xxl,
});

export const title = style({
  fontSize: "48px",
  fontWeight: "800",
  letterSpacing: "-0.02em",
  marginBottom: vars.space.md,
  background: "linear-gradient(135deg, #4ade80, #22d3ee)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
});

export const subtitle = style({
  fontSize: vars.fontSize.md,
  color: vars.color.textMuted,
  maxWidth: "480px",
  margin: "0 auto",
  lineHeight: 1.7,
});

export const sectionTitle = style({
  fontSize: vars.fontSize.lg,
  fontWeight: "600",
  marginBottom: vars.space.md,
  color: vars.color.text,
});

export const grid = style({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  gap: vars.space.md,
  marginBottom: vars.space.xxl,
});

// ── 카드 공통 ──

const cardBase = {
  display: "flex",
  flexDirection: "column" as const,
  padding: vars.space.lg,
  borderRadius: vars.radius.lg,
  border: `1px solid ${vars.color.border}`,
  backgroundColor: vars.color.surface,
  textDecoration: "none",
  color: vars.color.text,
  transition: "all 0.2s ease",
  cursor: "pointer",
};

export const customCard = style({
  ...cardBase,
  marginBottom: vars.space.xl,
  background: `linear-gradient(135deg, rgba(74, 222, 128, 0.06), rgba(34, 211, 238, 0.06))`,
  border: `1px solid rgba(74, 222, 128, 0.2)`,
  ":hover": {
    borderColor: "rgba(74, 222, 128, 0.5)",
    transform: "translateY(-2px)",
    boxShadow: "0 8px 24px rgba(74, 222, 128, 0.1)",
  },
});

export const customCardIcon = style({
  fontSize: "20px",
  marginBottom: vars.space.sm,
  color: "#4ade80",
  fontFamily: vars.font.mono,
  fontWeight: "700",
});

export const customCardTitle = style({
  fontSize: vars.fontSize.lg,
  fontWeight: "700",
  marginBottom: vars.space.xs,
});

export const customCardDesc = style({
  fontSize: vars.fontSize.sm,
  color: vars.color.textMuted,
  lineHeight: 1.5,
});
