import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

export const card = style({
  display: "flex",
  flexDirection: "column",
  padding: vars.space.lg,
  backgroundColor: vars.color.surface,
  borderRadius: vars.radius.lg,
  border: `1px solid ${vars.color.border}`,
  textDecoration: "none",
  color: vars.color.text,
  transition: "all 0.2s ease",
  cursor: "pointer",
  ":hover": {
    borderColor: "rgba(74, 222, 128, 0.4)",
    transform: "translateY(-2px)",
    boxShadow: "0 8px 24px rgba(74, 222, 128, 0.08)",
  },
});

export const name = style({
  fontSize: vars.fontSize.lg,
  fontWeight: "600",
  marginBottom: vars.space.xs,
});

export const description = style({
  fontSize: vars.fontSize.sm,
  color: vars.color.textMuted,
  lineHeight: 1.5,
});

export const footer = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.sm,
  marginTop: "auto",
  paddingTop: vars.space.sm,
});
