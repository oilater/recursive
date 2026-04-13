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
  position: "relative",
  overflow: "hidden",
  cursor: "pointer",
  ":hover": {
    borderColor: vars.color.primary,
    transform: "translateY(-2px)",
    boxShadow: "0 4px 12px rgba(99, 102, 241, 0.15)",
  },
});

export const lockedCard = style([
  card,
  {
    opacity: 0.6,
    ":hover": {
      borderColor: vars.color.border,
      transform: "none",
      boxShadow: "none",
    },
  },
]);

export const premiumBadge = style({
  position: "absolute",
  top: vars.space.sm,
  right: vars.space.sm,
  padding: `2px ${vars.space.sm}`,
  backgroundColor: "#f59e0b20",
  color: "#f59e0b",
  borderRadius: vars.radius.full,
  fontSize: vars.fontSize.xs,
  fontWeight: "600",
});

export const lockOverlay = style({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(15, 15, 19, 0.5)",
  backdropFilter: "blur(2px)",
  fontSize: "32px",
  opacity: 0,
  transition: "opacity 0.2s ease",
  selectors: {
    [`${card}:hover &, ${lockedCard}:hover &`]: {
      opacity: 1,
    },
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
  marginBottom: vars.space.md,
  lineHeight: 1.5,
});

export const footer = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.sm,
  marginTop: "auto",
});
