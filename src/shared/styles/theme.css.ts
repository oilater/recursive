import { createGlobalTheme, createGlobalThemeContract } from "@vanilla-extract/css";
import { primitive } from "./colors";

export const vars = createGlobalThemeContract({
  color: {
    // Brand
    primary: "color-primary",
    primaryLight: "color-primary-light",

    // Backgrounds
    bg: "color-bg",
    surface: "color-surface",
    surfaceAlt: "color-surface-alt",
    surfaceHover: "color-surface-hover",

    // Text
    text: "color-text",
    textMuted: "color-text-muted",
    textSubtle: "color-text-subtle",
    textFaint: "color-text-faint",

    // Border
    border: "color-border",
    borderLight: "color-border-light",

    // Feedback
    highlight: "color-highlight",
    highlightText: "color-highlight-text",
    success: "color-success",
    error: "color-error",
    warning: "color-warning",

    // Accent
    accent: "color-accent",
    accentHover: "color-accent-hover",
    accentText: "color-accent-text",

    // Tree nodes
    nodeIdle: "color-node-idle",
    nodeActive: "color-node-active",
    nodeCompleted: "color-node-completed",
    nodeBacktracked: "color-node-backtracked",
  },
  space: {
    xs: "space-xs",
    sm: "space-sm",
    md: "space-md",
    lg: "space-lg",
    xl: "space-xl",
    xxl: "space-xxl",
  },
  fontSize: {
    xs: "font-size-xs",
    sm: "font-size-sm",
    md: "font-size-md",
    lg: "font-size-lg",
    xl: "font-size-xl",
    xxl: "font-size-xxl",
  },
  radius: {
    sm: "radius-sm",
    md: "radius-md",
    lg: "radius-lg",
    full: "radius-full",
  },
  font: {
    body: "font-body",
    mono: "font-mono",
  },
});

createGlobalTheme(":root", vars, {
  color: {
    // Brand
    primary: primitive.indigo500,
    primaryLight: primitive.indigo400,

    // Backgrounds
    bg: primitive.dark200,
    surface: primitive.dark100,
    surfaceAlt: primitive.dark50,
    surfaceHover: primitive.slate800,

    // Text
    text: primitive.slate200,
    textMuted: primitive.slate400,
    textSubtle: primitive.slate500,
    textFaint: primitive.slate600,

    // Border
    border: primitive.darkBorder,
    borderLight: primitive.slate700,

    // Feedback
    highlight: primitive.amber400,
    highlightText: primitive.dark100,
    success: primitive.green500,
    error: primitive.red500,
    warning: primitive.amber500,

    // Accent
    accent: primitive.sky400,
    accentHover: primitive.sky500,
    accentText: primitive.dark200,

    // Tree nodes
    nodeIdle: primitive.slate600,
    nodeActive: primitive.amber400,
    nodeCompleted: primitive.green500,
    nodeBacktracked: primitive.red500,
  },
  space: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px",
    xxl: "48px",
  },
  fontSize: {
    xs: "11px",
    sm: "13px",
    md: "15px",
    lg: "18px",
    xl: "24px",
    xxl: "32px",
  },
  radius: {
    sm: "4px",
    md: "8px",
    lg: "12px",
    full: "9999px",
  },
  font: {
    body: "'Pretendard Variable', 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif",
    mono: "'Geist Mono', monospace",
  },
});
