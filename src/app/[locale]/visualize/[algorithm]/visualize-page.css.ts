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
  "@media": {
    "(max-width: 768px)": {
      overflow: "auto",
    },
  },
});

export const vizRow = style({
  display: "flex",
  flex: 1,
  overflow: "hidden",
  gap: vars.space.md,
  "@media": {
    "(max-width: 768px)": {
      flexDirection: "column",
      overflow: "auto",
    },
  },
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

export const embedButton = style({
  padding: `${vars.space.xs} ${vars.space.md}`,
  backgroundColor: "transparent",
  color: vars.color.textMuted,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  fontSize: vars.fontSize.xs,
  cursor: "pointer",
  whiteSpace: "nowrap",
  ":hover": {
    color: vars.color.text,
    borderColor: vars.color.text,
  },
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
