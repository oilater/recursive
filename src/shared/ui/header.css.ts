import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

export const header = style({
  display: "flex",
  alignItems: "center",
  padding: `${vars.space.sm} 0`,
  backgroundColor: "transparent",
  flexShrink: 0,
});

export const left = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.sm,
  flex: 1,
  minWidth: 0,
});

export const center = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.sm,
});

export const right = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.sm,
  flex: 1,
  justifyContent: "flex-end",
  minWidth: 0,
});
