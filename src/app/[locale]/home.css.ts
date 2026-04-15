import { style, globalStyle } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

export const page = style({
  minHeight: "100vh",
  width: "100%",
  maxWidth: "1040px",
  padding: `${vars.space.md} ${vars.space.lg}`,
  margin: "0 auto",
});

export const hero = style({
  marginBottom: vars.space.xxl,
  paddingTop: vars.space.xxl,
  paddingBottom: vars.space.lg,
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
  opacity: 0.7,
  lineHeight: 1.7,
  maxWidth: "500px",
});

// ── Home cards ──

export const cardGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: vars.space.lg,
  marginBottom: vars.space.xxl,
  "@media": {
    "(max-width: 640px)": {
      gridTemplateColumns: "1fr",
    },
  },
});

export const homeCard = style({
  display: "flex",
  flexDirection: "column",
  padding: vars.space.lg,
  borderRadius: vars.radius.lg,
  border: `1px solid ${vars.color.border}`,
  backgroundColor: vars.color.surface,
  textDecoration: "none",
  color: vars.color.text,
  transition: "all 0.2s ease",
  cursor: "pointer",
  ":hover": {
    borderColor: "#4ade80",
    transform: "translateY(-2px)",
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2)",
  },
});

export const homeCardIcon = style({
  fontSize: "24px",
  fontWeight: "700",
  fontFamily: vars.font.mono,
  marginBottom: vars.space.sm,
  background: "linear-gradient(135deg, #4ade80 0%, #22d3ee 50%, #a78bfa 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
});

export const homeCardTitle = style({
  fontSize: vars.fontSize.lg,
  fontWeight: "700",
  marginBottom: vars.space.sm,
});

export const homeCardDesc = style({
  fontSize: vars.fontSize.sm,
  color: vars.color.textMuted,
  lineHeight: 1.6,
});

// ── Footer ──

export const footer = style({
  textAlign: "center",
  paddingTop: vars.space.xxl,
  paddingBottom: vars.space.lg,
  borderTop: `1px solid ${vars.color.border}`,
  marginTop: vars.space.xl,
});

export const footerLinks = style({
  display: "flex",
  justifyContent: "center",
  gap: vars.space.md,
  marginBottom: vars.space.sm,
  fontSize: vars.fontSize.sm,
});

globalStyle(`${footerLinks} a`, {
  color: vars.color.textSubtle,
  textDecoration: "none",
});

export const footerDot = style({
  color: vars.color.borderLight,
});

export const footerCopy = style({
  fontSize: vars.fontSize.xs,
  color: vars.color.textFaint,
});
