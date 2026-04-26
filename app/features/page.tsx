"use client";
import { useEffect, useState } from "react";

const FEATURES = [
  { icon: "⚡", title: "60-Second AI Builds", cat: "Core", desc: "Drop a URL or describe your business. Our AI scrapes, extracts branding, and generates a fully custom, production-quality website in under 60 seconds. Not a template. A real site.", highlight: true },
  { icon: "🤖", title: "AI Chat Editor", cat: "Core", desc: "Say 'make the hero darker', 'add a pricing section', or 'use a warmer font'. The AI understands design intent and updates your site live. No code, no drag-and-drop learning curve.", highlight: true },
  { icon: "✏️", title: "Inline Text Editing", cat: "Editor", desc: "Double-click any text element in your preview to edit it directly, in place. Changes save instantly. No sidebar, no modal — just click and type." },
  { icon: "↩", title: "30-Step Undo/Redo", cat: "Editor", desc: "Made a change you don't love? Hit Ctrl+Z. Full undo/redo history, 30 steps deep. Your work is always safe." },
  { icon: "📱", title: "Mobile-First Responsive", cat: "Design", desc: "Every site is built responsive from the start. Preview in desktop, tablet, or mobile view from the editor toolbar. Switch with one click." },
  { icon: "🎨", title: "One-Click Colour Palettes", cat: "Design", desc: "8 fully-designed colour palettes built in. Ocean, Forest, Sunset, Royal, Rose, Slate, Gold, Teal. Click once and your entire site recolours." },
  { icon: "🔤", title: "Font Stack Switcher", cat: "Design", desc: "8 font stacks included — Inter, Georgia, Poppins, Playfair, Nunito, and more. One click to apply globally across the entire site." },
  { icon: "🌙", title: "Dark/Light Mode Toggle", cat: "Design", desc: "Every generated site includes an auto-injected dark/light mode toggle. Respects OS preference on first load. Smooth transitions. Stored in localStorage." },
  { icon: "🔵", title: "CSS Variable Customizer", cat: "Design", desc: "Advanced users can directly edit CSS custom properties with colour pickers. Every design token exposed — primary colour, background, text, spacing." },
  { icon: "🖼", title: "Quick Component Insert", cat: "Editor", desc: "One-click insert: Photo Gallery, Reviews, Contact Form, Pricing Table, CTA Banner. Click once, section appears before the closing body tag. All responsive." },
  { icon: "📬", title: "Auto Email Lead Capture", cat: "Growth", desc: "Every generated site auto-injects an email capture form. Triggers after 3 seconds. Leads flow into your dashboard with source page and referrer tracking.", highlight: true },
  { icon: "📊", title: "Built-in Analytics", cat: "Growth", desc: "Zero-dependency analytics. Tracks pageviews, unique visitors, device type, bounce rate, referrers. No Google Analytics, no external scripts. All in your dashboard." },
  { icon: "🌐", title: "Custom Domain", cat: "Publishing", desc: "Connect your own domain directly from the dashboard. DNS setup guide included. Goes live in minutes. CNAME and A record instructions provided." },
  { icon: "🔗", title: "Share Link", cat: "Publishing", desc: "Get a shareable live preview URL instantly. Show clients, get approvals, share on social — before publishing to your own domain." },
  { icon: "💾", title: "Download HTML", cat: "Publishing", desc: "Export your site as a single self-contained HTML file. Host it on GitHub Pages, Netlify, IONOS, or anywhere that serves static files." },
  { icon: "🔍", title: "SEO Panel", cat: "Growth", desc: "Set meta title, description, Open Graph tags, structured data (Schema.org), canonical URLs, and local business info — all from one panel inside the editor." },
  { icon: "📋", title: "{ } Code View", cat: "Editor", desc: "Toggle to a raw HTML/CSS code view at any time. Edit the code directly. Changes reflect in the preview instantly." },
  { icon: "🏷", title: "Mobile Hamburger Nav", cat: "Core", desc: "Every generated site gets a responsive hamburger menu auto-injected. Works on all mobile viewports. No extra setup." },
  { icon: "🔒", title: "Google OAuth Login", cat: "Account", desc: "One-click sign in with Google. No passwords. Your sites and leads are saved to your account and accessible from anywhere." },
  { icon: "👥", title: "Team Members", cat: "Account", desc: "Invite colleagues to your Sitecraft account as Editor or Viewer. Perfect for agencies managing multiple client sites." },
];

const CATS = ["All", "Core", "Editor", "Design", "Growth", "Publishing", "Account"];

