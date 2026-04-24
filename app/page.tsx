"use client";
import { useState, useEffect, useRef, useCallback } from "react";

const WORDS = ["converts.", "gets you calls.", "builds trust.", "closes deals.", "gets found."];

function TypeCycle() {
  const [idx, setIdx] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    const word = WORDS[idx];
    let t: ReturnType<typeof setTimeout>;
    if (!deleting && displayed.length < word.length) t = setTimeout(() => setDisplayed(word.slice(0, displayed.length + 1)), 72);
    else if (!deleting && displayed.length === word.length) t = setTimeout(() => setDeleting(true), 2200);
    else if (deleting && displayed.length > 0) t = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 32);
    else { setDeleting(false); setIdx(i => (i + 1) % WORDS.length); }
    return () => clearTimeout(t);
  }, [displayed, deleting, idx]);
  return (
    <span style={{ color: "#c8a96e", fontStyle: "italic" }}>
      {displayed}
      <span style={{ animation: "blink 1s step-end infinite", color: "#c8a96e", marginLeft: 1 }}>|</span>
    </span>
  );
}

type Step = "input" | "scraping" | "generating" | "preview" | "error";

export default function Home() {
  const [url, setUrl] = useState("");
  const [step, setStep] = useState<Step>("input");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{ html: string; businessName: string; sourceUrl: string } | null>(null);
  const [scrapeProgress, setScrapeProgress] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const previewHtmlRef = useRef<string>("");

  // Cursor tracking
  useEffect(() => {
    const dot = document.getElementById("cur-dot");
    const ring = document.getElementById("cur-ring");
    if (!dot || !ring) return;
    let mx = 0, my = 0, rx = 0, ry = 0;
    const onMove = (e: MouseEvent) => { mx = e.clientX; my = e.clientY; dot.style.left = mx + "px"; dot.style.top = my + "px"; };
    document.addEventListener("mousemove", onMove);
    let raf: number;
    const loop = () => {
      rx += (mx - rx) * 0.11; ry += (my - ry) * 0.11;
      ring.style.left = Math.round(rx) + "px"; ring.style.top = Math.round(ry) + "px";
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { document.removeEventListener("mousemove", onMove); cancelAnimationFrame(raf); };
  }, []);

  // Write HTML to iframe — called both on mount (callback ref) and on html change
  const writeToIframe = useCallback((iframe: HTMLIFrameElement | null, html: string) => {
    if (!iframe || !html) return;
    const doc = iframe.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
  }, []);

  // Callback ref — fires immediately when iframe mounts in DOM
  const iframeCallbackRef = useCallback((node: HTMLIFrameElement | null) => {
    if (node) {
      iframeRef.current = node;
      if (previewHtmlRef.current) writeToIframe(node, previewHtmlRef.current);
    }
  }, [writeToIframe]);

  // Also update iframe when html changes (e.g. after async generation completes)
  useEffect(() => {
    if (step !== "preview" || !preview?.html) return;
    previewHtmlRef.current = preview.html;
    writeToIframe(iframeRef.current, preview.html);
  }, [step, preview?.html, writeToIframe]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    const raw = url.trim();
    if (!raw) { inputRef.current?.focus(); return; }
    setError("");

    // ── Detect: is this a URL or a text description? ───────────────────────
    const looksLikeUrl = /^(https?:\/\/)|(\w[\w-]*\.\w{2,}(\/.*)?)$/.test(raw) &&
      !raw.includes(" ") && raw.length < 120;

    if (!looksLikeUrl) {
      // ── Description mode — skip scrape, go straight to redesign ──────────
      setStep("generating");
      setScrapeProgress("Building your site from your description…");

      try {
        const r2 = await fetch("/api/redesign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scraped: {
              businessName: extractBusinessNameFromDescription(raw),
              description: raw,
              url: "https://example.com",
              services: [],
              colors: [],
              images: [],
              headline: "",
              phone: null,
              email: null,
              address: null,
              logoUrl: null,
            },
          }),
        });
        const d2 = await r2.json();
        if (!r2.ok) throw new Error(d2.error || "Generation failed");
        setPreview({
          html: d2.html || d2.previewHtml || "",
          businessName: d2.businessName || extractBusinessNameFromDescription(raw),
          sourceUrl: "",
        });
        setStep("preview");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
        setStep("error");
      }
      return;
    }

    // ── URL mode ───────────────────────────────────────────────────────────
    const clean = raw.startsWith("http") ? raw : "https://" + raw;

    // ── Step 1: Scrape ─────────────────────────────────────────────────────
    setStep("scraping");
    setScrapeProgress("Scanning your website…");

    let scraped;
    try {
      const r1 = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: clean }),
      });
      const d1 = await r1.json();
      if (!r1.ok) throw new Error(d1.error || "Scrape failed");
      scraped = d1;
      setScrapeProgress("Found your content — generating preview…");
    } catch {
      scraped = { url: clean, businessName: extractDomainName(clean), description: "", services: [], colors: [], images: [], headline: "", phone: null, email: null, address: null, logoUrl: null };
      setScrapeProgress("Couldn't scrape — generating from URL…");
    }

    // ── Step 2: Generate ───────────────────────────────────────────────────
    setStep("generating");
    setScrapeProgress("Building your premium redesign…");

    try {
      const r2 = await fetch("/api/redesign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scraped }),
      });
      const d2 = await r2.json();
      if (!r2.ok) throw new Error(d2.error || "Redesign failed");

      setPreview({
        html: d2.html || d2.previewHtml || "",
        businessName: d2.businessName || scraped.businessName || "Your Business",
        sourceUrl: clean,
      });
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      setStep("error");
    }
  }, [url]);

  const handleStartBuilding = () => {
    if (!preview) return;
    // Store in sessionStorage so the builder page can pick it up
    sessionStorage.setItem("rb_build_state", JSON.stringify({
      html: preview.html,
      businessName: preview.businessName,
      sourceUrl: preview.sourceUrl,
    }));
    window.location.href = "/build";
  };

  const handleReset = () => {
    setStep("input");
    setUrl("");
    setPreview(null);
    setError("");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <div style={{ background: "#0a0a08", color: "#e8e0d0", fontFamily: "'Inter', -apple-system, sans-serif", minHeight: "100vh", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Instrument+Serif:ital@0;1&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        ::selection { background:rgba(200,169,110,0.3); color:#e8e0d0; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background:#0a0a08; }
        ::-webkit-scrollbar-thumb { background:#2a2820; border-radius:2px; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes slideIn { from{opacity:0;transform:translateY(40px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes pulse { 0%,100%{opacity:0.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.05)} }
        .fade-up { animation: fadeUp 0.7s ease forwards; }
        #cur-dot { position:fixed;width:6px;height:6px;border-radius:50%;background:#c8a96e;pointer-events:none;z-index:9999;transform:translate(-50%,-50%);transition:opacity 0.2s; }
        #cur-ring { position:fixed;width:28px;height:28px;border-radius:50%;border:1.5px solid rgba(200,169,110,0.4);pointer-events:none;z-index:9998;transform:translate(-50%,-50%); }
        body { cursor:none; }
        input, button, a { cursor:none; }
        .nav-link { color:rgba(232,224,208,0.5);font-size:14px;font-weight:500;text-decoration:none;transition:color 0.2s; }
        .nav-link:hover { color:#e8e0d0; }
        .hero-input {
          flex:1; background:transparent; border:none; font-size:16px;
          color:#e8e0d0; font-family:inherit; outline:none; padding:0;
        }
        .hero-input::placeholder { color:rgba(232,224,208,0.3); }
        .btn-gold {
          display:inline-flex; align-items:center; gap:8px;
          padding:14px 28px; border-radius:10px; font-weight:800; font-size:15px;
          background:#c8a96e; color:#0a0a08; border:none; cursor:none;
          text-decoration:none; transition:all 0.2s; letter-spacing:-0.01em; font-family:inherit;
        }
        .btn-gold:hover { background:#d4b87e; transform:translateY(-1px); box-shadow:0 8px 24px rgba(200,169,110,0.3); }
        .btn-outline {
          display:inline-flex; align-items:center; gap:8px;
          padding:14px 28px; border-radius:10px; font-weight:600; font-size:15px;
          background:transparent; color:rgba(232,224,208,0.7); border:1px solid rgba(232,224,208,0.15);
          cursor:none; text-decoration:none; transition:all 0.2s; font-family:inherit;
        }
        .btn-outline:hover { border-color:rgba(232,224,208,0.35); color:#e8e0d0; }
        .feature-card { background:#141210; border:1px solid #2a2820; border-radius:16px; padding:28px; transition:all 0.2s; }
        .feature-card:hover { border-color:rgba(200,169,110,0.25); transform:translateY(-2px); }
        .progress-dot { width:8px;height:8px;border-radius:50%;background:#2a2820;transition:all 0.3s; }
        .progress-dot.active { background:#c8a96e; animation:pulse 1.5s ease-in-out infinite; }
        .progress-dot.done { background:#c8a96e; }
        .shimmer-text {
          background: linear-gradient(90deg, rgba(232,224,208,0.3) 25%, rgba(200,169,110,0.8) 50%, rgba(232,224,208,0.3) 75%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 2s linear infinite;
        }
      `}</style>

      {/* Custom cursor */}
      <div id="cur-dot" />
      <div id="cur-ring" />

      {/* ── NAV ────────────────────────────────────────────────────────────── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 32px", height: 64,
        background: "rgba(10,10,8,0.85)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg,#c8a96e,#a07840)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 900, fontSize: 15, color: "#0a0a08",
          }}>R</div>
          <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em" }}>RandyBuilds</span>
        </div>
        <div style={{ display: "flex", gap: 28 }}>
          <a href="#how-it-works" className="nav-link">How it works</a>
          <a href="#pricing" className="nav-link">Pricing</a>
          <a href="/build" className="nav-link">Builder</a>
        </div>
        <a href="/build" className="btn-gold" style={{ padding: "9px 20px", fontSize: 13 }}>
          Start Building Free →
        </a>
      </nav>

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      {step === "input" || step === "error" ? (
        <section style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "120px 24px 80px", textAlign: "center" }}>
          <div className="fade-up" style={{ maxWidth: 840, width: "100%" }}>
            {/* Badge */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "rgba(200,169,110,0.08)", border: "1px solid rgba(200,169,110,0.2)",
              borderRadius: 100, padding: "6px 16px", marginBottom: 32,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#c8a96e", display: "inline-block", animation: "pulse 2s infinite" }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: "#c8a96e", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                AI Website Builder — No Code Required
              </span>
            </div>

            {/* Headline */}
            <h1 style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontSize: "clamp(3rem, 7vw, 6rem)",
              fontWeight: 400, letterSpacing: "-0.02em", lineHeight: 1.05,
              marginBottom: 24,
            }}>
              A website that<br /><TypeCycle />
            </h1>

            <p style={{ fontSize: "clamp(1rem, 2vw, 1.25rem)", color: "rgba(232,224,208,0.55)", maxWidth: 560, margin: "0 auto 48px", lineHeight: 1.65 }}>
              Paste your URL — or just describe your business. Our AI builds you a real, editable website in 60 seconds. Then customize it through chat. No designers, no developers, no waiting.
            </p>

            {/* URL Input */}
            <form onSubmit={handleSubmit} style={{ maxWidth: 640, margin: "0 auto 16px" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 0,
                background: "#141210", border: "1px solid #2a2820",
                borderRadius: 14, padding: "6px 6px 6px 20px",
                transition: "border-color 0.2s",
              }}
                onFocus={() => { }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(200,169,110,0.4)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "#2a2820")}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="yourwebsite.com — or describe your business"
                  className="hero-input"
                  autoFocus
                />
                <button type="submit" className="btn-gold" style={{ borderRadius: 10, whiteSpace: "nowrap" }}>
                  Build My Site →
                </button>
              </div>
            </form>

            {/* OR divider + start from scratch */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, maxWidth: 640, margin: "0 auto 16px" }}>
              <div style={{ flex: 1, height: 1, background: "#2a2820" }} />
              <span style={{ fontSize: 12, color: "rgba(232,224,208,0.3)", letterSpacing: "0.06em", textTransform: "uppercase" }}>or</span>
              <div style={{ flex: 1, height: 1, background: "#2a2820" }} />
            </div>

            <a href="/build" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              fontSize: 14, color: "rgba(232,224,208,0.6)", textDecoration: "none",
              padding: "10px 20px", borderRadius: 10, border: "1px solid #2a2820",
              transition: "all 0.2s",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(200,169,110,0.3)"; (e.currentTarget as HTMLAnchorElement).style.color = "#c8a96e"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "#2a2820"; (e.currentTarget as HTMLAnchorElement).style.color = "rgba(232,224,208,0.6)"; }}
            >
              ✦ Start from scratch — describe your business in the builder
            </a>

            {step === "error" && (
              <div style={{ marginTop: 20, padding: "12px 20px", background: "rgba(255,80,80,0.08)", border: "1px solid rgba(255,80,80,0.2)", borderRadius: 10, color: "#ff8080", fontSize: 13 }}>
                {error}
              </div>
            )}

            {/* Social proof */}
            <div style={{ marginTop: 60, display: "flex", alignItems: "center", justifyContent: "center", gap: 32, flexWrap: "wrap" }}>
              {[
                { label: "Sites Generated", value: "2,400+" },
                { label: "Avg. Build Time", value: "47 sec" },
                { label: "Countries", value: "38" },
                { label: "Free to Start", value: "Always" },
              ].map(stat => (
                <div key={stat.label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "#c8a96e", letterSpacing: "-0.02em" }}>{stat.value}</div>
                  <div style={{ fontSize: 11, color: "rgba(232,224,208,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 4 }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ── LOADING STATE ──────────────────────────────────────────────────── */}
      {(step === "scraping" || step === "generating") && (
        <section style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", textAlign: "center" }}>
          {/* Animated orb */}
          <div style={{ position: "relative", marginBottom: 40 }}>
            <div style={{
              width: 100, height: 100, borderRadius: "50%",
              background: "linear-gradient(135deg, rgba(200,169,110,0.2), rgba(160,120,60,0.05))",
              border: "2px solid rgba(200,169,110,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: "pulse 2s ease-in-out infinite",
            }}>
              <div style={{
                width: 60, height: 60, borderRadius: "50%",
                background: "rgba(200,169,110,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.8rem",
              }}>✦</div>
            </div>
            {/* Spinning ring */}
            <div style={{
              position: "absolute", inset: -8, borderRadius: "50%",
              border: "2px solid transparent",
              borderTopColor: "#c8a96e",
              animation: "spin 1.5s linear infinite",
            }} />
          </div>

          <h2 className="shimmer-text" style={{
            fontFamily: "'Instrument Serif', serif",
            fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
            fontWeight: 400, marginBottom: 12,
          }}>
            {step === "scraping" ? "Reading your site…" : "Building your redesign…"}
          </h2>
          <p style={{ color: "rgba(232,224,208,0.5)", fontSize: 16, marginBottom: 40 }}>
            {scrapeProgress}
          </p>

          {/* Progress steps */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {["Scan", "Analyze", "Design", "Generate"].map((label, i) => {
              const stepIdx = step === "scraping" ? 1 : 3;
              const isDone = i < stepIdx;
              const isActive = i === stepIdx;
              return (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <div className={`progress-dot ${isDone || isActive ? (isDone ? "done" : "active") : ""}`} />
                    <span style={{ fontSize: 10, color: isDone || isActive ? "#c8a96e" : "rgba(232,224,208,0.3)", fontWeight: 600, letterSpacing: "0.04em" }}>
                      {label}
                    </span>
                  </div>
                  {i < 3 && <div style={{ width: 32, height: 1, background: isDone ? "#c8a96e" : "#2a2820", marginBottom: 16, transition: "background 0.3s" }} />}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── PREVIEW STATE ──────────────────────────────────────────────────── */}
      {step === "preview" && preview && (
        <div style={{ minHeight: "100vh", paddingTop: 64, display: "flex", flexDirection: "column" }}>
          {/* Preview header */}
          <div style={{
            background: "rgba(10,10,8,0.95)", backdropFilter: "blur(20px)",
            borderBottom: "1px solid #2a2820",
            padding: "16px 24px",
            display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
            animation: "slideIn 0.5s ease",
          }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#c8a96e", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>✦ AI Preview Generated</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#e8e0d0" }}>{preview.businessName}</div>
              <div style={{ fontSize: 12, color: "rgba(232,224,208,0.4)", marginTop: 2 }}>{preview.sourceUrl}</div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={handleReset} className="btn-outline" style={{ padding: "10px 20px", fontSize: 13 }}>
                ← Try Another
              </button>
              <button onClick={handleStartBuilding} className="btn-gold" style={{ fontSize: 15, padding: "12px 28px" }}>
                ✦ Start Editing This Site →
              </button>
            </div>
          </div>

          {/* The preview excitement copy */}
          <div style={{
            background: "linear-gradient(135deg, rgba(200,169,110,0.06), transparent)",
            borderBottom: "1px solid #1e1e18",
            padding: "16px 24px",
            display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap",
            animation: "slideIn 0.6s ease",
          }}>
            <div style={{ fontSize: 13, color: "rgba(232,224,208,0.7)", lineHeight: 1.5 }}>
              🎉 <strong style={{ color: "#e8e0d0" }}>This is a live preview</strong> — your real site, redesigned. Hit <strong style={{ color: "#c8a96e" }}>"Start Editing"</strong> to open the AI builder and customize anything through chat.
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              {["Change colors", "Add sections", "Edit copy", "Go live"].map(action => (
                <span key={action} style={{
                  background: "#141210", border: "1px solid #2a2820",
                  borderRadius: 100, padding: "4px 12px", fontSize: 11,
                  color: "rgba(232,224,208,0.6)", fontWeight: 600,
                }}>
                  {action}
                </span>
              ))}
            </div>
          </div>

          {/* iframe preview */}
          <div style={{ flex: 1, position: "relative", minHeight: "70vh" }}>
            <iframe
              ref={iframeCallbackRef}
              style={{ width: "100%", height: "100%", border: "none", display: "block", minHeight: "70vh" }}
              title="Site Preview"
              sandbox="allow-scripts allow-same-origin"
            />
            {/* CTA overlay at bottom */}
            <div style={{
              position: "sticky", bottom: 0, left: 0, right: 0,
              background: "linear-gradient(to top, rgba(10,10,8,0.98) 60%, transparent)",
              padding: "40px 24px 24px",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 16, flexWrap: "wrap",
            }}>
              <div style={{ textAlign: "center" }}>
                <p style={{ color: "rgba(232,224,208,0.7)", fontSize: 15, marginBottom: 16 }}>
                  Like what you see? Start customizing this site right now — for free.
                </p>
                <button onClick={handleStartBuilding} className="btn-gold" style={{ fontSize: 17, padding: "16px 40px" }}>
                  ✦ Start Building My Site →
                </button>
                <div style={{ marginTop: 10, fontSize: 12, color: "rgba(232,224,208,0.3)" }}>
                  Free to build · Download anytime · Publish from $19/mo
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── HOW IT WORKS ───────────────────────────────────────────────────── */}
      {step === "input" && (
        <>
          <section id="how-it-works" style={{ padding: "100px 24px", maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 64 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#c8a96e", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 16 }}>How it works</div>
              <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 400 }}>
                From URL to live site in minutes
              </h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
              {[
                { num: "01", icon: "🔍", title: "Paste your URL", body: "Give us your existing site or just describe your business. We handle the rest." },
                { num: "02", icon: "⚡", title: "AI generates preview", body: "In 60 seconds, see a premium redesign of your site — real copy, real layout, real design." },
                { num: "03", icon: "💬", title: "Edit through chat", body: "\"Make the header darker\" → done instantly. Change anything by just describing it." },
                { num: "04", icon: "🚀", title: "Publish live", body: "One click and your site is live at yourbusiness.randybuilds.site with SSL and global CDN." },
              ].map(step => (
                <div key={step.num} className="feature-card">
                  <div style={{ fontSize: "1.8rem", marginBottom: 16 }}>{step.icon}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(232,224,208,0.3)", letterSpacing: "0.1em", marginBottom: 8 }}>{step.num}</div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 10 }}>{step.title}</h3>
                  <p style={{ fontSize: 13, color: "rgba(232,224,208,0.55)", lineHeight: 1.6 }}>{step.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── PRICING ─────────────────────────────────────────────────────── */}
          <section id="pricing" style={{ padding: "100px 24px", maxWidth: 900, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 64 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#c8a96e", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 16 }}>Pricing</div>
              <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 400, marginBottom: 16 }}>
                Free to build. Pay to publish.
              </h2>
              <p style={{ color: "rgba(232,224,208,0.5)", maxWidth: 480, margin: "0 auto" }}>
                Generate your site, chat with AI to customize it, download it — all free. Pay only when you want it live online.
              </p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 20 }}>
              {[
                {
                  name: "Free Forever",
                  price: "$0",
                  features: ["Unlimited AI generations", "Chat editor — full access", "Preview your site live", "Download HTML anytime", "No signup required"],
                  cta: "Start Building Free",
                  href: "/build",
                  highlight: false,
                },
                {
                  name: "Publish",
                  price: "$19/mo",
                  features: ["Everything in Free", "Live subdomain (yourbiz.randybuilds.site)", "SSL certificate included", "Global CDN", "Instant publish — 1 click"],
                  cta: "Get Started",
                  href: "#",
                  highlight: true,
                },
                {
                  name: "Pro",
                  price: "$49/mo",
                  features: ["Everything in Publish", "Custom domain (.com/.ca/etc)", "Priority AI queue", "Multi-page support", "Email & chat support"],
                  cta: "Go Pro",
                  href: "#",
                  highlight: false,
                },
              ].map(tier => (
                <div key={tier.name} style={{
                  background: tier.highlight ? "linear-gradient(135deg, rgba(200,169,110,0.08), rgba(160,120,60,0.04))" : "#141210",
                  border: `1px solid ${tier.highlight ? "rgba(200,169,110,0.3)" : "#2a2820"}`,
                  borderRadius: 16, padding: 28,
                  position: "relative",
                }}>
                  {tier.highlight && (
                    <div style={{
                      position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                      background: "#c8a96e", color: "#0a0a08", fontSize: 10, fontWeight: 900,
                      padding: "4px 14px", borderRadius: 100, letterSpacing: "0.08em", textTransform: "uppercase",
                      whiteSpace: "nowrap",
                    }}>Most Popular</div>
                  )}
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: tier.highlight ? "#c8a96e" : "rgba(232,224,208,0.6)", marginBottom: 8 }}>{tier.name}</div>
                    <div style={{ fontSize: "2.5rem", fontWeight: 900, letterSpacing: "-0.03em", color: "#e8e0d0" }}>{tier.price}</div>
                  </div>
                  <ul style={{ listStyle: "none", marginBottom: 28, display: "flex", flexDirection: "column", gap: 10 }}>
                    {tier.features.map(f => (
                      <li key={f} style={{ fontSize: 13, color: "rgba(232,224,208,0.7)", display: "flex", gap: 8, alignItems: "flex-start" }}>
                        <span style={{ color: "#c8a96e", flexShrink: 0 }}>✓</span>{f}
                      </li>
                    ))}
                  </ul>
                  <a href={tier.href} className={tier.highlight ? "btn-gold" : "btn-outline"} style={{ width: "100%", justifyContent: "center", boxSizing: "border-box" }}>
                    {tier.cta}
                  </a>
                </div>
              ))}
            </div>
          </section>

          {/* ── FOOTER CTA ──────────────────────────────────────────────────── */}
          <section style={{ padding: "80px 24px", textAlign: "center", borderTop: "1px solid #1a1a14" }}>
            <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 400, marginBottom: 20 }}>
              Your best website is<br />60 seconds away.
            </h2>
            <p style={{ color: "rgba(232,224,208,0.5)", marginBottom: 36, fontSize: "1.1rem" }}>
              No code. No designers. No waiting. Just describe your business and watch it build.
            </p>
            <button onClick={() => { inputRef.current?.focus(); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="btn-gold" style={{ fontSize: 17, padding: "16px 40px" }}>
              Build My Site Free →
            </button>
          </section>

          {/* Footer */}
          <footer style={{ borderTop: "1px solid #1a1a14", padding: "24px", textAlign: "center", color: "rgba(232,224,208,0.3)", fontSize: 12 }}>
            © {new Date().getFullYear()} RandyBuilds · Built by AI, launched by you
          </footer>
        </>
      )}
    </div>
  );
}

function extractDomainName(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace("www.", "");
    return hostname.split(".")[0].replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  } catch {
    return "Your Business";
  }
}

function extractBusinessNameFromDescription(desc: string): string {
  // Try to pull a proper noun / business name from phrases like:
  // "I run Smith Plumbing in Calgary"
  // "My company is ABC Roofing"
  // "coffee shop called Grounds & Glory"
  const patterns = [
    /called\s+([A-Z][A-Za-z0-9 &'-]{1,40})/,
    /named\s+([A-Z][A-Za-z0-9 &'-]{1,40})/,
    /(?:company|business|shop|firm|studio|agency)\s+is\s+([A-Z][A-Za-z0-9 &'-]{1,40})/,
    /^([A-Z][A-Za-z0-9 &'-]{1,40})\s+(?:is|are|provides|offers|does)/,
  ];
  for (const p of patterns) {
    const m = desc.match(p);
    if (m?.[1]) return m[1].trim();
  }
  // Fall back: first 3 meaningful words capitalized
  const words = desc.replace(/[^a-zA-Z0-9 ]/g, " ").split(/\s+/).filter(w => w.length > 2).slice(0, 3);
  return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") || "Your Business";
}
