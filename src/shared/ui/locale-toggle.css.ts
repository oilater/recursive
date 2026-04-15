import { style } from "@vanilla-extract/css";

export const trigger = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  padding: "6px 12px",
  backgroundColor: "transparent",
  color: "#94a3b8",
  border: "none",
  borderRadius: "6px",
  fontSize: "13px",
  cursor: "pointer",
  ":hover": {
    backgroundColor: "#1e293b",
  },
});

export const dropdown = style({
  position: "absolute",
  top: "calc(100% + 4px)",
  right: 0,
  minWidth: "80px",
  backgroundColor: "#1e293b",
  border: "1px solid #334155",
  borderRadius: "6px",
  overflow: "hidden",
  zIndex: 50,
});

export const option = style({
  display: "block",
  width: "100%",
  padding: "8px 14px",
  backgroundColor: "transparent",
  color: "#94a3b8",
  border: "none",
  fontSize: "13px",
  textAlign: "left",
  cursor: "pointer",
  ":hover": {
    backgroundColor: "#334155",
  },
});

export const optionActive = style({
  backgroundColor: "#334155",
  color: "#e2e8f0",
});
