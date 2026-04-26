"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────
type Step = "input" | "onboard" | "building" | "preview" | "error";
interface OnboardData { businessName: string; goal: string; tone: string; }

// ─── Constants ────────────────────────────────────────────────────────────
const GOALS = ["Get more phone calls", "Capture email leads", "Accept bookings", "Showcase my work", "Build trust & credibility"];
const TONES = [
  { id: "professional", label: "Professional", desc: "Clean, trustworthy, established" },
  { id: "friendly", label: "Friendly", desc: "Warm, approachable, community-focused" },
  { id: "bold", label: "Bold", desc: "Strong, confident, industry leader" },
];
const EXAMPLES = [
  { label: "Plumber", prompt: "Rocky Mountain Plumbing — residential & commercial plumbing Calgary AB" },
  { label: "Electrician", prompt: "Apex Electrical Services — licensed electrician Edmonton Alberta" },
  { label: "HVAC", prompt: "PrairieAir Heating & Cooling — furnace repair and AC installation Alberta" },
  { label: "Landscaper", prompt: "GreenEdge Landscaping — design build maintenance Calgary" },
  { label: "Renovator", prompt: "Finlay Construction — basement renos and custom builds Cochrane AB" },
];
const DESIGN_STYLES = [
  { id: "modern-dark", label: "Modern Dark", preview: "linear-gradient(135deg,#0a0a08,#1a1810)", accent: "#c8a96e" },
  { id: "clean-light", label: "Clean Light", preview: "linear-gradient(135deg,#ffffff,#f5f5f0)", accent: "#2563eb" },
  { id: "bold-blue", label: "Bold Blue", preview: "linear-gradient(135deg,#1e3a5f,#2563eb)", accent: "#ffffff" },
  { id: "forest", label: "Forest Green", preview: "linear-gradient(135deg,#14532d,#16a34a)", accent: "#ffffff" },
  { id: "slate", label: "Slate Pro", preview: "linear-gradient(135deg,#0f172a,#334155)", accent: "#60a5fa" },
  { id: "warm", label: "Warm Craft", preview: "linear-gradient(135deg,#451a03,#ea580c)", accent: "#fef3c7" },
];

// ─── Streaming text component ─────────────────────────────────────────────
function StreamingCode({ html }: { html: string }) {
  const [displayed, setDisplayed] = useState("");
  const [cursor, setCursor] = useState(true);
  const rafRef = useRef<number | null>(null);
  const iRef = useRef(0);

  useEffect(() => {
    iRef.current = 0;
    setDisplayed("");
    const charsPerFrame = Math.max(1, Math.floor(html.length / 180));
    const tick = () => {
      if (iRef.current < html.length) {
        iRef.current = Math.min(iRef.current + charsPerFrame, html.length);
        setDisplayed(html.slice(0, iRef.current));
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    const blink = setInterval(() => setCursor(c => !c), 500);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); clearInterval(blink); };
  }, [html]);

  return (
    <pre style={{ margin: 0, fontFamily: "'JetBrains Mono','Courier New',monospace", fontSize: 11, lineHeight: 1.6, color: "#4ade80", background: "transparent", whiteSpace: "pre-wrap", wordBreak: "break-all", padding: "16px", overflow: "hidden", maxHeight: "100%", opacity: 0.85 }}>
      {displayed}<span style={{ opacity: cursor ? 1 : 0, color: "#c8a96e" }}>█</span>
    </pre>
  );
}

// ─── Build progress steps ─────────────────────────────────────────────────
const BUILD_STEPS = [
  { label: "Scanning business details", duration: 2000 },
  { label: "Extracting brand signals", duration: 3000 },
  { label: "Designing layout structure", duration: 3500 },
  { label: "Writing sections and copy", duration: 4000 },
  { label: "Applying styles and colour", duration: 3000 },
  { label: "Optimising for mobile", duration: 2000 },
  { label: "Injecting lead capture", duration: 1500 },
  { label: "Final polish", duration: 1000 },
];

