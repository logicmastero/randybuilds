"use client";
import { useState, useEffect, useRef } from "react";

// ─── Typewriter ────────────────────────────────────────────────────────────────
const WORDS = ["converts.", "gets you calls.", "builds trust.", "closes deals.", "gets found."];
function TypeCycle() {
  const [idx, setIdx] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    const word = WORDS[idx];
    let t: ReturnType<typeof setTimeout>;
    if (!deleting && displayed.length < word.length) t = setTimeout(() => setDisplayed(word.slice(0, displayed.length + 1)), 75);
    else if (!deleting && displayed.length === word.length) t = setTimeout(() => setDeleting(true), 2000);
    else if (deleting && displayed.length > 0) t = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 35);
    else { setDeleting(false); setIdx(i => (i + 1) % WORDS.length); }
    return () => clearTimeout(t);
  }, [displayed, deleting, idx]);
  return <span style={{ color: "#c8a96e" }}>{displayed}<span style={{ animation: "blink 1s step-end infinite", color: "#c8a96e" }}>|</span></span>;
}

// ─── CountUp ──────────────────────────────────────────────────────────────────
function CountUp({ end, suffix = "", prefix = "", duration = 1800 }: { end: number; suffix?: string; prefix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = Date.now();
        const tick = () => {
          const p = Math.min((Date.now() - start) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          setCount(Math.floor(eased * end));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [end, duration]);
  return <span ref={ref}>{prefix}{count}{suffix}</span>;
}

// ─── Portfolio items ───────────────────────────────────────────────────────────
const PORTFOLIO = [
  {
    name: "Apex Electrical",
    type: "Electrical Contractor",
    location: "Cochrane, AB",
    tag: "Trades",
    color: "#c8a96e",
    description: "Family-run electrical company with zero web presence. Booked 3 new clients in first month after launch.",
    metrics: ["3 new clients / month 1", "Mobile-first design", "Google-ready from day one"],
  },
  {
    name: "Northern Edge Landscaping",
    type: "Landscaping & Snow Removal",
    location: "Red Deer, AB",
    tag: "Seasonal Services",
    color: "#7cb87c",
    description: "Operating on Facebook only. Built a full 5-page site with online quote form. Quote requests tripled.",
    metrics: ["3x quote requests", "Quote form integration", "Seasonal service pages"],
  },
  {
    name: "Firebag Mechanical",
    type: "Industrial Mechanical Services",
    location: "Fort McMurray, AB",
    tag: "Oilfield",
    color: "#6e9ec8",
    description: "Field services company needing a credible web presence for procurement bids. Clean, professional, fast.",
    metrics: ["Passed vendor screening", "PDF-ready brochure page", "2-week delivery"],
  },
];

// ─── Process steps ─────────────────────────────────────────────────────────────
const PROCESS = [
  { num: "01", title: "You paste your URL", body: "Or just describe your business. I analyze what exists — or start from scratch if there's nothing." },
  { num: "02", title: "AI builds a live preview", body: "In 60 seconds you see a real redesign of your site — real copy, real layout, shareable link." },
  { num: "03", title: "We align on the vision", body: "Quick call or message. I show you the direction and we lock in the details before I build." },
  { num: "04", title: "Live in 2 weeks", body: "Full site, hosted, handed over. You walk away with a website that actually works." },
];

// ─── FAQ ──────────────────────────────────────────────────────────────────────
const FAQ = [
  { q: "Do I need anything to get started?", a: "Just your business name and an idea of what you do. If you have an existing site, even better — I'll tear it apart and rebuild it properly." },
  { q: "How long does it really take?", a: "Standard builds: 10–14 days. Rush builds available. I don't disappear on you — you'll hear from me every few days with progress." },
  { q: "What if I hate it?", a: "We do a revision round after your first look. I want you to love it. If something's off, we fix it — that's part of the deal." },
  { q: "Do you do hosting and domain setup?", a: "Yes. I handle everything — domain config, DNS, SSL, hosting. You don't need to touch a single technical setting." },
  { q: "What about updates after launch?", a: "Monthly retainer plans start at $150/month. Covers minor updates, hosting management, and priority support. Optional but most clients stay on." },
];

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<null | { previewUrl: string; previewHtml?: string; businessName: string; slug?: string }>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const previewRef = useRef<HTMLIFrameElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      let clean = url.trim();
      if (!clean.startsWith("http")) clean = "https://" + clean;
      const r1 = await fetch("/api/scrape", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: clean }) });
      const d1 = await r1.json();
      if (!r1.ok) throw new Error(d1.error || "Scrape failed");
      setResult(d1);
      setTimeout(() => previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: "#0c0b09", color: "#e8e0d0", fontFamily: "'Inter', -apple-system, sans-serif", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        ::selection { background: rgba(200,169,110,0.3); color: #e8e0d0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0c0b09; }
        ::-webkit-scrollbar-thumb { background: #2a2820; border-radius: 2px; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:0.6} 50%{opacity:1} }
        .fade-up { animation: fadeUp 0.7s ease forwards; }
        .spinner { animation: spin 0.8s linear infinite; }
        .nav-link { color: rgba(232,224,208,0.5); font-size: 14px; font-weight: 500; text-decoration: none; transition: color 0.2s; letter-spacing: 0.01em; }
        .nav-link:hover { color: #e8e0d0; }
        .btn-primary {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 14px 28px; border-radius: 10px; font-weight: 700; font-size: 15px;
          background: #c8a96e; color: #0c0b09; border: none; cursor: pointer;
          text-decoration: none; transition: all 0.2s; letter-spacing: -0.01em;
        }
        .btn-primary:hover { background: #d4b87e; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(200,169,110,0.25); }
        .btn-secondary {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 14px 28px; border-radius: 10px; font-weight: 600; font-size: 15px;
          background: transparent; color: rgba(232,224,208,0.7); border: 1px solid rgba(232,224,208,0.15);
          cursor: pointer; text-decoration: none; transition: all 0.2s;
        }
        .btn-secondary:hover { border-color: rgba(232,224,208,0.35); color: #e8e0d0; }
        .card { background: #141210; border: 1px solid #2a2820; border-radius: 16px; transition: border-color 0.2s, transform 0.2s; }
        .card:hover { border-color: rgba(200,169,110,0.3); transform: translateY(-2px); }
        .tag { display: inline-block; padding: 4px 12px; border-radius: 100px; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; }
        .section-label { font-size: 11px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #c8a96e; margin-bottom: 16px; }
        .divider { width: 100%; height: 1px; background: linear-gradient(to right, transparent, #2a2820, transparent); }
        input, textarea { outline: none; }
        input::placeholder { color: rgba(232,224,208,0.3); }
        .url-input:focus { border-color: rgba(200,169,110,0.5) !important; }
      `}</style>

      {/* ── NAV ──────────────────────────────────────────────────────────────── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 32px", height: 64,
        background: "rgba(12,11,9,0.9)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid #1e1c18",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#c8a96e", animation: "pulse 2s ease-in-out infinite" }} />
          <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: "-0.03em", color: "#e8e0d0" }}>
            randy<span style={{ color: "#c8a96e" }}>builds</span>
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 32 }} className="nav-links-desktop">
          <a href="#work" className="nav-link">Work</a>
          <a href="#process" className="nav-link">Process</a>
          <a href="#pricing" className="nav-link">Pricing</a>
          <a href="#faq" className="nav-link">FAQ</a>
        </div>
        <a href="#preview-tool" className="btn-primary" style={{ padding: "10px 20px", fontSize: 13 }}>
          Get Your Preview →
        </a>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "120px 24px 80px", textAlign: "center", position: "relative",
      }}>
        {/* Subtle grain texture overlay */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: "radial-gradient(ellipse at 50% 40%, rgba(200,169,110,0.05) 0%, transparent 60%)",
        }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: 760, margin: "0 auto" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "6px 16px", borderRadius: 100, marginBottom: 32,
            background: "rgba(200,169,110,0.08)", border: "1px solid rgba(200,169,110,0.2)",
            fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#c8a96e",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#c8a96e", animation: "pulse 2s ease-in-out infinite" }} />
            Alberta Web Design — Previews in 60 Seconds
          </div>

          <h1 style={{
            fontSize: "clamp(3rem, 7vw, 5.5rem)", fontWeight: 900, lineHeight: 1.05,
            letterSpacing: "-0.04em", color: "#e8e0d0", marginBottom: 28,
          }}>
            Your website should<br />
            be one that&nbsp;
            <TypeCycle />
          </h1>

          <p style={{
            fontSize: "clamp(1rem, 2vw, 1.2rem)", color: "rgba(232,224,208,0.55)",
            maxWidth: 560, margin: "0 auto 48px", lineHeight: 1.65, fontWeight: 400,
          }}>
            Paste your URL and see a live redesign in 60 seconds. Built for Alberta small businesses that are tired of losing customers to a bad website.
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="#preview-tool" className="btn-primary">See My Preview →</a>
            <a href="#work" className="btn-secondary">View Work ↓</a>
          </div>

          {/* Social proof row */}
          <div style={{
            marginTop: 56, display: "flex", alignItems: "center", justifyContent: "center",
            gap: 32, flexWrap: "wrap",
          }}>
            {[
              { val: "2 weeks", label: "Average delivery" },
              { val: "$800", label: "Starting price (CAD)" },
              { val: "100%", label: "Mobile-first" },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#c8a96e", letterSpacing: "-0.03em" }}>{s.val}</div>
                <div style={{ fontSize: 12, color: "rgba(232,224,208,0.4)", marginTop: 2, fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{ position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(232,224,208,0.2)", fontWeight: 600 }}>scroll</span>
          <div style={{ width: 1, height: 40, background: "linear-gradient(to bottom, rgba(200,169,110,0.4), transparent)" }} />
        </div>
      </section>

      <div className="divider" />

      {/* ── PREVIEW TOOL ─────────────────────────────────────────────────────── */}
      <section id="preview-tool" style={{ padding: "100px 24px", maxWidth: 760, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div className="section-label">The Tool</div>
          <h2 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 16 }}>
            Paste your URL.<br />See your new site.
          </h2>
          <p style={{ color: "rgba(232,224,208,0.5)", fontSize: 16, lineHeight: 1.6 }}>
            No account. No credit card. Just your URL and 60 seconds.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{
            display: "flex", flexDirection: "column", gap: 12,
            background: "#141210", border: "1px solid #2a2820", borderRadius: 16, padding: 16,
          }}>
            <input
              className="url-input"
              type="text"
              placeholder="yourbusiness.com"
              value={url}
              onChange={e => setUrl(e.target.value)}
              style={{
                width: "100%", padding: "16px 20px", fontSize: 17, fontWeight: 500,
                background: "#0c0b09", border: "1px solid #2a2820", borderRadius: 10,
                color: "#e8e0d0", fontFamily: "inherit", transition: "border-color 0.2s",
              }}
            />
            <button type="submit" disabled={loading || !url} className="btn-primary" style={{
              width: "100%", justifyContent: "center", padding: "16px",
              fontSize: 16, opacity: !url ? 0.4 : 1,
            }}>
              {loading ? (
                <>
                  <svg className="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  Analyzing your site...
                </>
              ) : "Generate My Preview →"}
            </button>
          </div>
        </form>

        {error && (
          <div style={{ marginTop: 16, padding: 16, borderRadius: 10, background: "rgba(220,80,60,0.1)", border: "1px solid rgba(220,80,60,0.3)", color: "#ff6b6b", fontSize: 14 }}>
            {error}
          </div>
        )}

        {result && (
          <div ref={previewRef as any} style={{ marginTop: 32 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#e8e0d0" }}>{result.businessName}</div>
                <div style={{ fontSize: 13, color: "#c8a96e", marginTop: 2 }}>Live redesign preview ✓</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {result.slug && (
                  <a href={result.previewUrl} target="_blank" style={{ padding: "8px 16px", borderRadius: 8, background: "#1a1816", border: "1px solid #2a2820", color: "rgba(232,224,208,0.6)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                    Open Full Screen ↗
                  </a>
                )}
                <a href="#contact" className="btn-primary" style={{ padding: "8px 16px", fontSize: 13 }}>
                  Get This Built →
                </a>
              </div>
            </div>
            <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #2a2820", height: 560, position: "relative" }}>
              <iframe
                ref={previewRef}
                srcDoc={result.previewHtml}
                style={{ width: "100%", height: "100%", border: "none", background: "#fff" }}
                title="Preview"
                sandbox="allow-same-origin allow-scripts"
              />
            </div>
          </div>
        )}
      </section>

      <div className="divider" />

      {/* ── WORK / PORTFOLIO ─────────────────────────────────────────────────── */}
      <section id="work" style={{ padding: "100px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ marginBottom: 64 }}>
            <div className="section-label">Work</div>
            <h2 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 900, letterSpacing: "-0.04em", maxWidth: 600 }}>
              Real Alberta businesses. Real results.
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
            {PORTFOLIO.map((p, i) => (
              <div key={i} className="card" style={{ padding: 28 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 17, color: "#e8e0d0", letterSpacing: "-0.02em" }}>{p.name}</div>
                    <div style={{ fontSize: 13, color: "rgba(232,224,208,0.45)", marginTop: 2 }}>{p.location}</div>
                  </div>
                  <span className="tag" style={{ background: `${p.color}18`, color: p.color, border: `1px solid ${p.color}30` }}>{p.tag}</span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.05em", color: "rgba(232,224,208,0.35)", textTransform: "uppercase", marginBottom: 6 }}>{p.type}</div>
                <p style={{ fontSize: 14, color: "rgba(232,224,208,0.6)", lineHeight: 1.65, marginBottom: 20 }}>{p.description}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {p.metrics.map((m, j) => (
                    <div key={j} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "rgba(232,224,208,0.5)" }}>
                      <span style={{ color: p.color, fontSize: 14 }}>✓</span> {m}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="divider" />

      {/* ── STATS BAR ────────────────────────────────────────────────────────── */}
      <section style={{ padding: "60px 24px", background: "#0e0d0b" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 40, textAlign: "center" }}>
          {[
            { end: 14, suffix: " days", label: "Average delivery time" },
            { end: 100, suffix: "%", label: "Mobile-first builds" },
            { prefix: "$", end: 800, suffix: "+", label: "Starting price (CAD)" },
            { end: 2, suffix: " weeks", label: "From deposit to live" },
          ].map((s, i) => (
            <div key={i}>
              <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: "-0.04em", color: "#c8a96e" }}>
                <CountUp end={s.end} suffix={s.suffix} prefix={s.prefix || ""} />
              </div>
              <div style={{ fontSize: 13, color: "rgba(232,224,208,0.4)", marginTop: 4, fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="divider" />

      {/* ── PROCESS ──────────────────────────────────────────────────────────── */}
      <section id="process" style={{ padding: "100px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ marginBottom: 64 }}>
            <div className="section-label">The Process</div>
            <h2 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 900, letterSpacing: "-0.04em" }}>
              From first look to live site<br />in 4 steps.
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 2 }}>
            {PROCESS.map((p, i) => (
              <div key={i} style={{ padding: "32px 28px", position: "relative" }}>
                <div style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: "#c8a96e", letterSpacing: "0.12em", marginBottom: 16 }}>{p.num}</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "#e8e0d0", letterSpacing: "-0.02em", marginBottom: 10 }}>{p.title}</h3>
                <p style={{ fontSize: 14, color: "rgba(232,224,208,0.5)", lineHeight: 1.65 }}>{p.body}</p>
                {i < PROCESS.length - 1 && (
                  <div style={{ position: "absolute", top: "38px", right: 0, width: 1, height: "calc(100% - 76px)", background: "#2a2820" }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="divider" />

      {/* ── PRICING ──────────────────────────────────────────────────────────── */}
      <section id="pricing" style={{ padding: "100px 24px", background: "#0e0d0b" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div className="section-label">Pricing</div>
            <h2 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 900, letterSpacing: "-0.04em" }}>
              Transparent pricing.<br />No surprises.
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
            {[
              {
                name: "Starter", price: "$800", per: "CAD", highlight: false,
                desc: "Perfect for getting online fast. Clean, professional, mobile-ready.",
                features: ["5 pages", "Mobile-first design", "Contact form", "Basic SEO setup", "Domain + hosting config", "1 revision round"],
              },
              {
                name: "Standard", price: "$1,500", per: "CAD", highlight: true,
                desc: "More pages, more power. Built to convert visitors into customers.",
                features: ["Up to 8 pages", "Everything in Starter", "Booking or quote form", "Google Analytics setup", "2 revision rounds", "30-day post-launch support"],
              },
              {
                name: "Retainer", price: "$150", per: "CAD/month", highlight: false,
                desc: "Keep your site sharp. Updates, hosting, support — handled.",
                features: ["Monthly content updates", "Hosting management", "Priority response", "Minor design changes", "Performance monitoring", "Cancel anytime"],
              },
            ].map((p, i) => (
              <div key={i} className="card" style={{
                padding: 28,
                border: p.highlight ? "1px solid rgba(200,169,110,0.4)" : "1px solid #2a2820",
                background: p.highlight ? "rgba(200,169,110,0.04)" : "#141210",
                position: "relative",
              }}>
                {p.highlight && (
                  <div style={{
                    position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                    background: "#c8a96e", color: "#0c0b09", fontSize: 10, fontWeight: 800,
                    padding: "4px 12px", borderRadius: 100, letterSpacing: "0.1em", textTransform: "uppercase",
                    whiteSpace: "nowrap",
                  }}>Most Popular</div>
                )}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(232,224,208,0.45)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>{p.name}</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                    <span style={{ fontSize: 36, fontWeight: 900, letterSpacing: "-0.04em", color: "#e8e0d0" }}>{p.price}</span>
                    <span style={{ fontSize: 13, color: "rgba(232,224,208,0.4)" }}>{p.per}</span>
                  </div>
                  <p style={{ fontSize: 13, color: "rgba(232,224,208,0.5)", marginTop: 8, lineHeight: 1.55 }}>{p.desc}</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
                  {p.features.map((f, j) => (
                    <div key={j} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "rgba(232,224,208,0.6)" }}>
                      <span style={{ color: "#c8a96e" }}>✓</span> {f}
                    </div>
                  ))}
                </div>
                <a href="#preview-tool" className={p.highlight ? "btn-primary" : "btn-secondary"} style={{ width: "100%", justifyContent: "center", display: "flex" }}>
                  {p.highlight ? "Get Started →" : "Learn More →"}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="divider" />

      {/* ── FAQ ──────────────────────────────────────────────────────────────── */}
      <section id="faq" style={{ padding: "100px 24px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div className="section-label">FAQ</div>
            <h2 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 900, letterSpacing: "-0.04em" }}>
              Questions answered.
            </h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {FAQ.map((f, i) => (
              <div key={i} style={{ borderBottom: "1px solid #1e1c18" }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{
                    width: "100%", textAlign: "left", padding: "20px 0", background: "none", border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
                    color: "#e8e0d0", fontFamily: "inherit",
                  }}
                >
                  <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em" }}>{f.q}</span>
                  <span style={{ color: "#c8a96e", fontSize: 20, flexShrink: 0, transition: "transform 0.2s", transform: openFaq === i ? "rotate(45deg)" : "none" }}>+</span>
                </button>
                {openFaq === i && (
                  <div style={{ paddingBottom: 20, fontSize: 14, color: "rgba(232,224,208,0.55)", lineHeight: 1.7 }}>
                    {f.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="divider" />

      {/* ── CLOSING CTA ──────────────────────────────────────────────────────── */}
      <section id="contact" style={{ padding: "100px 24px", textAlign: "center", position: "relative" }}>
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: "radial-gradient(ellipse at 50% 50%, rgba(200,169,110,0.06) 0%, transparent 65%)",
        }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 600, margin: "0 auto" }}>
          <div className="section-label" style={{ textAlign: "center" }}>Ready?</div>
          <h2 style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 20 }}>
            Stop losing customers<br />to a bad website.
          </h2>
          <p style={{ fontSize: 17, color: "rgba(232,224,208,0.5)", marginBottom: 40, lineHeight: 1.65 }}>
            Paste your URL and see what your site could look like in 60 seconds. No commitment. No credit card.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="#preview-tool" className="btn-primary" style={{ fontSize: 16, padding: "16px 32px" }}>See My Preview →</a>
            <a href="mailto:hello@randybuilds.ca" className="btn-secondary" style={{ fontSize: 16, padding: "16px 32px" }}>Email Directly</a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer style={{
        padding: "32px 32px", background: "#0a0908",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderTop: "1px solid #1e1c18", flexWrap: "wrap", gap: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: "-0.03em", color: "#e8e0d0" }}>
            randy<span style={{ color: "#c8a96e" }}>builds</span>
          </span>
          <span style={{ fontSize: 12, color: "rgba(232,224,208,0.25)", marginLeft: 8 }}>Alberta web design from $800 CAD</span>
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          {["Work", "Process", "Pricing", "FAQ"].map(l => (
            <a key={l} href={`#${l.toLowerCase()}`} style={{ fontSize: 13, color: "rgba(232,224,208,0.35)", textDecoration: "none", fontWeight: 500 }}>{l}</a>
          ))}
        </div>
        <div style={{ fontSize: 12, color: "rgba(232,224,208,0.2)" }}>© 2026 RandyBuilds</div>
      </footer>
    </div>
  );
}
