"use client";

import { useTranslations } from "next-intl";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations();

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
        padding: "32px",
      }}
    >
      <h1 style={{ fontSize: "48px", fontWeight: 800, color: "#ef4444" }}>Oops!</h1>
      <p style={{ fontSize: "16px", color: "#94a3b8", textAlign: "center", maxWidth: "400px" }}>
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
    </div>
  );
}
