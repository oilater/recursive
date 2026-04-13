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
  fontSize: "56px",
  fontWeight: "800",
  letterSpacing: "-0.03em",
  marginBottom: vars.space.md,
  background: "linear-gradient(135deg, #4ade80 0%, #22d3ee 50%, #a78bfa 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  filter: "drop-shadow(0 0 30px rgba(74, 222, 128, 0.15))",
});

export const subtitle = style({
  fontSize: vars.fontSize.lg,
  color: vars.color.textMuted,
  maxWidth: "520px",
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
  background: `linear-gradient(135deg, rgba(56, 189, 248, 0.06), rgba(99, 102, 241, 0.06))`,
  border: `1px solid rgba(56, 189, 248, 0.2)`,
  ":hover": {
    borderColor: "rgba(56, 189, 248, 0.5)",
    transform: "translateY(-2px)",
    boxShadow: "0 8px 24px rgba(56, 189, 248, 0.1)",
  },
});

export const customCardIcon = style({
  fontSize: "20px",
  marginBottom: vars.space.sm,
  color: "#38bdf8",
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
