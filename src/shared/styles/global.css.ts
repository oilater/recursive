import { globalStyle } from "@vanilla-extract/css";
import { vars } from "./theme.css";

globalStyle("*, *::before, *::after", {
  boxSizing: "border-box",
  margin: 0,
  padding: 0,
});

globalStyle("html, body", {
  height: "100%",
  fontFamily: vars.font.body,
  backgroundColor: vars.color.bg,
  color: vars.color.text,
  fontSize: vars.fontSize.md,
  lineHeight: 1.6,
  WebkitFontSmoothing: "antialiased",
  MozOsxFontSmoothing: "grayscale",
});

globalStyle("a", {
  color: vars.color.primary,
  textDecoration: "none",
});

globalStyle("a:hover", {
  color: vars.color.primaryLight,
});

globalStyle("code, pre", {
  fontFamily: vars.font.mono,
});

globalStyle("button", {
  cursor: "pointer",
  border: "none",
  background: "none",
  fontFamily: "inherit",
  fontSize: "inherit",
  color: "inherit",
});

globalStyle("input, select", {
  fontFamily: "inherit",
  fontSize: "inherit",
});
