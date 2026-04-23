export default function PreviewNotFound() {
  return (
    <html lang="en">
      <head>
        <title>Preview Not Found — RandyBuilds</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@700;900&display=swap" rel="stylesheet" />
      </head>
      <body style={{
        background: "#080808", color: "#f0f0f0",
        fontFamily: "'Inter',sans-serif", display: "flex",
        alignItems: "center", justifyContent: "center",
        minHeight: "100vh", textAlign: "center", padding: "24px", margin: 0,
      }}>
        <div>
          <div style={{ fontSize: "3rem", marginBottom: "16px" }}>⏱</div>
          <h1 style={{ fontSize: "2rem", fontWeight: 900, marginBottom: "12px" }}>Preview not found</h1>
          <p style={{ color: "#555", maxWidth: "400px", margin: "0 auto 8px" }}>
            This link may have expired or been generated before persistent storage was enabled.
          </p>
          <p style={{ color: "#333", fontSize: ".85rem", marginBottom: "32px" }}>Previews are stored for 30 days.</p>
          <a href="/" style={{
            padding: "14px 32px", background: "linear-gradient(135deg,#00f5a0,#00d9f5)",
            color: "#000", borderRadius: "10px", fontWeight: 800,
            fontSize: ".95rem", textDecoration: "none", display: "inline-block",
          }}>Generate New Preview →</a>
        </div>
      </body>
    </html>
  );
}
