"use client";
import { useEffect } from "react";

const STEPS = [
  {
    num: "01",
    icon: "🔗",
    title: "Drop Your URL or Describe Your Business",
    desc: "Paste your existing website URL and we'll scan everything — your content, colours, services, contact info, and images. Don't have a site? Just type what your business does in plain English.",
    detail: ["Works with any existing website", "Extracts real colours and branding", "Pulls in your services and copy", "Works from a description if no site exists"],
  },
  {
    num: "02",
    icon: "🤖",
    title: "AI Scans, Extracts, and Rebuilds",
    desc: "Our AI scrapes your site, extracts every piece of usable information, and rebuilds it as a clean, modern, mobile-first website using current best practices. No templates. It's custom to you.",
    detail: ["60-second average build time", "Mobile-first and responsive by default", "Modern, professional design every time", "Firecrawl-powered deep content extraction"],
  },
  {
    num: "03",
    icon: "✏️",
    title: "Customize With Chat or Direct Editing",
    desc: "Open the editor and make it yours. Chat with the AI to make big changes — 'make the hero darker', 'add a pricing section', 'change the font'. Or double-click any text to edit it directly.",
    detail: ["Chat to make structural changes", "Double-click any text to edit inline", "One-click colour palette switching", "30-step undo/redo history"],
  },
  {
    num: "04",
    icon: "🚀",
    title: "Publish and Start Getting Leads",
    desc: "Download the HTML, connect your custom domain, or share a live preview link. Every site includes auto-injected lead capture and analytics — so you start seeing results immediately.",
    detail: ["Custom domain connection included", "Auto-injected email lead capture", "Built-in analytics — no Google Analytics needed", "Share link ready in one click"],
  },
];

export default function HowItWorksPage() {
  useEffect(() => {
    const els = document.querySelectorAll(".fi-fade");
    const obs = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) (e.target as HTMLElement).style.opacity = "1", (e.target as HTMLElement).style.transform = "translateY(0)"; }), { threshold: 0.1 });
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div style={{ background: "#0a0a08", color: "#e8e0d0", fontFamily: "'Inter',-apple-system,sans-serif", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Instrument+Serif:ital@0;1&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        .fi-fade { opacity:0; transform:translateY(28px); transition:opacity 0.65s ease, transform 0.65s ease; }
        .nav-link { color:rgba(232,224,208,0.5);font-size:14px;font-weight:500;text-decoration:none;transition:color 0.2s; }
        .nav-link:hover { color:#e8e0d0; }
        .check-item::before { content:"✓"; color:#c8a96e; margin-right:10px; font-weight:700; }
      `}</style>

      {/* Nav */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", height: 64, background: "rgba(10,10,8,0.92)", backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ width: 30, height: 30, borderRadius: 7, background: "linear-gradient(135deg,#c8a96e,#a07840)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 14, color: "#0a0a08" }}>S</div>
          <span style={{ fontWeight: 800, fontSize: 16, color: "#e8e0d0", letterSpacing: -0.5 }}>Site<span style={{ color: "#c8a96e" }}>craft</span></span>
        </a>
        <div style={{ display: "flex", gap: 24 }}>
          <a href="/features" className="nav-link">Features</a>
          <a href="/pricing" className="nav-link">Pricing</a>
          <a href="/templates" className="nav-link">Templates</a>
        </div>
        <a href="/" style={{ background: "#c8a96e", color: "#0a0a08", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>Build My Site →</a>
      </nav>

      {/* Hero */}
      <section style={{ paddingTop: 140, paddingBottom: 80, textAlign: "center", padding: "140px 24px 80px" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", background: "#1a1810", border: "1px solid #2a2820", borderRadius: 40, marginBottom: 28, fontSize: 12, color: "#888" }}>
          <span style={{ color: "#c8a96e" }}>✦</span> Four steps. 60 seconds.
        </div>
        <h1 style={{ fontSize: "clamp(40px,6vw,72px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.05, marginBottom: 20 }}>
          How <span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: "italic", color: "#c8a96e" }}>Sitecraft</span> works
        </h1>
        <p style={{ fontSize: 18, color: "rgba(232,224,208,0.5)", maxWidth: 520, margin: "0 auto 48px", lineHeight: 1.7 }}>From blank page to live, professional website in under 60 seconds. Here's exactly how we do it.</p>
      </section>

      {/* Steps */}
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px 120px" }}>
        {STEPS.map((step, i) => (
          <div key={i} className="fi-fade" style={{ display: "flex", gap: 48, marginBottom: 80, alignItems: "flex-start", flexDirection: i % 2 === 0 ? "row" : "row-reverse" } as React.CSSProperties}>
            {/* Number + icon */}
            <div style={{ flexShrink: 0, textAlign: "center" as const, width: 140 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#c8a96e", letterSpacing: "0.1em", marginBottom: 12 }}>{step.num}</div>
              <div style={{ width: 80, height: 80, margin: "0 auto", borderRadius: 20, background: "#111009", border: "1px solid #2a2820", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>{step.icon}</div>
              {i < STEPS.length - 1 && <div style={{ width: 1, height: 64, background: "linear-gradient(to bottom,#2a2820,transparent)", margin: "16px auto 0" }} />}
            </div>
            {/* Content */}
            <div style={{ flex: 1, paddingTop: 8 }}>
              <h2 style={{ fontSize: "clamp(22px,3vw,30px)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 14, lineHeight: 1.2 }}>{step.title}</h2>
              <p style={{ fontSize: 15, color: "rgba(232,224,208,0.6)", lineHeight: 1.8, marginBottom: 24 }}>{step.desc}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {step.detail.map((d, j) => (
                  <div key={j} className="check-item" style={{ fontSize: 14, color: "rgba(232,224,208,0.7)", display: "flex", alignItems: "center" }}>{d}</div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section style={{ padding: "0 24px 100px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" as const, background: "#0f0e0b", border: "1px solid #1e1c14", borderRadius: 20, padding: "56px 40px" }}>
          <h2 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 900, letterSpacing: "-0.03em", marginBottom: 14 }}>Ready to see it in action?</h2>
          <p style={{ color: "rgba(232,224,208,0.5)", fontSize: 15, marginBottom: 32 }}>Drop your URL and watch it happen in real time. No account required.</p>
          <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 32px", background: "#c8a96e", color: "#0a0a08", borderRadius: 10, fontWeight: 800, fontSize: 15, textDecoration: "none" }}>Build My Site Free →</a>
          <div style={{ fontSize: 12, color: "#444", marginTop: 16 }}>No credit card · 60-second build · Cancel anytime</div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #111", padding: "32px 24px", textAlign: "center" as const }}>
        <div style={{ fontSize: 12, color: "#333" }}>© 2026 Sitecraft · Built in </div>
      </footer>
    </div>
  );
}
