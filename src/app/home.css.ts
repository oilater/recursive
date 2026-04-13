import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

export const page = style({
  minHeight: "100vh",
  padding: vars.space.xxl,
  maxWidth: "1200px",
  margin: "0 auto",
});

export const hero = style({
  textAlign: "center",
  marginBottom: vars.space.xxl,
});

export const title = style({
  fontSize: vars.fontSize.xxl,
  fontWeight: "700",
  marginBottom: vars.space.sm,
  background: `linear-gradient(135deg, ${vars.color.primary}, ${vars.color.highlight})`,
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
});

export const subtitle = style({
  fontSize: vars.fontSize.lg,
  color: vars.color.textMuted,
  maxWidth: "600px",
  margin: "0 auto",
  lineHeight: 1.6,
});

export const sectionTitle = style({
  fontSize: vars.fontSize.xl,
  fontWeight: "600",
  marginBottom: vars.space.lg,
  color: vars.color.text,
});

export const sectionSub = style({
  fontSize: vars.fontSize.sm,
  color: vars.color.textMuted,
  marginBottom: vars.space.md,
});

export const grid = style({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  gap: vars.space.lg,
  marginBottom: vars.space.xxl,
});

export const customCard = style({
  display: "flex",
  flexDirection: "column",
  padding: vars.space.lg,
  background: `linear-gradient(135deg, ${vars.color.primary}15, ${vars.color.highlight}15)`,
  borderRadius: vars.radius.lg,
  border: `2px solid ${vars.color.primary}40`,
  textDecoration: "none",
  color: vars.color.text,
  transition: "all 0.2s ease",
  cursor: "pointer",
  marginBottom: vars.space.xxl,
  ":hover": {
    borderColor: vars.color.primary,
    transform: "translateY(-2px)",
    boxShadow: `0 4px 16px ${vars.color.primary}30`,
  },
});

export const customCardIcon = style({
  fontSize: "32px",
  marginBottom: vars.space.sm,
});

export const customCardTitle = style({
  fontSize: vars.fontSize.xl,
  fontWeight: "700",
  marginBottom: vars.space.xs,
});

export const customCardDesc = style({
  fontSize: vars.fontSize.md,
  color: vars.color.textMuted,
  lineHeight: 1.5,
});
