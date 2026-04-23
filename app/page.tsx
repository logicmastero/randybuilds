"use client";
import { useState, useEffect, useRef } from "react";

const WORDS = ["converts.", "impresses.", "closes deals.", "builds trust.", "gets found."];

function TypeCycle() {
  const [idx, setIdx] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const word = WORDS[idx];
    let timeout: ReturnType<typeof setTimeout>;
    if (!deleting && displayed.length < word.length) {
      timeout = setTimeout(() => setDisplayed(word.slice(0, displayed.length + 1)), 80);
    } else if (!deleting && displayed.length === word.length) {
      timeout = setTimeout(() => setDeleting(true), 1800);
    } else if (deleting && displayed.length > 0) {
      timeout = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 40);
    } else if (deleting && displayed.length === 0) {
      setDeleting(false);
      setIdx((i) => (i + 1) % WORDS.length);
    }
    return () => clearTimeout(timeout);
  }, [displayed, deleting, idx]);

  return (
    <span className="gradient-text cursor">
      {displayed}
    </span>
  );
}

function CountUp({ end, suffix = "", duration = 2000 }: { end: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = Date.now();
        const tick = () => {
          const progress = Math.min((Date.now() - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.floor(eased * end));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [end, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<null | { previewUrl: string; businessName: string }>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", handleMouse);
    return () => window.removeEventListener("mousemove", handleMouse);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      let cleanUrl = url.trim();
      if (!cleanUrl.startsWith("http")) cleanUrl = "https://" + cleanUrl;

      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: cleanUrl }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to analyze website");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid-bg min-h-screen" style={{ background: "#080808" }}>
      {/* Cursor glow */}
      <div
        className="fixed pointer-events-none z-0 rounded-full"
        style={{
          width: 400,
          height: 400,
          left: mousePos.x - 200,
          top: mousePos.y - 200,
          background: "radial-gradient(circle, rgba(0,245,160,0.06) 0%, transparent 70%)",
          transition: "left 0.15s ease, top 0.15s ease",
        }}
      />

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-5"
        style={{ background: "rgba(8,8,8,0.8)", backdropFilter: "blur(20px)", borderBottom: "1px solid #151515" }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full pulse" style={{ background: "#00f5a0" }} />
          <span className="font-bold text-lg tracking-tight" style={{ color: "#f0f0f0", fontFamily: "monospace" }}>
            randy<span style={{ color: "#00f5a0" }}>builds</span>
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          {["Work", "Process", "Pricing", "Contact"].map((item) => (
            <a key={item} href={`#${item.toLowerCase()}`}
              className="text-sm transition-colors duration-200"
              style={{ color: "#888", fontWeight: 500 }}
              onMouseEnter={e => (e.currentTarget.style.color = "#00f5a0")}
              onMouseLeave={e => (e.currentTarget.style.color = "#888")}>
              {item}
            </a>
          ))}
        </div>
        <a href="#preview"
          className="hidden md:flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 glow-accent"
          style={{ background: "#00f5a0", color: "#000" }}
          onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.03)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}>
          Get Your Preview
        </a>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-16 text-center">
        {/* Decorative orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(0,245,160,0.08) 0%, transparent 70%)" }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(0,217,245,0.06) 0%, transparent 70%)" }} />

        <div className="relative z-10 max-w-5xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-xs font-mono font-semibold uppercase tracking-widest"
            style={{ background: "rgba(0,245,160,0.08)", border: "1px solid rgba(0,245,160,0.2)", color: "#00f5a0" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-current pulse" />
            Premium Web Design — Live Previews in 60 Seconds
          </div>

          {/* Headline */}
          <h1 className="font-black leading-none mb-6 tracking-tight"
            style={{ fontSize: "clamp(3rem, 8vw, 7rem)", color: "#f0f0f0" }}>
            Your website should<br />
            be a site that{" "}
            <TypeCycle />
          </h1>

          <p className="text-xl mb-12 max-w-2xl mx-auto leading-relaxed" style={{ color: "#888" }}>
            Paste your current URL. Our system analyzes your brand and generates a premium redesign — live, shareable, and ready to buy. No fluff. No waiting. Just results.
          </p>

          {/* URL Input — THE HOOK */}
          <div id="preview" className="max-w-2xl mx-auto">
            <form onSubmit={handleSubmit}>
              <div className="relative gradient-border rounded-2xl p-1" style={{ background: "linear-gradient(#111,#111) padding-box, linear-gradient(135deg, #00f5a0, #00d9f5) border-box", border: "1px solid transparent" }}>
                <div className="flex items-center rounded-xl overflow-hidden" style={{ background: "#0e0e0e" }}>
                  <div className="flex items-center gap-2 pl-5" style={{ color: "#555" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                  </div>
                  <input
                    type="text"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    placeholder="yourbusiness.com"
                    className="flex-1 px-4 py-5 text-lg bg-transparent outline-none"
                    style={{ color: "#f0f0f0", caretColor: "#00f5a0" }}
                  />
                  <button
                    type="submit"
                    disabled={loading || !url}
                    className="m-2 px-7 py-3 rounded-xl font-bold text-sm transition-all duration-200 disabled:opacity-40"
                    style={{ background: loading ? "#333" : "linear-gradient(135deg, #00f5a0, #00d9f5)", color: "#000", minWidth: 140 }}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2 justify-center">
                        <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                        Analyzing...
                      </span>
                    ) : "See My Preview →"}
                  </button>
                </div>
              </div>
            </form>

            {error && (
              <div className="mt-4 p-4 rounded-xl text-sm" style={{ background: "rgba(255,60,60,0.1)", border: "1px solid rgba(255,60,60,0.2)", color: "#ff6b6b" }}>
                {error}
              </div>
            )}

            {result && (
              <div className="mt-6 p-6 rounded-2xl text-left" style={{ background: "#0e0e0e", border: "1px solid #00f5a0", boxShadow: "0 0 30px rgba(0,245,160,0.15)" }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-3 h-3 rounded-full" style={{ background: "#00f5a0" }} />
                  <span className="font-bold" style={{ color: "#00f5a0" }}>Preview Ready — {result.businessName}</span>
                </div>
                <p className="text-sm mb-4" style={{ color: "#888" }}>Your premium redesign is live. Share it with your team or purchase the full build.</p>
                <div className="flex gap-3">
                  <a href={result.previewUrl} target="_blank" rel="noopener noreferrer"
                    className="flex-1 py-3 rounded-xl font-semibold text-sm text-center transition-all"
                    style={{ background: "linear-gradient(135deg, #00f5a0, #00d9f5)", color: "#000" }}>
                    View Full Preview →
                  </a>
                  <a href="#pricing"
                    className="px-6 py-3 rounded-xl font-semibold text-sm transition-all"
                    style={{ background: "#1a1a1a", border: "1px solid #333", color: "#f0f0f0" }}>
                    See Pricing
                  </a>
                </div>
              </div>
            )}

            <p className="mt-4 text-xs" style={{ color: "#555" }}>
              No account needed. No credit card. Just your URL.
            </p>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "#444" }}>scroll</span>
          <div className="w-px h-12 mx-auto" style={{ background: "linear-gradient(to bottom, #00f5a0, transparent)" }} />
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-12 px-6" style={{ borderTop: "1px solid #151515", borderBottom: "1px solid #151515", background: "#0a0a0a" }}>
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { n: 2, s: " weeks", label: "Average delivery" },
            { n: 94, s: "%", label: "Client satisfaction" },
            { n: 3, s: "x", label: "Avg. conversion lift" },
            { n: 100, s: "%", label: "Mobile-first builds" },
          ].map(({ n, s, label }) => (
            <div key={label}>
              <div className="text-4xl font-black mb-1 gradient-text">
                <CountUp end={n} suffix={s} />
              </div>
              <div className="text-sm" style={{ color: "#666" }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="process" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block font-mono text-xs uppercase tracking-widest mb-4 px-3 py-1 rounded-full"
              style={{ color: "#00f5a0", background: "rgba(0,245,160,0.08)", border: "1px solid rgba(0,245,160,0.15)" }}>
              The Process
            </div>
            <h2 className="text-4xl md:text-5xl font-black" style={{ color: "#f0f0f0" }}>
              From broken to{" "}
              <span className="gradient-text">brilliant</span>
              <br />in 4 steps.
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: "01", title: "Paste Your URL", desc: "Drop in your current website. We scrape your brand, colors, logo, and copy automatically.", icon: "🔗" },
              { step: "02", title: "AI Analysis", desc: "Our system identifies what's broken, what's missing, and what your site needs to convert visitors.", icon: "⚡" },
              { step: "03", title: "Live Preview", desc: "Get a real, shareable preview of your premium redesign — built from your actual brand assets.", icon: "✨" },
              { step: "04", title: "Purchase & Launch", desc: "Love it? Purchase and we build the real thing in 2 weeks. Or vibe-code it yourself with our platform.", icon: "🚀" },
            ].map(({ step, title, desc, icon }) => (
              <div key={step} className="relative p-6 rounded-2xl transition-all duration-300 group"
                style={{ background: "#0e0e0e", border: "1px solid #1a1a1a" }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(0,245,160,0.3)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#1a1a1a"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}>
                <div className="font-mono text-xs mb-4" style={{ color: "#00f5a0" }}>{step}</div>
                <div className="text-3xl mb-3">{icon}</div>
                <h3 className="font-bold text-lg mb-2" style={{ color: "#f0f0f0" }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#666" }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6" style={{ background: "#0a0a0a" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block font-mono text-xs uppercase tracking-widest mb-4 px-3 py-1 rounded-full"
              style={{ color: "#00f5a0", background: "rgba(0,245,160,0.08)", border: "1px solid rgba(0,245,160,0.15)" }}>
              Pricing
            </div>
            <h2 className="text-4xl md:text-5xl font-black" style={{ color: "#f0f0f0" }}>
              Transparent pricing.<br />
              <span className="gradient-text">No surprises.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: "Starter",
                price: "$800",
                period: "CAD one-time",
                desc: "Perfect for businesses that just need a clean, fast, professional web presence.",
                features: ["5 pages", "Mobile-first design", "Contact form", "Google Analytics", "1 round of revisions", "2-week delivery"],
                accent: false,
              },
              {
                name: "Standard",
                price: "$1,500",
                period: "CAD one-time",
                desc: "For businesses ready to convert visitors into customers with a high-performance site.",
                features: ["Up to 10 pages", "Custom animations", "Booking or lead forms", "SEO optimization", "3 rounds of revisions", "Speed optimization", "2-week delivery"],
                accent: true,
              },
              {
                name: "Platform",
                price: "$99",
                period: "CAD / month",
                desc: "Build and manage your own site with our AI-powered vibe coding platform.",
                features: ["AI site generator", "Drag & drop editor", "Unlimited pages", "Custom domain", "Hosting included", "Priority support"],
                accent: false,
              },
            ].map(({ name, price, period, desc, features, accent }) => (
              <div key={name} className="relative p-8 rounded-2xl transition-all duration-300"
                style={{
                  background: accent ? "linear-gradient(145deg, #0f1f1a, #0e0e0e)" : "#0e0e0e",
                  border: accent ? "1px solid rgba(0,245,160,0.4)" : "1px solid #1a1a1a",
                  boxShadow: accent ? "0 0 40px rgba(0,245,160,0.1)" : "none",
                  transform: accent ? "scale(1.03)" : "scale(1)",
                }}>
                {accent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold"
                    style={{ background: "linear-gradient(135deg, #00f5a0, #00d9f5)", color: "#000" }}>
                    MOST POPULAR
                  </div>
                )}
                <div className="mb-6">
                  <div className="text-sm font-mono uppercase tracking-widest mb-2" style={{ color: accent ? "#00f5a0" : "#666" }}>{name}</div>
                  <div className="text-5xl font-black mb-1" style={{ color: "#f0f0f0" }}>{price}</div>
                  <div className="text-sm" style={{ color: "#555" }}>{period}</div>
                  <p className="text-sm mt-3 leading-relaxed" style={{ color: "#666" }}>{desc}</p>
                </div>
                <ul className="space-y-3 mb-8">
                  {features.map(f => (
                    <li key={f} className="flex items-center gap-3 text-sm" style={{ color: "#aaa" }}>
                      <span style={{ color: "#00f5a0" }}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                <a href="#preview"
                  className="block w-full py-3 rounded-xl font-semibold text-sm text-center transition-all duration-200"
                  style={{
                    background: accent ? "linear-gradient(135deg, #00f5a0, #00d9f5)" : "#1a1a1a",
                    color: accent ? "#000" : "#f0f0f0",
                    border: accent ? "none" : "1px solid #333",
                  }}
                  onMouseEnter={e => { if (!accent) (e.currentTarget as HTMLAnchorElement).style.borderColor = "#00f5a0"; }}
                  onMouseLeave={e => { if (!accent) (e.currentTarget as HTMLAnchorElement).style.borderColor = "#333"; }}>
                  Get My Preview →
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at center, rgba(0,245,160,0.05) 0%, transparent 70%)" }} />
        <div className="relative z-10 max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-black mb-6" style={{ color: "#f0f0f0" }}>
            Your competitors are<br />
            <span className="gradient-text glow-text">already online.</span>
          </h2>
          <p className="text-xl mb-10" style={{ color: "#666" }}>
            Stop losing customers to businesses with better websites. Get your preview now — free, instant, no strings attached.
          </p>
          <a href="#preview"
            className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl font-bold text-lg transition-all duration-200 glow-accent"
            style={{ background: "linear-gradient(135deg, #00f5a0, #00d9f5)", color: "#000" }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1.04)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1)"; }}>
            See Your New Website Free
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 text-center" style={{ borderTop: "1px solid #111", background: "#080808" }}>
        <div className="font-bold text-lg mb-2" style={{ fontFamily: "monospace" }}>
          randy<span style={{ color: "#00f5a0" }}>builds</span>
        </div>
        <p className="text-sm" style={{ color: "#444" }}>Premium web design. Built different. © 2026</p>
      </footer>
    </div>
  );
}
