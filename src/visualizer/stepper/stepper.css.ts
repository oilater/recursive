import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

export const container = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.sm,
  padding: vars.space.md,
  backgroundColor: vars.color.surface,
  borderRadius: vars.radius.lg,
  border: `1px solid ${vars.color.border}`,
});

export const controls = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: vars.space.sm,
});

export const controlButton = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "36px",
  height: "36px",
  borderRadius: vars.radius.md,
  backgroundColor: vars.color.surfaceAlt,
  color: vars.color.text,
  fontSize: vars.fontSize.md,
  transition: "background-color 0.15s ease, opacity 0.15s ease",
  ":hover": {
    backgroundColor: vars.color.primary,
  },
  selectors: {
    "&[data-disabled='true']": {
      opacity: 0.3,
      pointerEvents: "none",
    },
  },
});

export const playButton = style([
  controlButton,
  {
    width: "44px",
    height: "44px",
    borderRadius: vars.radius.full,
    backgroundColor: vars.color.primary,
    fontSize: vars.fontSize.lg,
    ":hover": {
      backgroundColor: vars.color.primaryLight,
    },
  },
]);

export const progressContainer = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.sm,
});

export const progressBar = style({
  flex: 1,
  height: "6px",
  backgroundColor: vars.color.surfaceAlt,
  borderRadius: vars.radius.full,
  cursor: "pointer",
  position: "relative",
  overflow: "hidden",
});

export const progressFill = style({
  height: "100%",
  backgroundColor: vars.color.primary,
  borderRadius: vars.radius.full,
  transition: "width 0.15s ease",
});

export const stepInfo = style({
  fontSize: vars.fontSize.xs,
  color: vars.color.textMuted,
  fontFamily: vars.font.mono,
  whiteSpace: "nowrap",
  minWidth: "80px",
  textAlign: "center",
});

export const speedControls = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: vars.space.xs,
});

export const speedButton = style({
  padding: `${vars.space.xs} ${vars.space.sm}`,
  borderRadius: vars.radius.sm,
  fontSize: vars.fontSize.xs,
  color: vars.color.textMuted,
  backgroundColor: "transparent",
  transition: "all 0.15s ease",
  ":hover": {
    color: vars.color.text,
    backgroundColor: vars.color.surfaceAlt,
  },
  selectors: {
    "&[data-active='true']": {
      color: vars.color.primary,
      backgroundColor: vars.color.surfaceAlt,
      fontWeight: "600",
    },
  },
});

export const description = style({
  fontSize: vars.fontSize.sm,
  color: vars.color.text,
  textAlign: "center",
  padding: `${vars.space.xs} ${vars.space.sm}`,
  backgroundColor: vars.color.surfaceAlt,
  borderRadius: vars.radius.md,
  minHeight: "32px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});
