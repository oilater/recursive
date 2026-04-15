export default function NotFound() {
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
      <h1 style={{ fontSize: "64px", fontWeight: 800, color: "#475569" }}>404</h1>
      <p style={{ fontSize: "16px", color: "#94a3b8" }}>Page not found.</p>
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
          marginTop: "8px",
        }}
      >
        Go home
      </a>
    </div>
  );
}
