/**
 * Primitive color tokens — raw palette values.
 * Never use these directly in components. Use semantic tokens (vars.color.*) instead.
 */
export const primitive = {
  // Grays (slate scale)
  slate50: "#f8fafc",
  slate100: "#f1f5f9",
  slate200: "#e2e8f0",
  slate300: "#cbd5e1",
  slate400: "#94a3b8",
  slate500: "#64748b",
  slate600: "#475569",
  slate700: "#334155",
  slate800: "#1e293b",
  slate900: "#0f172a",
  slate950: "#020617",

  // Brand
  indigo500: "#6366f1",
  indigo400: "#818cf8",

  // Backgrounds (custom dark)
  dark50: "#24243a",
  dark100: "#1a1a24",
  dark200: "#0f0f13",

  // Borders
  darkBorder: "#2e2e48",

  // Accent
  green400: "#4ade80",
  green500: "#22c55e",
  green800: "#065f46",
  green300: "#6ee7b7",
  cyan400: "#22d3ee",
  sky400: "#38bdf8",
  sky500: "#0ea5e9",
  violet400: "#a78bfa",

  // Feedback
  amber400: "#fbbf24",
  red500: "#ef4444",
  amber500: "#f59e0b",
} as const;
