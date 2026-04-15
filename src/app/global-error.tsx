"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
          padding: "32px",
          backgroundColor: "#0f0f13",
          color: "#e2e8f0",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <h1 style={{ fontSize: "48px", fontWeight: 800, color: "#ef4444" }}>Oops!</h1>
        <p style={{ fontSize: "16px", color: "#94a3b8" }}>
          {error.message || "Something went wrong."}
        </p>
        <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
          <button
            onClick={reset}
            style={{
              padding: "8px 20px",
              backgroundColor: "#334155",
              color: "#e2e8f0",
              border: "1px solid #475569",
              borderRadius: "6px",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          <a
            href="/"
            style={{
              padding: "8px 20px",
              backgroundColor: "#065f46",
              color: "#6ee7b7",
              border: "1px solid #047857",
              borderRadius: "6px",
              fontSize: "14px",
              textDecoration: "none",
            }}
          >
            Go home
          </a>
        </div>
      </body>
    </html>
  );
}