function BuildProgress({ streamingHtml }: { streamingHtml: string }) {
  const [step, setStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let total = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    BUILD_STEPS.forEach((s, i) => {
      timers.push(setTimeout(() => setStep(i), total));
      total += s.duration;
    });
    const ticker = setInterval(() => setElapsed(e => e + 100), 100);
    return () => { timers.forEach(clearTimeout); clearInterval(ticker); };
  }, []);

  return (
    <div style={{ display: "flex", height: "100vh", background: "#070706", overflow: "hidden" }}>
      {/* Left: progress */}
      <div style={{ width: 340, background: "#0a0a08", borderRight: "1px solid #1a1810", display: "flex", flexDirection: "column", padding: "48px 32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 48 }}>
          <div style={{ width: 30, height: 30, borderRadius: 7, background: "linear-gradient(135deg,#c8a96e,#a07840)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 14, color: "#0a0a08" }}>S</div>
          <span style={{ fontWeight: 800, fontSize: 16, color: "#e8e0d0" }}>Site<span style={{ color: "#c8a96e" }}>craft</span></span>
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Building your site</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: "#e8e0d0", marginBottom: 32, letterSpacing: -0.5 }}>{Math.floor(elapsed / 1000)}s elapsed</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {BUILD_STEPS.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, opacity: i <= step ? 1 : 0.25, transition: "opacity 0.6s" }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, background: i < step ? "#c8a96e" : i === step ? "#1a1810" : "#0f0e0b", border: `1px solid ${i <= step ? "#c8a96e44" : "#1a1810"}`, transition: "all 0.4s" }}>
                {i < step ? "✓" : i === step ? <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#c8a96e", animation: "pulse 1s ease-in-out infinite" }} /> : null}
              </div>
              <span style={{ fontSize: 13, fontWeight: i === step ? 600 : 400, color: i === step ? "#e8e0d0" : "#666" }}>{s.label}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: "auto", paddingTop: 32 }}>
          <div style={{ height: 3, background: "#1a1810", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(step / (BUILD_STEPS.length - 1)) * 100}%`, background: "linear-gradient(90deg,#c8a96e,#a07840)", borderRadius: 2, transition: "width 1.5s ease" }} />
          </div>
          <div style={{ fontSize: 11, color: "#444", marginTop: 8 }}>{Math.round((step / (BUILD_STEPS.length - 1)) * 100)}% complete</div>
        </div>
      </div>

      {/* Right: streaming code */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "12px 20px", background: "#0a0a08", borderBottom: "1px solid #1a1810", display: "flex", alignItems: "center", gap: 10, zIndex: 10 }}>
          <div style={{ display: "flex", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
          </div>
          <span style={{ fontSize: 12, color: "#555", fontFamily: "monospace" }}>index.html — generating…</span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", animation: "pulse 1s ease-in-out infinite" }} />
            <span style={{ fontSize: 11, color: "#4ade80" }}>LIVE</span>
          </div>
        </div>
        <div style={{ paddingTop: 44, height: "100%", overflow: "hidden" }}>
          {streamingHtml ? <StreamingCode html={streamingHtml} /> : (
            <div style={{ padding: "24px 16px", fontFamily: "monospace", fontSize: 11, color: "#333", lineHeight: 1.8 }}>
              <div style={{ color: "#555" }}>{"<!DOCTYPE html>"}</div>
              <div style={{ color: "#555" }}>{"<html lang=\"en\">"}</div>
              <div style={{ color: "#1a1810" }}>{"  <head>"}</div>
              <div style={{ color: "#1a1810" }}>{"    <meta charset=\"UTF-8\">"}</div>
              <span style={{ animation: "pulse 1s ease-in-out infinite", color: "#333" }}>{"    "}▌</span>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:0.5}50%{opacity:1}}`}</style>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────
function extractDomainName(url: string): string {
  try { return new URL(url).hostname.replace("www.", "").split(".")[0]; } catch { return "Your Business"; }
}

