import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Recursive — Watch your code run, step by step.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "#0f0f13",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "48px",
          }}
        >
          <svg width="48" height="48" viewBox="0 0 32 32">
            <rect width="32" height="32" rx="8" fill="#0f0f13" stroke="#2e2e48" strokeWidth="1" />
            <path
              d="M6 16 C10 8, 14 24, 18 16 S26 8, 26 16"
              fill="none"
              stroke="#4ade80"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
          <span style={{ fontSize: "32px", fontWeight: 700, color: "#e2e8f0" }}>
            Recursive
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <span style={{ fontSize: "64px", fontWeight: 700, lineHeight: 1.15, color: "#4ade80" }}>
            Watch your code run,
          </span>
          <span style={{ fontSize: "64px", fontWeight: 700, lineHeight: 1.15, color: "#4ade80" }}>
            step by step.
          </span>
        </div>

        <span
          style={{
            fontSize: "24px",
            color: "#94a3b8",
            marginTop: "32px",
          }}
        >
          Python · JavaScript · TypeScript
        </span>
      </div>
    ),
    { ...size },
  );
}
