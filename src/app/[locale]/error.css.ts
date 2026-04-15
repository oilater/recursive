import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

export const container = style({
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: vars.space.md,
  padding: vars.space.xl,
});

export const title = style({
  fontSize: "48px",
  fontWeight: 800,
  color: vars.color.error,
});

export const message = style({
  fontSize: vars.fontSize.md,
  color: vars.color.textMuted,
  textAlign: "center",
  maxWidth: "400px",
});

export const actions = style({
  display: "flex",
  gap: vars.space.sm,
  marginTop: vars.space.sm,
});

export const retryButton = style({
  padding: `${vars.space.sm} ${vars.space.lg}`,
  backgroundColor: vars.color.borderLight,
  color: vars.color.text,
  border: `1px solid ${vars.color.textFaint}`,
  borderRadius: vars.radius.md,
  fontSize: vars.fontSize.sm,
  cursor: "pointer",
  ":hover": {
    backgroundColor: vars.color.surfaceHover,
  },
});

export const homeLink = style({
  padding: `${vars.space.sm} ${vars.space.lg}`,
  backgroundColor: "#065f46",
  color: "#6ee7b7",
  border: "1px solid #047857",
  borderRadius: vars.radius.md,
  fontSize: vars.fontSize.sm,
  textDecoration: "none",
  ":hover": {
    backgroundColor: "#047857",
  },
});
