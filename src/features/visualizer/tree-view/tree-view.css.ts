import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

export const container = style({
  width: "100%",
  height: "100%",
  overflow: "hidden",
  position: "relative",
  backgroundColor: vars.color.surface,
  borderRadius: vars.radius.lg,
  border: `1px solid ${vars.color.border}`,
});

export const svgStyle = style({
  display: "block",
  width: "100%",
  height: "100%",
});

export const nodeGroup = style({
  cursor: "pointer",
  transition: "opacity 0.3s ease",
});

export const nodeCircle = style({
  transition: "fill 0.3s ease, stroke 0.3s ease",
});

export const nodeText = style({
  fill: "white",
  fontSize: "10px",
  fontFamily: vars.font.mono,
  textAnchor: "middle",
  dominantBaseline: "middle",
  pointerEvents: "none",
  userSelect: "none",
});

export const edgeLine = style({
  transition: "stroke 0.3s ease, opacity 0.3s ease",
  fill: "none",
});
