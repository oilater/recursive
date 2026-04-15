import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";
import { panelContainer, panelTitleWithBadge } from "@/shared/styles/panel.css";

export const container = style([panelContainer, { maxHeight: "200px" }]);

export const title = panelTitleWithBadge;

export const depthBadge = style({
  padding: `0 ${vars.space.xs}`,
  borderRadius: vars.radius.full,
  backgroundColor: vars.color.surfaceAlt,
  fontSize: vars.fontSize.xs,
  fontFamily: vars.font.mono,
});

export const frame = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.xs,
  padding: `3px ${vars.space.sm}`,
  fontFamily: vars.font.mono,
  fontSize: vars.fontSize.xs,
  color: vars.color.textMuted,
  borderLeft: "2px solid transparent",
  transition: "all 0.15s ease",
});

export const frameActive = style([
  frame,
  {
    color: vars.color.text,
    backgroundColor: "rgba(251, 191, 36, 0.1)",
    borderLeftColor: vars.color.highlight,
    fontWeight: "600",
  },
]);

export const frameIndent = style({
  display: "inline-block",
  width: "16px",
  flexShrink: 0,
});

export const frameArrow = style({
  color: vars.color.primary,
  flexShrink: 0,
});
