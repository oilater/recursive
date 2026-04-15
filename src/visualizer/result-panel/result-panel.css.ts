import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";
import { panelContainer, panelTitleWithBadge } from "@/shared/styles/panel.css";

export const container = style([panelContainer, { maxHeight: "200px" }]);

export const title = panelTitleWithBadge;

export const countBadge = style({
  padding: `0 ${vars.space.xs}`,
  borderRadius: vars.radius.full,
  backgroundColor: "rgba(34, 197, 94, 0.15)",
  color: "#22c55e",
  fontSize: vars.fontSize.xs,
  fontFamily: vars.font.mono,
});

export const resultItem = style({
  display: "inline-flex",
  padding: `2px ${vars.space.sm}`,
  margin: "2px",
  backgroundColor: vars.color.surfaceAlt,
  borderRadius: vars.radius.sm,
  fontSize: vars.fontSize.xs,
  fontFamily: vars.font.mono,
  color: vars.color.text,
  transition: "all 0.2s ease",
});

export const resultItemNew = style([
  resultItem,
  {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    outline: "1px solid #22c55e",
  },
]);

export const finalResult = style({
  marginTop: vars.space.sm,
  padding: vars.space.sm,
  backgroundColor: "rgba(99, 102, 241, 0.1)",
  borderRadius: vars.radius.md,
  border: "1px solid rgba(99, 102, 241, 0.3)",
  fontSize: vars.fontSize.sm,
  fontFamily: vars.font.mono,
  color: vars.color.text,
  whiteSpace: "pre-wrap",
  wordBreak: "break-all",
  maxHeight: "80px",
  overflow: "auto",
});

export const consoleBox = style({
  padding: vars.space.sm,
  backgroundColor: "#0d1117",
  borderRadius: vars.radius.md,
  border: `1px solid ${vars.color.border}`,
  fontSize: vars.fontSize.xs,
  fontFamily: vars.font.mono,
  maxHeight: "120px",
  overflow: "auto",
  marginBottom: vars.space.sm,
});

export const consoleLine = style({
  color: "#e2e8f0",
  lineHeight: "1.5",
  selectors: {
    "&::before": {
      content: "'> '",
      color: "#64748b",
    },
  },
});
