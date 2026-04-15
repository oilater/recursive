import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

export const trigger = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  padding: "6px 12px",
  backgroundColor: "transparent",
  color: vars.color.text,
  border: "none",
  borderRadius: "6px",
  fontSize: vars.fontSize.md,
  cursor: "pointer",
  ":hover": {
    backgroundColor: vars.color.surfaceHover,
  },
});

export const dropdown = style({
  position: "absolute",
  top: "calc(100% + 6px)",
  right: 0,
  minWidth: "90px",
  backgroundColor: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: "8px",
  overflow: "hidden",
  zIndex: 50,
  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)",
});

export const option = style({
  display: "block",
  width: "100%",
  padding: "8px 16px",
  backgroundColor: "transparent",
  color: vars.color.textMuted,
  border: "none",
  fontSize: vars.fontSize.sm,
  textAlign: "left",
  cursor: "pointer",
  ":hover": {
    backgroundColor: vars.color.surfaceAlt,
    color: vars.color.text,
  },
});

export const optionActive = style({
  color: vars.color.text,
  fontWeight: 600,
});
