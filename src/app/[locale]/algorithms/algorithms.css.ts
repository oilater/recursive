import { style } from "@vanilla-extract/css";
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
  paddingTop: vars.space.xl,
});

export const title = style({
  fontSize: vars.fontSize.xxl,
  fontWeight: "700",
  color: vars.color.text,
  marginBottom: vars.space.sm,
});

export const subtitle = style({
  fontSize: "16px",
  color: vars.color.textMuted,
});

export const sectionTitle = style({
  fontSize: vars.fontSize.xl,
  fontWeight: "600",
  marginBottom: vars.space.xs,
  color: vars.color.text,
});

export const sectionDesc = style({
  fontSize: "14px",
  color: vars.color.textMuted,
  marginBottom: vars.space.md,
});

export const grid = style({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  gap: vars.space.md,
});
