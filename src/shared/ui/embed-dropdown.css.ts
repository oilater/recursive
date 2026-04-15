import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

export const trigger = style({
  padding: `${vars.space.xs} ${vars.space.md}`,
  backgroundColor: "transparent",
  color: vars.color.text,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  fontSize: vars.fontSize.sm,
  cursor: "pointer",
  whiteSpace: "nowrap",
  ":hover": {
    color: vars.color.text,
    borderColor: vars.color.text,
  },
});

export const dropdown = style({
  position: "absolute",
  top: "calc(100% + 8px)",
  right: 0,
  width: "400px",
  backgroundColor: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.lg,
  padding: vars.space.md,
  zIndex: 50,
  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)",
  "@media": {
    "(max-width: 768px)": {
      width: "calc(100vw - 32px)",
      right: "-8px",
    },
  },
});

export const section = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.xs,
});

export const label = style({
  fontSize: vars.fontSize.xs,
  color: vars.color.textMuted,
  fontWeight: 600,
});

export const codeRow = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.sm,
});

export const code = style({
  flex: 1,
  fontSize: vars.fontSize.xs,
  fontFamily: vars.font.mono,
  color: vars.color.text,
  backgroundColor: vars.color.surfaceAlt,
  padding: `${vars.space.xs} ${vars.space.sm}`,
  borderRadius: vars.radius.sm,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const copyButton = style({
  padding: `${vars.space.xs} ${vars.space.sm}`,
  backgroundColor: vars.color.surfaceAlt,
  color: vars.color.text,
  border: "none",
  borderRadius: vars.radius.sm,
  fontSize: vars.fontSize.xs,
  cursor: "pointer",
  whiteSpace: "nowrap",
  flexShrink: 0,
  ":hover": {
    backgroundColor: vars.color.surfaceHover,
  },
});

export const divider = style({
  height: "1px",
  backgroundColor: vars.color.border,
  margin: `${vars.space.sm} 0`,
});
