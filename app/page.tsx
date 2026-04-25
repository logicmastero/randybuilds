"use client";
import { useState, useEffect, useRef, useCallback } from "react";

const PHRASES = [
  "converts visitors into customers.",
  "makes you look like the best option.",
  "gets you more calls.",
  "builds instant trust.",
  "works while you sleep.",
];

function TypeCycle() {
  const [idx, setIdx] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    const word = PHRASES[idx];
    let t: ReturnType<typeof setTimeout>;
    if (!deleting && displayed.length < word.length)
      t = setTimeout(() => setDisplayed(word.slice(0, displayed.length + 1)), 55);
    else if (!deleting && displayed.length === word.length)
      t = setTimeout(() => setDeleting(true), 2800);
    else if (deleting && displayed.length > 0)
      t = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 28);
    else { setDeleting(false); setIdx(i => (i + 1) % PHRASES.length); }
    return () => clearTimeout(t);
  }, [displayed, deleting, idx]);
  return (
    <span className="hero-typed">
      {displayed}
      <span className="cursor-blink">|</span>
    </span>
  );
}

type Step = "input" | "scraping" | "generating" | "preview" | "error";

function extractDomainName(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, "").split(".")[0]; }
  catch { return url.split(".")[0].replace(/https?:\/\//, ""); }
}
function extractBusinessNameFromDescription(desc: string) {
  const first = desc.split(/[.,!?]/)[0].trim();
  return first.length > 3 && first.length < 50 ? first : "Your Business";
}

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInitial, setUserInitial] = useState("");
  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.ok ? r.json() : null)
      .then(user => {
        if (user?.email) {
          setIsLoggedIn(true);
          const name = user.name || user.email || "?";
          setUserInitial(name[0].toUpperCase());
        }
      })
      .catch(() => {});
  }, []);

  const [url, setUrl] = useState("");
  const [step, setStep] = useState<Step>("input");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{ html: string; businessName: string; sourceUrl: string } | null>(null);
  const [scrapeProgress, setScrapeProgress] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const previewHtmlRef = useRef<string>("");

  const writeToIframe = useCallback((iframe: HTMLIFrameElement | null, html: string) => {
    if (!iframe || !html) return;
    const doc = iframe.contentDocument;
    if (!doc) return;
    doc.open(); doc.write(html); doc.close();
  }, []);

  const iframeCallbackRef = useCallback((node: HTMLIFrameElement | null) => {
    if (node) { iframeRef.current = node; if (previewHtmlRef.current) writeToIframe(node, previewHtmlRef.current); }
  }, [writeToIframe]);

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
    const looksLikeUrl = /^(https?:\/\/)|(\w[\w-]*\.\w{2,}(\/.*)?)$/.test(raw) && !raw.includes(" ") && raw.length < 120;

    if (!looksLikeUrl) {
      setStep("generating"); setScrapeProgress("Writing your site from your description…");
      try {
        const r = await fetch("/api/redesign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scraped: { businessName: extractBusinessNameFromDescription(raw), description: raw, url: "https://example.com", services: [], colors: [], images: [], headline: "", phone: null, email: null, address: null, logoUrl: null } }) });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Generation failed");
        const pv = { html: d.html || d.previewHtml || "", businessName: d.businessName || extractBusinessNameFromDescription(raw), sourceUrl: "" };
        setPreview(pv);
        setStep("preview");
        try {
          const meRes = await fetch("/api/auth/me");
          if (meRes.ok) {
            const user = await meRes.json();
            if (user?.id) {
              const projectId = `proj_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
              const existing = JSON.parse(localStorage.getItem(`sc_projects_${user.id}`) || "[]");
              existing.unshift({ id: projectId, businessName: pv.businessName, sourceUrl: pv.sourceUrl, createdAt: new Date().toISOString() });
              localStorage.setItem(`sc_projects_${user.id}`, JSON.stringify(existing.slice(0, 50)));
            }
          }
        } catch { /* non-blocking */ }
      } catch (err) { setError(err instanceof Error ? err.message : "Something went wrong."); setStep("error"); }
      return;
    }

    const clean = raw.startsWith("http") ? raw : "https://" + raw;
    setStep("scraping"); setScrapeProgress("Scanning your website…");
    let scraped;
    try {
      const r1 = await fetch("/api/scrape", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: clean }) });
      const d1 = await r1.json();
      if (!r1.ok) throw new Error(d1.error || "Scrape failed");
      scraped = d1; setScrapeProgress("Content captured — building your redesign…");
    } catch { scraped = { url: clean, businessName: extractDomainName(clean), description: "", services: [], colors: [], images: [], headline: "", phone: null, email: null, address: null, logoUrl: null }; }

    setStep("generating"); setScrapeProgress("Crafting your premium site…");
    try {
      const r2 = await fetch("/api/redesign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scraped }) });
      const d2 = await r2.json();
      if (!r2.ok) throw new Error(d2.error || "Redesign failed");
      const pv2 = { html: d2.html || d2.previewHtml || "", businessName: d2.businessName || scraped.businessName || "Your Business", sourceUrl: clean };
      setPreview(pv2);
      setStep("preview");
      try {
        const meRes2 = await fetch("/api/auth/me");
        if (meRes2.ok) {
          const user2 = await meRes2.json();
          if (user2?.id) {
            const projectId = `proj_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
            const existing = JSON.parse(localStorage.getItem(`sc_projects_${user2.id}`) || "[]");
            existing.unshift({ id: projectId, businessName: pv2.businessName, sourceUrl: pv2.sourceUrl, createdAt: new Date().toISOString() });
            localStorage.setItem(`sc_projects_${user2.id}`, JSON.stringify(existing.slice(0, 50)));
            sessionStorage.setItem(`sc_html_${projectId}`, pv2.html);
          }
        }
      } catch { /* non-blocking */ }
    } catch (err) { setError(err instanceof Error ? err.message : "Something went wrong."); setStep("error"); }
  }, [url]);

  const handleReset = () => { setStep("input"); setUrl(""); setPreview(null); setError(""); setTimeout(() => inputRef.current?.focus(), 100); };
  const handleStartBuilding = () => {
    if (!preview) return;
    sessionStorage.setItem("rb_build_state", JSON.stringify({ html: preview.html, businessName: preview.businessName, sourceUrl: preview.sourceUrl }));
    window.location.href = "/build";
  };

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap');
    
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{
      --bg:#050505;
      --bg2:#0c0c0b;
      --bg3:#121210;
      --border:rgba(255,255,255,0.06);
      --border-glow:rgba(200,169,110,0.18);
      --gold:#c8a96e;
      --gold-l:#d8b97e;
      --gold-dim:rgba(200,169,110,0.12);
      --text:#ede8e0;
      --text-dim:rgba(237,232,224,0.45);
      --text-faint:rgba(237,232,224,0.18);
      --serif:'Instrument Serif',Georgia,serif;
      --sans:'Syne',-apple-system,sans-serif;
      --r:12px;
    }
    html,body{background:var(--bg);color:var(--text);font-family:var(--sans);min-height:100vh;overflow-x:hidden}
    ::selection{background:rgba(200,169,110,0.25);color:#fff}

    .nav{
      position:fixed;top:0;left:0;right:0;z-index:100;
      display:flex;align-items:center;justify-content:space-between;
      padding:20px 48px;
      backdrop-filter:blur(20px);
      border-bottom:1px solid var(--border);
      background:rgba(5,5,5,0.75);
    }
    .nav-logo{font-family:var(--serif);font-size:20px;letter-spacing:-0.02em;color:var(--text);font-style:italic;}
    .nav-logo span{color:var(--gold);}
    .nav-links{display:flex;align-items:center;gap:32px;}
    .nav-link{font-size:13px;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;color:var(--text-dim);text-decoration:none;transition:color 0.2s;}
    .nav-link:hover{color:var(--text);}
    .nav-cta{display:inline-flex;align-items:center;gap:8px;padding:10px 22px;border-radius:6px;font-size:13px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;background:var(--gold);color:#0a0a08;text-decoration:none;transition:all 0.2s;cursor:pointer;border:none;}
    .nav-cta:hover{background:var(--gold-l);transform:translateY(-1px);}
    .nav-avatar{width:34px;height:34px;border-radius:50%;background:var(--gold);color:#0a0a08;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;text-decoration:none;}

    .hero{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:120px 48px 80px;position:relative;overflow:hidden;text-align:center;}
    .hero-bg{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse 80% 60% at 50% -10%, rgba(200,169,110,0.08) 0%, transparent 60%),radial-gradient(ellipse 60% 40% at 80% 80%, rgba(200,169,110,0.04) 0%, transparent 50%);}
    .hero-noise{position:absolute;inset:0;pointer-events:none;opacity:0.025;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");background-size:200px;}

    .hero-eyebrow{display:inline-flex;align-items:center;gap:8px;padding:8px 18px;border-radius:100px;border:1px solid var(--border-glow);background:rgba(200,169,110,0.06);font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:var(--gold);margin-bottom:40px;}
    .hero-eyebrow-dot{width:6px;height:6px;border-radius:50%;background:var(--gold);animation:pulse-dot 2s ease-in-out infinite;}
    @keyframes pulse-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.8)}}

    .hero-h1{font-family:var(--serif);font-size:clamp(52px,8vw,100px);font-weight:400;line-height:1.0;letter-spacing:-0.02em;color:var(--text);margin-bottom:0;max-width:960px;}
    .hero-h1 em{font-style:italic;color:var(--gold);}
    .hero-typed-line{font-family:var(--serif);font-size:clamp(38px,5.5vw,72px);font-weight:400;font-style:italic;line-height:1.1;color:var(--text-dim);margin-bottom:48px;min-height:1.2em;}
    .hero-typed{color:var(--text);}
    .cursor-blink{animation:blink 1s step-end infinite;opacity:1;color:var(--gold)}
    @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
    .hero-sub{max-width:480px;font-size:16px;line-height:1.7;color:var(--text-dim);margin-bottom:56px;font-weight:400;}

    .hero-form{width:100%;max-width:600px;position:relative;z-index:1;}
    .input-wrap{position:relative;background:var(--bg3);border:1px solid var(--border);border-radius:14px;transition:border-color 0.25s, box-shadow 0.25s;overflow:hidden;}
    .input-wrap.focused{border-color:rgba(200,169,110,0.4);box-shadow:0 0 0 3px rgba(200,169,110,0.06),0 20px 60px rgba(0,0,0,0.5);}
    .input-wrap.loading{border-color:rgba(200,169,110,0.3);animation:border-pulse 2s ease-in-out infinite;}
    @keyframes border-pulse{0%,100%{box-shadow:0 0 0 0 rgba(200,169,110,0.12)}50%{box-shadow:0 0 0 6px rgba(200,169,110,0.04)}}
    .main-input{width:100%;padding:22px 160px 22px 24px;background:transparent;border:none;outline:none;font-family:var(--sans);font-size:16px;color:var(--text);caret-color:var(--gold);}
    .main-input::placeholder{color:var(--text-faint);}
    .gen-btn{position:absolute;right:10px;top:50%;transform:translateY(-50%);padding:12px 24px;border-radius:8px;background:var(--gold);color:#0a0a08;font-family:var(--sans);font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;border:none;cursor:pointer;transition:all 0.2s;white-space:nowrap;}
    .gen-btn:hover{background:var(--gold-l);transform:translateY(-50%) scale(1.02);}
    .gen-btn:disabled{opacity:0.5;cursor:not-allowed;transform:translateY(-50%);}
    .hint{margin-top:14px;font-size:12px;color:var(--text-faint);letter-spacing:0.02em;}
    .hint span{color:var(--text-dim);}

    .loading-wrap{display:flex;flex-direction:column;align-items:center;gap:20px;padding:60px 0;}
    .loading-orb{width:56px;height:56px;border-radius:50%;border:2px solid var(--border);border-top-color:var(--gold);animation:spin 0.8s linear infinite;}
    @keyframes spin{to{transform:rotate(360deg)}}
    .loading-label{font-size:14px;color:var(--text-dim);font-weight:500;letter-spacing:0.04em;}

    .error-box{margin-top:16px;padding:14px 18px;border-radius:10px;background:rgba(220,60,60,0.08);border:1px solid rgba(220,60,60,0.2);font-size:13px;color:#ff6b6b;text-align:left;}
    .retry-link{margin-top:12px;display:inline-block;font-size:13px;color:var(--gold);cursor:pointer;text-decoration:underline;}

    .preview-wrap{width:100%;max-width:1100px;margin:0 auto;display:flex;flex-direction:column;gap:0;}
    .preview-toolbar{display:flex;align-items:center;justify-content:space-between;padding:16px 24px;background:var(--bg3);border:1px solid var(--border);border-radius:14px 14px 0 0;gap:12px;flex-wrap:wrap;}
    .preview-label{font-size:13px;font-weight:600;color:var(--text-dim);letter-spacing:0.04em;text-transform:uppercase;}
    .preview-biz{font-family:var(--serif);font-size:18px;color:var(--text);font-style:italic;}
    .preview-actions{display:flex;gap:10px;flex-wrap:wrap;}
    .btn-ghost{padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;letter-spacing:0.03em;background:transparent;border:1px solid var(--border);color:var(--text-dim);cursor:pointer;transition:all 0.2s;font-family:var(--sans);}
    .btn-ghost:hover{border-color:rgba(255,255,255,0.15);color:var(--text);}
    .btn-primary{padding:10px 24px;border-radius:8px;font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;background:var(--gold);color:#0a0a08;border:none;cursor:pointer;transition:all 0.2s;font-family:var(--sans);}
    .btn-primary:hover{background:var(--gold-l);}
    .preview-iframe-wrap{border:1px solid var(--border);border-top:none;border-radius:0 0 14px 14px;overflow:hidden;background:#fff;}
    .preview-iframe{width:100%;height:70vh;border:none;display:block;}

    .proof-strip{display:flex;align-items:center;justify-content:center;gap:40px;padding:24px 0;flex-wrap:wrap;}
    .proof-item{display:flex;align-items:center;gap:10px;font-size:13px;color:var(--text-dim);font-weight:500;}
    .proof-num{font-family:var(--serif);font-size:18px;color:var(--text);font-style:italic;}

    .section{padding:100px 48px;}
    .section-inner{max-width:1100px;margin:0 auto;}
    .section-label{font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:var(--gold);margin-bottom:20px;}
    .section-h2{font-family:var(--serif);font-size:clamp(36px,4.5vw,60px);font-weight:400;line-height:1.1;letter-spacing:-0.01em;color:var(--text);margin-bottom:16px;}
    .section-h2 em{font-style:italic;color:var(--gold);}
    .section-lead{font-size:17px;line-height:1.75;color:var(--text-dim);max-width:520px;margin-bottom:64px;}

    .steps-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--border);}
    .step-card{background:var(--bg);padding:40px 36px;position:relative;overflow:hidden;}
    .step-card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(200,169,110,0.12),transparent);}
    .step-num{font-family:var(--serif);font-size:48px;color:var(--text-faint);font-style:italic;line-height:1;margin-bottom:24px;}
    .step-title{font-size:18px;font-weight:700;color:var(--text);margin-bottom:12px;letter-spacing:-0.01em;}
    .step-desc{font-size:14px;line-height:1.75;color:var(--text-dim);}

    .features-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:1px;background:var(--border);border:1px solid var(--border);}
    .feature-card{background:var(--bg);padding:36px 32px;transition:background 0.2s;}
    .feature-card:hover{background:var(--bg2);}
    .feature-icon{font-size:24px;margin-bottom:16px;}
    .feature-title{font-size:16px;font-weight:700;color:var(--text);margin-bottom:8px;letter-spacing:-0.01em;}
    .feature-desc{font-size:13px;line-height:1.75;color:var(--text-dim);}

    .cta-section{padding:120px 48px;text-align:center;position:relative;overflow:hidden;}
    .cta-section::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 70% 60% at 50% 50%, rgba(200,169,110,0.05) 0%, transparent 70%);pointer-events:none;}
    .cta-section-inner{max-width:700px;margin:0 auto;position:relative;}
    .cta-h2{font-family:var(--serif);font-size:clamp(42px,5.5vw,72px);font-weight:400;line-height:1.05;letter-spacing:-0.02em;color:var(--text);margin-bottom:24px;}
    .cta-h2 em{font-style:italic;color:var(--gold);}
    .cta-sub{font-size:17px;line-height:1.7;color:var(--text-dim);margin-bottom:48px;}
    .cta-input-row{display:flex;gap:12px;max-width:520px;margin:0 auto;}
    .cta-input{flex:1;padding:18px 20px;border-radius:10px;background:var(--bg3);border:1px solid var(--border);font-family:var(--sans);font-size:15px;color:var(--text);outline:none;transition:border-color 0.2s;caret-color:var(--gold);}
    .cta-input:focus{border-color:rgba(200,169,110,0.35);}
    .cta-input::placeholder{color:var(--text-faint);}
    .cta-btn{padding:18px 28px;border-radius:10px;background:var(--gold);color:#0a0a08;font-family:var(--sans);font-size:14px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;border:none;cursor:pointer;white-space:nowrap;transition:all 0.2s;}
    .cta-btn:hover{background:var(--gold-l);}

    .footer{padding:48px;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:20px;}
    .footer-logo{font-family:var(--serif);font-size:18px;font-style:italic;color:var(--text);}
    .footer-logo span{color:var(--gold);}
    .footer-links{display:flex;gap:28px;flex-wrap:wrap;}
    .footer-link{font-size:13px;color:var(--text-dim);text-decoration:none;transition:color 0.2s;font-weight:500;}
    .footer-link:hover{color:var(--text);}
    .footer-copy{font-size:12px;color:var(--text-faint);}
    .divider{height:1px;background:var(--border);margin:0 48px;}

    @media(max-width:768px){
      .nav{padding:16px 20px;}
      .nav-links{display:none;}
      .hero{padding:100px 20px 60px;}
      .section{padding:60px 20px;}
      .steps-grid{grid-template-columns:1fr;}
      .features-grid{grid-template-columns:1fr;}
      .cta-section{padding:80px 20px;}
      .cta-input-row{flex-direction:column;}
      .footer{padding:32px 20px;flex-direction:column;gap:16px;text-align:center;}
      .preview-toolbar{flex-direction:column;align-items:flex-start;}
      .divider{margin:0 20px;}
    }
  `;

  const isLoading = step === "scraping" || step === "generating";

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <nav className="nav">
        <div className="nav-logo">Site<span>craft</span></div>
        <div className="nav-links">
          <a href="/pricing" className="nav-link">Pricing</a>
          <a href="#how" className="nav-link">How it works</a>
          <a href="#features" className="nav-link">Features</a>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {isLoggedIn ? (
            <>
              <a href="/dashboard" className="nav-link">Dashboard</a>
              <a href="/dashboard" className="nav-avatar">{userInitial}</a>
            </>
          ) : (
            <>
              <a href="/login" className="nav-link">Sign in</a>
              <a href="/pricing" className="nav-cta">Get started</a>
            </>
          )}
        </div>
      </nav>

      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-noise" />

        {step === "input" && (
          <>
            <div className="hero-eyebrow">
              <div className="hero-eyebrow-dot" />
              AI-powered website generation
            </div>
            <h1 className="hero-h1">
              A website that<br /><em>actually</em> works for you.
            </h1>
            <p className="hero-typed-line">
              One that <TypeCycle />
            </p>
            <p className="hero-sub">
              Drop your URL or describe your business. We&apos;ll build a beautiful, conversion-focused site in under 60 seconds.
            </p>
            <form className="hero-form" onSubmit={handleSubmit}>
              <div className={`input-wrap ${inputFocused ? "focused" : ""}`}>
                <input
                  ref={inputRef}
                  className="main-input"
                  type="text"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  placeholder="yoursite.com or describe your business…"
                  autoComplete="off"
                  spellCheck={false}
                />
                <button type="submit" className="gen-btn">Generate →</button>
              </div>
              <p className="hint">Free to try — no credit card. <span>Works with any existing site.</span></p>
            </form>
            <div className="proof-strip" style={{ marginTop: "56px", position: "relative" }}>
              <div className="proof-item">
                <span>⚡</span>
                <span className="proof-num">60s</span>
                <span>to your first draft</span>
              </div>
              <div style={{ width: "1px", height: "24px", background: "rgba(255,255,255,0.06)" }} />
              <div className="proof-item">
                <span>🎨</span>
                <span className="proof-num">100%</span>
                <span>custom HTML output</span>
              </div>
              <div style={{ width: "1px", height: "24px", background: "rgba(255,255,255,0.06)" }} />
              <div className="proof-item">
                <span>📱</span>
                <span>Mobile-first by default</span>
              </div>
            </div>
          </>
        )}

        {isLoading && (
          <div className="loading-wrap">
            <div className="loading-orb" />
            <p className="loading-label">{scrapeProgress}</p>
          </div>
        )}

        {step === "error" && (
          <div style={{ width: "100%", maxWidth: "560px" }}>
            <h2 style={{ fontFamily: "var(--serif)", fontSize: "28px", fontStyle: "italic", marginBottom: "16px" }}>Something went wrong</h2>
            <div className="error-box">{error}</div>
            <span className="retry-link" onClick={handleReset}>← Try again</span>
          </div>
        )}

        {step === "preview" && preview && (
          <div className="preview-wrap">
            <div className="preview-toolbar">
              <div>
                <p className="preview-label">Preview</p>
                <p className="preview-biz">{preview.businessName}</p>
              </div>
              <div className="preview-actions">
                <button className="btn-ghost" onClick={handleReset}>← Start over</button>
                <button className="btn-primary" onClick={handleStartBuilding}>Edit in builder →</button>
              </div>
            </div>
            <div className="preview-iframe-wrap">
              <iframe
                ref={iframeCallbackRef}
                className="preview-iframe"
                title="Site preview"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          </div>
        )}
      </section>

      {step === "input" && (
        <>
          <div className="divider" />
          <section className="section" id="how">
            <div className="section-inner">
              <p className="section-label">Process</p>
              <h2 className="section-h2">Three steps to a site<br />you&apos;re <em>proud</em> to share.</h2>
              <p className="section-lead">No templates. No drag-and-drop guesswork. Just real AI that reads your business and builds something that fits.</p>
              <div className="steps-grid">
                <div className="step-card">
                  <div className="step-num">01</div>
                  <div className="step-title">Drop your URL or describe</div>
                  <p className="step-desc">Paste your current site or tell us what your business does. Sitecraft handles the rest — no account required to start.</p>
                </div>
                <div className="step-card">
                  <div className="step-num">02</div>
                  <div className="step-title">AI builds your site</div>
                  <p className="step-desc">Our AI reads your content, extracts your brand, and generates a clean, fast, mobile-first site in under a minute.</p>
                </div>
                <div className="step-card">
                  <div className="step-num">03</div>
                  <div className="step-title">Customize and publish</div>
                  <p className="step-desc">Use the live editor to refine copy, swap images, adjust colors. Download the HTML or let us host it — your call.</p>
                </div>
              </div>
            </div>
          </section>

          <div className="divider" />
          <section className="section" id="features">
            <div className="section-inner">
              <p className="section-label">Features</p>
              <h2 className="section-h2">Everything a small business<br /><em>actually</em> needs.</h2>
              <p className="section-lead">No bloat. No monthly fees for features you never use. Just a site that looks great and converts.</p>
              <div className="features-grid">
                <div className="feature-card">
                  <div className="feature-icon">🤖</div>
                  <div className="feature-title">AI that reads your brand</div>
                  <p className="feature-desc">Firecrawl + Claude extract your real services, colors, images, and tone — so the output actually looks like you.</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">✏️</div>
                  <div className="feature-title">Live chat editor</div>
                  <p className="feature-desc">Just tell the AI what to change. Or double-click any text to edit directly in the preview. Instant refresh every time.</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">📱</div>
                  <div className="feature-title">Mobile-first output</div>
                  <p className="feature-desc">Every site is responsive by default. Switch between desktop, tablet, and mobile previews before you publish.</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">⚡</div>
                  <div className="feature-title">Real HTML — no lock-in</div>
                  <p className="feature-desc">Download clean HTML/CSS. Host it anywhere. It&apos;s yours — no proprietary platform holding your site hostage.</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">🔁</div>
                  <div className="feature-title">Unlimited undo/redo</div>
                  <p className="feature-desc">30-deep edit history. Jump back to any version, compare states, and never lose a change you liked.</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">🎨</div>
                  <div className="feature-title">One-click style palettes</div>
                  <p className="feature-desc">8 color palettes and 8 font stacks. Swap your whole brand look in a single click without touching code.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="cta-section">
            <div className="cta-section-inner">
              <h2 className="cta-h2">Your site, <em>done</em> in 60 seconds.</h2>
              <p className="cta-sub">No credit card. No templates. No waiting. Drop your URL and see what we build.</p>
              <div className="cta-input-row">
                <input
                  className="cta-input"
                  type="text"
                  placeholder="yoursite.com or describe your business…"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }}
                />
                <button className="cta-btn" onClick={() => handleSubmit()}>Generate →</button>
              </div>
            </div>
          </section>

          <footer className="footer">
            <div className="footer-logo">Site<span>craft</span></div>
            <div className="footer-links">
              <a href="/pricing" className="footer-link">Pricing</a>
              <a href="#how" className="footer-link">How it works</a>
              <a href="/login" className="footer-link">Sign in</a>
            </div>
            <p className="footer-copy">© 2026 Sitecraft. Built for small businesses.</p>
          </footer>
        </>
      )}
    </>
  );
}
