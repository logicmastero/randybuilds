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
    } catch (err) { setError(err instanceof Error ? err.message : "Something went wrong."); setStep("error"); }
  }, [url]);

  const isLoading = step === "scraping" || step === "generating";
  const handleReset = () => { setStep("input"); setUrl(""); setPreview(null); setError(""); setTimeout(() => inputRef.current?.focus(), 100); };
  const handleStartBuilding = () => { window.location.href = "/build"; };

  return (
    <div className="root">
      <style>{`
        :root{--bg1:#0f172a;--bg2:#1a1f3a;--bg3:#1f2847;--text:#e8e0d0;--text-faint:#b8b0a0;--border:rgba(232,224,208,0.1);--border-hover:rgba(232,224,208,0.2);--gold:#c8a96e;--gold-hover:#d4b896;--sans:"Syne", system-ui, sans-serif;--serif:"Instrument Serif", Georgia, serif;}
        *{margin:0;padding:0;box-sizing:border-box;}
        html, body, #__next{width:100%;height:100%;overflow-x:hidden;}
        body{background:var(--bg1);color:var(--text);font-family:var(--sans);line-height:1.6;}
        a{color:var(--gold);text-decoration:none;transition:color 0.2s;} a:hover{color:var(--gold-hover);}
        button{font-family:var(--sans);cursor:pointer;transition:all 0.2s;}
        input{font-family:var(--sans);}
        .root{min-height:100vh;background:var(--bg1);color:var(--text);}
        nav{display:flex;justify-content:space-between;align-items:center;padding:20px 40px;max-width:1200px;margin:0 auto;border-bottom:1px solid var(--border);}
        .nav-logo{font-family:var(--serif);font-size:24px;font-weight:700;color:var(--gold);}
        .nav-links{display:flex;gap:32px;list-style:none;}
        .nav-link{color:var(--text-faint);font-size:14px;transition:color 0.2s;} .nav-link:hover{color:var(--text);}
        .nav-auth{display:flex;gap:12px;align-items:center;}
        .user-badge{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg, var(--gold), rgba(200,169,110,0.5));display:flex;align-items:center;justify-content:center;color:#0f172a;font-weight:700;font-size:18px;}
        .hero{position:relative;padding:80px 40px;text-align:center;min-height:calc(100vh - 100px);display:flex;flex-direction:column;justify-content:center;align-items:center;overflow:hidden;}
        .hero-bg{position:absolute;top:0;left:0;width:100%;height:100%;background:radial-gradient(circle at 30% 50%, rgba(200,169,110,0.08) 0%, transparent 50%), radial-gradient(circle at 70% 50%, rgba(31,40,71,0.4) 0%, transparent 50%);pointer-events:none;z-index:0;}
        .hero-noise{position:absolute;top:0;left:0;width:100%;height:100%;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfurbTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' seed='2' /%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23noiseFilter)' opacity='0.02'/%3E%3C/svg%3E");pointer-events:none;z-index:0;opacity:0.4;}
        .hero > *{position:relative;z-index:1;}
        .hero-eyebrow{display:inline-flex;align-items:center;gap:8px;padding:8px 16px;border-radius:20px;background:rgba(200,169,110,0.08);border:1px solid rgba(200,169,110,0.15);color:var(--gold);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:24px;}
        .hero-eyebrow-dot{width:6px;height:6px;border-radius:50%;background:var(--gold);animation:pulse 2s ease-in-out infinite;}
        @keyframes pulse{0%, 100%{opacity:1} 50%{opacity:0.4}}
        .hero-h1{font-family:var(--serif);font-size:clamp(36px, 6vw, 72px);font-weight:700;line-height:1.2;margin-bottom:20px;letter-spacing:-0.02em;}
        .hero-h1 em{font-style:italic;color:var(--gold);}
        .hero-typed-line{font-size:clamp(18px, 3.5vw, 28px);color:var(--text-faint);margin-bottom:12px;min-height:40px;display:flex;align-items:center;justify-content:center;}
        .hero-typed{color:var(--text);}
        .cursor-blink{display:inline-block;width:2px;height:1.2em;background:var(--gold);margin-left:4px;animation:blink 1s step-start infinite;}
        @keyframes blink{50%{background:transparent}}
        .hero-sub{max-width:520px;margin:20px auto 40px;color:var(--text-faint);font-size:16px;line-height:1.6;}
        .hero-form{max-width:560px;margin:0 auto 36px;}
        .input-wrap{position:relative;background:var(--bg3);border:1px solid var(--border);border-radius:14px;transition:border-color 0.25s, box-shadow 0.25s;overflow:hidden;}
        .input-wrap.focused{border-color:rgba(200,169,110,0.4);box-shadow:0 0 0 3px rgba(200,169,110,0.06),0 20px 60px rgba(0,0,0,0.5);}
        .input-wrap.loading{border-color:rgba(200,169,110,0.3);animation:border-pulse 2s ease-in-out infinite;}
        @keyframes border-pulse{0%, 100%{border-color:rgba(200,169,110,0.3)} 50%{border-color:rgba(200,169,110,0.15)}}
        .main-input{width:100%;padding:22px 160px 22px 24px;background:transparent;border:none;outline:none;font-family:var(--sans);font-size:16px;color:var(--text);caret-color:var(--gold);}
        .main-input::placeholder{color:var(--text-faint);}
        .gen-btn{position:absolute;right:8px;top:50%;transform:translateY(-50%);padding:12px 24px;background:var(--gold);color:#0f172a;font-weight:700;border:none;border-radius:8px;cursor:pointer;transition:all 0.2s;font-size:14px;}
        .gen-btn:hover{background:var(--gold-hover);transform:translateY(-50%) scale(1.05);}
        .gen-btn:active{transform:translateY(-50%) scale(0.98);}
        .hint{margin-top:12px;font-size:13px;color:var(--text-faint);}
        .hint span{display:block;}
        .proof-strip{display:flex;justify-content:center;align-items:center;gap:24px;flex-wrap:wrap;}
        .proof-item{display:flex;flex-direction:column;align-items:center;gap:6px;font-size:13px;color:var(--text-faint);}
        .proof-item span{display:block;}
        .proof-num{font-size:18px;font-weight:700;color:var(--text);}
        .template-section{margin-top:60px;text-align:center;}
        .template-divider{font-size:14px;color:var(--text-faint);margin-bottom:20px;}
        .template-btn{display:inline-flex;align-items:center;gap:8px;padding:12px 28px;border-radius:10px;background:rgba(200,169,110,0.1);border:1px solid rgba(200,169,110,0.3);color:var(--gold);font-weight:600;cursor:pointer;transition:all 0.2s;}
        .template-btn:hover{background:rgba(200,169,110,0.2);border-color:rgba(200,169,110,0.5);transform:translateY(-2px);}
        .loading-wrap{display:flex;flex-direction:column;align-items:center;gap:24px;}
        .loading-orb{width:120px;height:120px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(200,169,110,0.3), transparent 70%);animation:float 3s ease-in-out infinite;}
        @keyframes float{0%, 100%{transform:translateY(0)} 50%{transform:translateY(-20px)}}
        .loading-label{color:var(--text-faint);font-size:15px;}
        .error-box{background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:8px;padding:16px;color:rgba(239,68,68,0.9);font-size:14px;margin-bottom:24px;line-height:1.6;}
        .retry-link{cursor:pointer;color:var(--gold);font-weight:600;font-size:14px;}
        .retry-link:hover{color:var(--gold-hover);}
        .preview-wrap{width:100%;max-width:920px;margin:40px auto 0;}
        .preview-toolbar{display:flex;justify-content:space-between;align-items:center;padding:24px;background:var(--bg3);border:1px solid var(--border);border-radius:12px 12px 0 0;border-bottom:none;}
        .preview-label{color:var(--text-faint);font-size:12px;margin:0;text-transform:uppercase;}
        .preview-biz{color:var(--text);font-size:20px;font-weight:700;margin:4px 0 0 0;}
        .preview-actions{display:flex;gap:12px;}
        .btn-ghost{padding:10px 20px;border:1px solid var(--border);background:transparent;color:var(--text);border-radius:8px;font-size:14px;cursor:pointer;transition:all 0.2s;}
        .btn-ghost:hover{border-color:var(--border-hover);background:rgba(232,224,208,0.05);}
        .btn-primary{padding:10px 20px;border:none;background:var(--gold);color:#0f172a;border-radius:8px;font-weight:700;font-size:14px;cursor:pointer;transition:all 0.2s;}
        .btn-primary:hover{background:var(--gold-hover);}
        .preview-iframe-wrap{background:var(--bg3);border:1px solid var(--border);border-radius:0 0 12px 12px;overflow:hidden;aspect-ratio:16/10;}
        .preview-iframe{width:100%;height:100%;border:none;background:white;}
        .section{padding:80px 40px;border-top:1px solid var(--border);}
        .section-content{max-width:1200px;margin:0 auto;}
        .section-h2{font-family:var(--serif);font-size:clamp(32px, 5vw, 52px);font-weight:700;line-height:1.2;margin-bottom:40px;text-align:center;}
        .features{display:grid;grid-template-columns:repeat(auto-fit, minmax(300px, 1fr));gap:32px;}
        .feature-card{padding:32px;background:var(--bg3);border:1px solid var(--border);border-radius:12px;transition:all 0.2s;}
        .feature-card:hover{border-color:var(--border-hover);background:rgba(232,224,208,0.02);}
        .feature-icon{font-size:32px;margin-bottom:16px;}
        .feature-h3{font-size:18px;font-weight:700;margin-bottom:12px;}
        .feature-text{color:var(--text-faint);font-size:14px;line-height:1.6;}
        footer{padding:40px;text-align:center;border-top:1px solid var(--border);color:var(--text-faint);font-size:13px;}
        @media(max-width:768px){
          nav{padding:16px 20px;flex-direction:column;gap:16px;}
          .nav-links{flex-direction:column;gap:16px;}
          .hero{padding:40px 20px;}
          .hero-h1{font-size:32px;}
          .main-input{padding:16px 120px 16px 16px;}
          .gen-btn{padding:10px 16px;right:4px;font-size:13px;}
          .preview-toolbar{flex-direction:column;gap:16px;align-items:flex-start;}
          .preview-actions{width:100%;}
          .preview-actions button{flex:1;}
          .section{padding:40px 20px;}
        }
      `}</style>

      <nav>
        <div className="nav-logo">Sitecraft</div>
        <ul className="nav-links">
          <li><a href="/pricing">Pricing</a></li>
          <li><a href="#how">How it works</a></li>
          <li><a href="#features">Features</a></li>
        </ul>
        <div className="nav-auth">
          {isLoggedIn && <div className="user-badge">{userInitial}</div>}
          {!isLoggedIn && <a href="/login" style={{ padding: "8px 16px", fontSize: "14px" }}>Sign in</a>}
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
              <div className={`input-wrap ${inputFocused ? "focused" : ""} ${isLoading ? "loading" : ""}`}>
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
                  disabled={isLoading}
                />
                <button type="submit" className="gen-btn" disabled={isLoading}>Generate →</button>
              </div>
              <p className="hint">Free to try — no credit card. <span>Works with any existing site.</span></p>
            </form>

            <div className="template-section">
              <p className="template-divider">— or start with a template —</p>
              <a href="/templates" className="template-btn">
                Choose your industry →
              </a>
            </div>

            <div className="proof-strip" style={{ marginTop: "56px" }}>
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
    </div>
  );
}