export default function FeaturesPage() {
  const [activeCat, setActiveCat] = useState("All");
  const filtered = activeCat === "All" ? FEATURES : FEATURES.filter(f => f.cat === activeCat);

  useEffect(() => {
    const els = document.querySelectorAll(".fi-fade");
    const obs = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { (e.target as HTMLElement).style.opacity = "1"; (e.target as HTMLElement).style.transform = "translateY(0)"; } }), { threshold: 0.05 });
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, [filtered]);

  return (
    <div style={{ background: "#0a0a08", color: "#e8e0d0", fontFamily: "'Inter',-apple-system,sans-serif", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Instrument+Serif:ital@0;1&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        .fi-fade { opacity:0; transform:translateY(20px); transition:opacity 0.55s ease, transform 0.55s ease; }
        .nav-link { color:rgba(232,224,208,0.5);font-size:14px;font-weight:500;text-decoration:none;transition:color 0.2s; }
        .nav-link:hover { color:#e8e0d0; }
        .feat-card { background:#0f0e0b;border:1px solid #1e1c14;border-radius:14px;padding:24px;transition:all 0.2s; }
        .feat-card:hover { border-color:#c8a96e33;transform:translateY(-2px); }
        .feat-card.highlight { border-color:#c8a96e22;background:#111009; }
        .cat-pill { padding:7px 16px;border-radius:40px;font-size:12px;font-weight:600;border:1px solid #1e1c14;background:transparent;color:#666;cursor:pointer;transition:all 0.15s; }
        .cat-pill.active { background:#c8a96e;color:#0a0a08;border-color:#c8a96e; }
        .cat-pill:hover:not(.active) { border-color:#2a2820;color:#e8e0d0; }
      `}</style>

      {/* Nav */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", height: 64, background: "rgba(10,10,8,0.92)", backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ width: 30, height: 30, borderRadius: 7, background: "linear-gradient(135deg,#c8a96e,#a07840)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 14, color: "#0a0a08" }}>S</div>
          <span style={{ fontWeight: 800, fontSize: 16, color: "#e8e0d0", letterSpacing: -0.5 }}>Site<span style={{ color: "#c8a96e" }}>craft</span></span>
        </a>
        <div style={{ display: "flex", gap: 24 }}>
          <a href="/how-it-works" className="nav-link">How it works</a>
          <a href="/pricing" className="nav-link">Pricing</a>
          <a href="/templates" className="nav-link">Templates</a>
        </div>
        <a href="/" style={{ background: "#c8a96e", color: "#0a0a08", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>Build My Site →</a>
      </nav>

      {/* Hero */}
      <section style={{ padding: "140px 24px 60px", textAlign: "center" as const }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", background: "#1a1810", border: "1px solid #2a2820", borderRadius: 40, marginBottom: 28, fontSize: 12, color: "#888" }}>
          <span style={{ color: "#c8a96e" }}>✦</span> {FEATURES.length} features and counting
        </div>
        <h1 style={{ fontSize: "clamp(40px,6vw,72px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.05, marginBottom: 20 }}>
          Everything built in.<br /><span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: "italic", color: "#c8a96e" }}>Nothing bolted on.</span>
        </h1>
        <p style={{ fontSize: 18, color: "rgba(232,224,208,0.5)", maxWidth: 520, margin: "0 auto", lineHeight: 1.7 }}>Every feature you need to build, publish, and grow your website — included in every plan.</p>
      </section>

      {/* Filter pills */}
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" as const, padding: "0 24px 48px" }}>
        {CATS.map(cat => (
          <button key={cat} className={`cat-pill${activeCat === cat ? " active" : ""}`} onClick={() => setActiveCat(cat)}>{cat}</button>
        ))}
      </div>

      {/* Features grid */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 100px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 16 }}>
          {filtered.map((f, i) => (
            <div key={i} className={`feat-card fi-fade${f.highlight ? " highlight" : ""}`} style={{ animationDelay: `${(i % 6) * 0.06}s` }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                <span style={{ fontSize: 28 }}>{f.icon}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#555", background: "#1a1810", border: "1px solid #1e1c14", borderRadius: 20, padding: "2px 8px", letterSpacing: "0.05em", textTransform: "uppercase" as const }}>{f.cat}</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, letterSpacing: -0.3 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: "rgba(232,224,208,0.5)", lineHeight: 1.7 }}>{f.desc}</div>
              {f.highlight && <div style={{ marginTop: 14, width: 32, height: 2, background: "#c8a96e", borderRadius: 1 }} />}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "0 24px 100px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" as const, background: "#0f0e0b", border: "1px solid #1e1c14", borderRadius: 20, padding: "56px 40px" }}>
          <h2 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 900, letterSpacing: "-0.03em", marginBottom: 14 }}>All of this, in 60 seconds.</h2>
          <p style={{ color: "rgba(232,224,208,0.5)", fontSize: 15, marginBottom: 32 }}>No setup. No agency. No waiting. Drop your URL and go.</p>
          <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 32px", background: "#c8a96e", color: "#0a0a08", borderRadius: 10, fontWeight: 800, fontSize: 15, textDecoration: "none" }}>Build My Site Free →</a>
        </div>
      </section>

      <footer style={{ borderTop: "1px solid #111", padding: "32px 24px", textAlign: "center" as const }}>
        <div style={{ fontSize: 12, color: "#333" }}>© 2026 Sitecraft · Built in Alberta, Canada</div>
      </footer>
    </div>
  );
}
