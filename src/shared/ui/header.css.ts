import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

export const header = style({
  display: "flex",
  alignItems: "center",
  padding: `${vars.space.sm} ${vars.space.lg}`,
  backgroundColor: "transparent",
  flexShrink: 0,
  position: "relative",
  zIndex: 10,
});

export const left = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.md,
  flex: 1,
  minWidth: 0,
});

export const logoLink = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  textDecoration: "none",
  color: vars.color.text,
});

export const logoText = style({
  fontSize: "20px",
  fontWeight: 700,
  letterSpacing: "-0.02em",
  color: vars.color.text,
  fontFamily: "var(--font-plus-jakarta), sans-serif",
});

export const center = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.sm,
});

// ── Desktop nav ──

export const desktopRight = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.sm,
  flex: 1,
  justifyContent: "flex-end",
  minWidth: 0,
  "@media": {
    "(max-width: 640px)": {
      display: "none",
    },
  },
});

export const nav = style({
  display: "flex",
  alignItems: "center",
  gap: "4px",
});

export const navLink = style({
  padding: "6px 12px",
  fontSize: vars.fontSize.md,
  color: vars.color.text,
  textDecoration: "none",
  transition: "color 0.15s ease",
  ":hover": {
    color: "#4ade80",
  },
});

export const sponsorLink = style({
  padding: "4px 12px",
  fontSize: vars.fontSize.sm,
  color: "#db61a2",
  textDecoration: "none",
  border: "1px solid #db61a2",
  borderRadius: vars.radius.md,
  transition: "all 0.15s ease",
  ":hover": {
    backgroundColor: "#db61a2",
    color: "#fff",
  },
});

// ── Mobile menu ──

export const mobileRight = style({
  display: "none",
  position: "relative",
  "@media": {
    "(max-width: 640px)": {
      display: "flex",
      alignItems: "center",
    },
  },
});

export const menuButton = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "6px",
  backgroundColor: "transparent",
  color: vars.color.text,
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  ":hover": {
    backgroundColor: vars.color.surfaceHover,
  },
});

export const mobileMenu = style({
  position: "absolute",
  top: "calc(100% + 8px)",
  right: 0,
  minWidth: "180px",
  backgroundColor: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: "8px",
  overflow: "hidden",
  zIndex: 50,
  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)",
});

export const mobileMenuLink = style({
  display: "block",
  padding: "12px 16px",
  fontSize: vars.fontSize.md,
  color: vars.color.text,
  textDecoration: "none",
  transition: "color 0.15s ease",
  ":hover": {
    color: "#4ade80",
  },
});

export const mobileMenuDivider = style({
  height: "1px",
  backgroundColor: vars.color.border,
});

export const mobileLocaleRow = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.sm,
  padding: `${vars.space.sm} ${vars.space.md}`,
  color: vars.color.textMuted,
});

export const mobileLocaleButton = style({
  padding: "4px 12px",
  fontSize: vars.fontSize.sm,
  color: vars.color.textMuted,
  backgroundColor: "transparent",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
  ":hover": {
    backgroundColor: vars.color.surfaceAlt,
    color: vars.color.text,
  },
});

export const mobileLocaleActive = style({
  color: vars.color.text,
  fontWeight: 600,
  backgroundColor: vars.color.surfaceAlt,
});
