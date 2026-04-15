import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

export {
  page,
  backLink,
  leftPanel,
  codeSection,
  middlePanel,
  variableSection,
  rightPanel,
  treeSection,
  bottomPanel,
} from "@/shared/styles/visualizer-layout.css";

export const algoTitle = style({
  fontSize: vars.fontSize.md,
  fontWeight: "600",
  color: vars.color.text,
});

export const mainContent = style({
  display: "flex",
  flexDirection: "column",
  flex: 1,
  overflow: "hidden",
  padding: vars.space.sm,
  gap: vars.space.sm,
});

export const argsBar = style({
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: `${vars.space.sm} ${vars.space.md}`,
  backgroundColor: vars.color.surface,
  borderRadius: `${vars.radius.md} ${vars.radius.md} 0 0`,
  border: `1px solid ${vars.color.border}`,
  borderBottom: "none",
  fontSize: vars.fontSize.sm,
  fontFamily: vars.font.mono,
});

export const errorMessage = style({
  padding: vars.space.xl,
  color: vars.color.error,
});

export const loadingMessage = style({
  padding: vars.space.xl,
  color: vars.color.textMuted,
});

export const applyButton = style({
  padding: `${vars.space.xs} ${vars.space.md}`,
  backgroundColor: "#065f46",
  color: "#6ee7b7",
  border: "1px solid #047857",
  borderRadius: vars.radius.sm,
  fontSize: vars.fontSize.xs,
  cursor: "pointer",
  whiteSpace: "nowrap",
  fontWeight: 500,
  ":hover": {
    backgroundColor: "#047857",
  },
});
