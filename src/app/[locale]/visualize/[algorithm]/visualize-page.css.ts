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
