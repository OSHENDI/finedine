"use client";

// The last safety net: the root layout itself failed, so this page brings its own html and body.
// Plain inline styles only, because the stylesheets may not have loaded.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const ar = typeof document === "undefined" || !document.cookie.includes("fd_lang=en");
  return (
    <html dir={ar ? "rtl" : "ltr"} lang={ar ? "ar" : "en"}>
      <body style={{ margin: 0, background: "#faf7ea", color: "#231510", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", textAlign: "center", padding: 24 }}>
          <div style={{ display: "grid", gap: 14, justifyItems: "center" }}>
            <h1 style={{ margin: 0, fontSize: 28 }}>{ar ? "حدث خطأ ما" : "Something went wrong"}</h1>
            <p style={{ margin: 0, color: "#8c5440" }}>{ar ? "حاول مرة أخرى بعد قليل." : "Please try again in a moment."}</p>
            <button onClick={reset} style={{ minHeight: 52, padding: "0 28px", border: 0, borderRadius: 16, background: "#cd3266", color: "#fff", fontSize: 17, fontWeight: 700 }} type="button">
              {ar ? "حاول مرة أخرى" : "Try again"}
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