export default function Home() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("input");
  const [input, setInput] = useState("");
  const [onboard, setOnboard] = useState<OnboardData>({ businessName: "", goal: "", tone: "" });
  const [selectedStyle, setSelectedStyle] = useState("modern-dark");
  const [streamingHtml, setStreamingHtml] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [error, setError] = useState("");
  const [showExamples, setShowExamples] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 300); }, []);

  useEffect(() => {
    if (!iframeRef.current || !previewHtml) return;
    const doc = iframeRef.current.contentDocument;
    if (!doc) return;
    doc.open(); doc.write(previewHtml); doc.close();
  }, [previewHtml]);

  const handleInputSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;
    const domain = extractDomainName(input.startsWith("http") ? input : "https://" + input);
    setOnboard(o => ({ ...o, businessName: domain !== "Your Business" ? domain : input.trim() }));
    setStep("onboard");
  };

  const handleBuild = useCallback(async () => {
    setStep("building");
    setStreamingHtml("");

    let clean = input.trim();
    if (clean && !clean.startsWith("http") && !clean.includes(".")) clean = "";
    const url = clean.startsWith("http") ? clean : clean ? "https://" + clean : "";

    let scraped: any = { businessName: onboard.businessName, description: input, services: [], colors: [], images: [], url };

    if (url) {
      try {
        const r = await fetch("/api/scrape", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
        if (r.ok) scraped = await r.json();
      } catch {}
    }

    try {
      const r = await fetch("/api/redesign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scraped: { ...scraped, businessName: onboard.businessName || scraped.businessName }, goal: onboard.goal, tone: onboard.tone, style: selectedStyle }),
      });

      if (!r.ok) throw new Error("Generation failed");
      const data = await r.json();
      const html = data.html || data.previewHtml || "";
      setStreamingHtml(html);
      setPreviewHtml(html);
      setBusinessName(data.businessName || onboard.businessName || scraped.businessName || "Your Business");

      // Save for editor
      sessionStorage.setItem("rb_build_state", JSON.stringify({ html, businessName: data.businessName || onboard.businessName, sourceUrl: url, goal: onboard.goal, tone: onboard.tone }));

      // Delay to let streaming animation play
      setTimeout(() => setStep("preview"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Build failed");
      setStep("error");
    }
  }, [input, onboard, selectedStyle]);

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Instrument+Serif:ital@0;1&display=swap');
    *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
    html { scroll-behavior:smooth; }
    body { background:#070706; color:#e8e0d0; font-family:'Inter',-apple-system,sans-serif; }
    ::selection { background:rgba(200,169,110,0.3); color:#e8e0d0; }
    ::-webkit-scrollbar { width:4px; } ::-webkit-scrollbar-track { background:#070706; } ::-webkit-scrollbar-thumb { background:#1a1810; border-radius:2px; }
    @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
    @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
    @keyframes pulse { 0%,100%{opacity:0.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.05)} }
    @keyframes slideIn { from{opacity:0;transform:scale(0.97) translateY(16px)} to{opacity:1;transform:scale(1) translateY(0)} }
    @keyframes shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
    @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
    .input-box { background:#0d0c0a;border:1px solid #1e1c14;border-radius:14px;transition:border-color 0.2s,box-shadow 0.2s; }
    .input-box:focus-within { border-color:#c8a96e44;box-shadow:0 0 0 3px rgba(200,169,110,0.08); }
    .hero-input { background:transparent;border:none;outline:none;color:#e8e0d0;font-family:inherit;font-size:16px;flex:1;padding:0; }
    .hero-input::placeholder { color:#333; }
    .btn-gold { background:#c8a96e;color:#0a0a08;border:none;border-radius:9px;font-weight:800;font-size:14px;cursor:pointer;transition:all 0.15s;font-family:inherit;display:inline-flex;align-items:center;gap:6px;white-space:nowrap; }
    .btn-gold:hover { background:#d4b87e;transform:translateY(-1px);box-shadow:0 6px 20px rgba(200,169,110,0.3); }
    .btn-ghost { background:transparent;color:#888;border:1px solid #1e1c14;border-radius:9px;font-weight:600;font-size:13px;cursor:pointer;font-family:inherit;transition:all 0.15s; }
    .btn-ghost:hover { border-color:#2a2820;color:#e8e0d0; }
    .example-chip { background:#0d0c0a;border:1px solid #1a1810;border-radius:40px;padding:5px 12px;font-size:12px;color:#666;cursor:pointer;transition:all 0.15s;font-family:inherit;white-space:nowrap; }
    .example-chip:hover { border-color:#c8a96e44;color:#c8a96e;background:#111; }
    .nav-link { color:rgba(232,224,208,0.5);font-size:13px;font-weight:500;text-decoration:none;transition:color 0.2s;letter-spacing:-0.01em; }
    .nav-link:hover { color:#e8e0d0; }
    .goal-btn { background:#0d0c0a;border:1px solid #1a1810;border-radius:10px;padding:12px 16px;text-align:left;font-size:13px;font-weight:500;color:#888;cursor:pointer;font-family:inherit;transition:all 0.15s; }
    .goal-btn.active { border-color:#c8a96e44;background:#111009;color:#c8a96e; }
    .goal-btn:hover:not(.active) { border-color:#2a2820;color:#e8e0d0; }
    .tone-card { background:#0d0c0a;border:1px solid #1a1810;border-radius:12px;padding:16px;cursor:pointer;transition:all 0.15s;text-align:left; }
    .tone-card.active { border-color:#c8a96e;background:#111009; }
    .tone-card:hover:not(.active) { border-color:#2a2820; }
    .style-card { border-radius:10px;overflow:hidden;cursor:pointer;transition:all 0.15s;border:2px solid transparent;flex-shrink:0; }
    .style-card.active { border-color:#c8a96e; }
    .style-card:hover:not(.active) { transform:scale(1.03); }
    @media(max-width:640px) { .hide-mobile { display:none !important; } }
  `;

  // ── BUILDING ──────────────────────────────────────────────────────────────
  if (step === "building") return (
    <>
      <style>{CSS}</style>
      <BuildProgress streamingHtml={streamingHtml} />
    </>
  );

  // ── PREVIEW ───────────────────────────────────────────────────────────────
  if (step === "preview") return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#070706" }}>
      <style>{CSS}</style>
      {/* Topbar */}
      <div style={{ height: 54, background: "#0a0a08", borderBottom: "1px solid #1a1810", display: "flex", alignItems: "center", padding: "0 16px", gap: 12, flexShrink: 0, animation: "fadeUp 0.4s ease" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 5, background: "linear-gradient(135deg,#c8a96e,#a07840)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 11, color: "#0a0a08" }}>S</div>
          <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: -0.3 }}>Site<span style={{ color: "#c8a96e" }}>craft</span></span>
        </div>
        <div style={{ width: 1, height: 20, background: "#1a1810" }} />
        <div style={{ fontSize: 13, color: "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{businessName}</div>
        <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          <button className="btn-ghost" style={{ padding: "7px 14px" }} onClick={() => { setStep("input"); setInput(""); setPreviewHtml(""); }}>← Start over</button>
          <button className="btn-gold" style={{ padding: "9px 18px" }} onClick={() => router.push("/build")}>Open Editor →</button>
        </div>
      </div>
      {/* Preview frame */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <iframe ref={iframeRef} style={{ width: "100%", height: "100%", border: "none", animation: "fadeUp 0.5s ease 0.2s both" }} title="preview" sandbox="allow-scripts allow-same-origin allow-forms" />
      </div>
      {/* Bottom bar */}
      <div style={{ height: 56, background: "rgba(10,10,8,0.97)", borderTop: "1px solid #1a1810", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", backdropFilter: "blur(12px)", flexShrink: 0 }}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Your site is ready.</span>
          <span style={{ fontSize: 12, color: "#555", marginLeft: 8 }}>Open the editor to customise it, then publish.</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-ghost" style={{ padding: "8px 16px" }} onClick={handleBuild}>↺ Regenerate</button>
          <button className="btn-gold" style={{ padding: "10px 22px", fontSize: 15 }} onClick={() => router.push("/build")}>Customise & Publish →</button>
        </div>
      </div>
    </div>
  );

  // ── ERROR ─────────────────────────────────────────────────────────────────
  if (step === "error") return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#070706", flexDirection: "column", gap: 16 }}>
      <style>{CSS}</style>
      <div style={{ fontSize: 40 }}>⚠️</div>
      <div style={{ fontWeight: 700, fontSize: 18 }}>Something went wrong</div>
      <div style={{ fontSize: 13, color: "#888", maxWidth: 400, textAlign: "center" }}>{error}</div>
      <button className="btn-gold" style={{ padding: "12px 28px", marginTop: 8 }} onClick={() => setStep("input")}>← Try again</button>
    </div>
  );

  // ── ONBOARD ───────────────────────────────────────────────────────────────
  if (step === "onboard") return (
    <div style={{ minHeight: "100vh", background: "#070706", display: "flex", flexDirection: "column" }}>
      <style>{CSS}</style>
      {/* Nav */}
      <nav style={{ height: 56, display: "flex", alignItems: "center", padding: "0 24px", borderBottom: "1px solid #1a1810" }}>
        <button onClick={() => setStep("input")} style={{ background: "none", border: "none", color: "#555", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>← Back</button>
        <div style={{ margin: "0 auto", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 5, background: "linear-gradient(135deg,#c8a96e,#a07840)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 11, color: "#0a0a08" }}>S</div>
          <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: -0.3 }}>Site<span style={{ color: "#c8a96e" }}>craft</span></span>
        </div>
      </nav>

      <div style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "48px 20px" }}>
        <div style={{ width: "100%", maxWidth: 600, animation: "fadeUp 0.5s ease" }}>
          {/* Progress */}
          <div style={{ display: "flex", gap: 8, marginBottom: 36 }}>
            {["Business", "Goal", "Style", "Build"].map((s, i) => (
              <div key={s} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ height: 3, borderRadius: 2, background: i === 0 ? "#c8a96e" : i === 1 && onboard.goal ? "#c8a96e" : i === 2 && onboard.tone ? "#c8a96e" : "#1a1810", transition: "background 0.3s" }} />
                <div style={{ fontSize: 10, color: "#444", textAlign: "center" }}>{s}</div>
              </div>
            ))}
          </div>

          {/* Step 1: Business name */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#c8a96e", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>01 — Business name</div>
            <input
              style={{ width: "100%", background: "#0d0c0a", border: "1px solid #1a1810", borderRadius: 10, padding: "14px 16px", color: "#e8e0d0", fontSize: 16, fontWeight: 600, outline: "none", fontFamily: "inherit", transition: "border-color 0.2s" }}
              value={onboard.businessName}
              onChange={e => setOnboard(o => ({ ...o, businessName: e.target.value }))}
              placeholder="e.g. Rocky Mountain Plumbing"
              autoFocus
              onFocus={e => (e.target.style.borderColor = "#c8a96e44")}
              onBlur={e => (e.target.style.borderColor = "#1a1810")}
            />
          </div>

          {/* Step 2: Primary goal */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#c8a96e", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>02 — What should this site do?</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {GOALS.map(g => (
                <button key={g} className={`goal-btn${onboard.goal === g ? " active" : ""}`} onClick={() => setOnboard(o => ({ ...o, goal: g }))}>
                  <span style={{ marginRight: 8 }}>{onboard.goal === g ? "✓" : "○"}</span>{g}
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Tone */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#c8a96e", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>03 — Vibe / Tone</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
              {TONES.map(t => (
                <button key={t.id} className={`tone-card${onboard.tone === t.id ? " active" : ""}`} onClick={() => setOnboard(o => ({ ...o, tone: t.id }))}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: onboard.tone === t.id ? "#c8a96e" : "#e8e0d0" }}>{t.label}</div>
                  <div style={{ fontSize: 11, color: "#555", lineHeight: 1.5 }}>{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Step 4: Design style */}
          <div style={{ marginBottom: 40 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#c8a96e", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>04 — Design style</div>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
              {DESIGN_STYLES.map(s => (
                <div key={s.id} className={`style-card${selectedStyle === s.id ? " active" : ""}`} onClick={() => setSelectedStyle(s.id)} style={{ width: 80, flexShrink: 0 }}>
                  <div style={{ height: 56, background: s.preview }} />
                  <div style={{ padding: "6px 4px", background: "#0d0c0a", fontSize: 10, fontWeight: 600, color: selectedStyle === s.id ? "#c8a96e" : "#555", textAlign: "center" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <button
            className="btn-gold"
            style={{ width: "100%", padding: "16px", fontSize: 16, borderRadius: 12, justifyContent: "center", opacity: !onboard.businessName || !onboard.goal || !onboard.tone ? 0.4 : 1 }}
            disabled={!onboard.businessName || !onboard.goal || !onboard.tone}
            onClick={handleBuild}
          >
            Build my site →
          </button>
          <div style={{ textAlign: "center", fontSize: 12, color: "#333", marginTop: 12 }}>Takes about 30 seconds. No account required.</div>
        </div>
      </div>
    </div>
  );

  // ── INPUT (HOMEPAGE) ──────────────────────────────────────────────────────
  return (
    <div style={{ background: "#070706", color: "#e8e0d0", minHeight: "100vh", fontFamily: "'Inter',-apple-system,sans-serif" }}>
      <style>{CSS}</style>

      {/* Nav */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", background: "rgba(7,7,6,0.92)", backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: "linear-gradient(135deg,#c8a96e,#a07840)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 13, color: "#0a0a08" }}>S</div>
          <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: -0.5 }}>Site<span style={{ color: "#c8a96e" }}>craft</span></span>
        </div>
        <div className="hide-mobile" style={{ display: "flex", gap: 24 }}>
          <a href="/how-it-works" className="nav-link">How it works</a>
          <a href="/features" className="nav-link">Features</a>
          <a href="/pricing" className="nav-link">Pricing</a>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a href="/dashboard" className="btn-ghost" style={{ padding: "8px 14px" }}>Sign in</a>
          <a href="/dashboard" className="btn-gold" style={{ padding: "8px 16px" }}>Get started</a>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 20px 60px", position: "relative" }}>
        {/* Glow */}
        <div style={{ position: "absolute", top: "35%", left: "50%", transform: "translate(-50%,-50%)", width: 700, height: 700, background: "radial-gradient(circle,rgba(200,169,110,0.05) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "25%", left: "30%", width: 300, height: 300, background: "radial-gradient(circle,rgba(200,169,110,0.03) 0%,transparent 70%)", pointerEvents: "none" }} />

        {/* Badge */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 6px 5px 14px", background: "#0d0c0a", border: "1px solid #1e1c14", borderRadius: 40, marginBottom: 28, animation: "fadeUp 0.5s ease" }}>
          <span style={{ fontSize: 12, color: "#666" }}>AI-powered website generation for local businesses</span>
          <span style={{ background: "#c8a96e22", border: "1px solid #c8a96e33", color: "#c8a96e", borderRadius: 40, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>NEW</span>
        </div>

        {/* Headline */}
        <h1 style={{ fontSize: "clamp(44px,6.5vw,88px)", fontWeight: 900, lineHeight: 1.0, letterSpacing: "-0.04em", textAlign: "center", marginBottom: 20, animation: "fadeUp 0.6s ease 0.08s both" }}>
          Your website,<br />
          <span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: "italic", background: "linear-gradient(135deg,#c8a96e,#e8c88e)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>built in 60 seconds.</span>
        </h1>

        <p style={{ fontSize: "clamp(15px,1.8vw,19px)", color: "#555", textAlign: "center", maxWidth: 480, lineHeight: 1.7, marginBottom: 36, animation: "fadeUp 0.6s ease 0.15s both" }}>
          Drop your URL or describe your business. We scan, design, and build a fast, beautiful site — then you customise and publish.
        </p>

        {/* Main input */}
        <div style={{ width: "100%", maxWidth: 600, animation: "fadeUp 0.6s ease 0.2s both" }}>
          <form onSubmit={handleInputSubmit}>
            <div className="input-box" style={{ display: "flex", alignItems: "center", padding: "8px 8px 8px 18px", gap: 8 }}>
              <span style={{ fontSize: 14, color: "#333", flexShrink: 0 }}>✦</span>
              <input ref={inputRef} className="hero-input" value={input} onChange={e => setInput(e.target.value)} placeholder="yoursite.com or describe your business…" />
              <button type="submit" className="btn-gold" style={{ padding: "11px 22px" }}>Build it →</button>
            </div>
          </form>

          {/* Examples */}
          <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            <span style={{ fontSize: 11, color: "#333" }}>Try:</span>
            {EXAMPLES.map(ex => (
              <button key={ex.label} className="example-chip" onClick={() => { setInput(ex.prompt); setOnboard(o => ({ ...o, businessName: ex.label })); setStep("onboard"); }}>{ex.label}</button>
            ))}
          </div>
        </div>

        {/* Trust signals */}
        <div style={{ display: "flex", gap: 28, marginTop: 48, animation: "fadeUp 0.6s ease 0.35s both", flexWrap: "wrap", justifyContent: "center" }}>
          {[["500+", "Sites built"], ["~30s", "Build time"], ["Free", "To start"], ["No code", "Required"]].map(([v, l]) => (
            <div key={l} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#e8e0d0" }}>{v}</div>
              <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS — below fold */}
      <section style={{ padding: "80px 20px", borderTop: "1px solid #0f0e0b", maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#c8a96e", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>How it works</div>
          <h2 style={{ fontSize: "clamp(28px,4vw,48px)", fontWeight: 900, letterSpacing: "-0.03em" }}>Drop URL. Customise. Publish.</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 20 }}>
          {[
            { n: "01", icon: "🔗", t: "Drop your URL", d: "Paste your existing site or just describe your business in plain English." },
            { n: "02", icon: "✦", t: "AI builds it", d: "We scrape, extract your brand, and generate a professional site in 30 seconds." },
            { n: "03", icon: "✏️", t: "Customise", d: "Chat to change anything. Click to edit text. Swap colours in one click." },
            { n: "04", icon: "🚀", t: "Publish", d: "Go live on your own domain or get a free sitecraft.app subdomain instantly." },
          ].map((s, i) => (
            <div key={i} style={{ background: "#0a0a08", border: "1px solid #111", borderRadius: 14, padding: "24px", transition: "border-color 0.2s" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#c8a96e", letterSpacing: "0.12em", marginBottom: 12 }}>{s.n}</div>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{s.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, letterSpacing: -0.3 }}>{s.t}</div>
              <div style={{ fontSize: 13, color: "#555", lineHeight: 1.7 }}>{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section style={{ padding: "60px 20px 100px", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 16 }}>
          {[
            { q: "I had something live in 45 seconds that looked better than my $3k agency site.", name: "Kyle B.", biz: "Bernier Heating", avatar: "KB" },
            { q: "Scraped my old site and rebuilt it. Didn't change a thing. It was already perfect.", name: "Trish M.", biz: "Prairie Bloom Florist", avatar: "TM" },
            { q: "First online lead came in the same week. Lead form just works.", name: "Josh L.", biz: "Lemay Electrical", avatar: "JL" },
          ].map((t, i) => (
            <div key={i} style={{ background: "#0a0a08", border: "1px solid #111", borderRadius: 14, padding: "24px" }}>
              <div style={{ color: "#c8a96e", fontSize: 12, marginBottom: 12 }}>★★★★★</div>
              <p style={{ fontSize: 14, color: "#888", lineHeight: 1.7, fontStyle: "italic", marginBottom: 16 }}>"{t.q}"</p>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#c8a96e22", border: "1px solid #c8a96e33", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#c8a96e" }}>{t.avatar}</div>
                <div><div style={{ fontSize: 13, fontWeight: 600 }}>{t.name}</div><div style={{ fontSize: 11, color: "#444" }}>{t.biz}</div></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "0 20px 80px" }}>
        <div style={{ maxWidth: 620, margin: "0 auto", textAlign: "center", background: "#0a0a08", border: "1px solid #111", borderRadius: 20, padding: "56px 32px" }}>
          <h2 style={{ fontSize: "clamp(26px,4vw,44px)", fontWeight: 900, letterSpacing: "-0.03em", marginBottom: 14, lineHeight: 1.15 }}>Ready to stop embarrassing yourself online?</h2>
          <p style={{ color: "#444", fontSize: 14, marginBottom: 28 }}>No agency. No waiting. No code. Build something real in the next 60 seconds.</p>
          <button className="btn-gold" style={{ padding: "14px 32px", fontSize: 16, borderRadius: 12, justifyContent: "center" }} onClick={() => { inputRef.current?.focus(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Build my site for free →</button>
          <div style={{ fontSize: 11, color: "#333", marginTop: 14 }}>No credit card · No account needed to start</div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #0f0e0b", padding: "32px 24px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: -0.3 }}>Site<span style={{ color: "#c8a96e" }}>craft</span></span>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <a href="/features" className="nav-link">Features</a>
            <a href="/pricing" className="nav-link">Pricing</a>
            <a href="/how-it-works" className="nav-link">How it works</a>
            <a href="/dashboard" className="nav-link">Dashboard</a>
          </div>
          <div style={{ fontSize: 12, color: "#333" }}>© 2026 Sitecraft · Built in Alberta 🇨🇦</div>
        </div>
      </footer>
    </div>
  );
}
