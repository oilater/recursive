import { style } from "@vanilla-extract/css";
import { vars } from "@/shared/styles/theme.css";

export {
  leftPanel,
  codeSection,
  middlePanel,
  variableSection,
  rightPanel,
  treeSection,
  bottomPanel,
} from "@/shared/styles/visualizer-layout.css";

export const page = style({
  display: "flex",
  flexDirection: "column",
  height: "100vh",
  overflow: "hidden",
  backgroundColor: vars.color.bg,
});

export const vizContainer = style({
  display: "flex",
  flexDirection: "column",
  flex: 1,
  overflow: "hidden",
  padding: vars.space.sm,
  gap: vars.space.sm,
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
