import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

export const trigger = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  padding: "6px 12px",
  backgroundColor: "transparent",
  color: vars.color.textMuted,
  border: "none",
  borderRadius: "6px",
  fontSize: "13px",
  cursor: "pointer",
  ":hover": {
    backgroundColor: vars.color.surfaceHover,
  },
});

export const dropdown = style({
  position: "absolute",
  top: "calc(100% + 4px)",
  right: 0,
  minWidth: "80px",
  backgroundColor: vars.color.surfaceHover,
  border: "1px solid #334155",
  borderRadius: "6px",
  overflow: "hidden",
  zIndex: 50,
});

export const option = style({
  display: "block",
  width: "100%",
  padding: "8px 14px",
  backgroundColor: "transparent",
  color: vars.color.textMuted,
  border: "none",
  fontSize: "13px",
  textAlign: "left",
  cursor: "pointer",
  ":hover": {
    backgroundColor: vars.color.borderLight,
  },
});

export const optionActive = style({
  backgroundColor: vars.color.borderLight,
  color: vars.color.text,
});
