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

function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      let start = 0;
      const step = to / 60;
      const t = setInterval(() => {
        start += step;
        if (start >= to) { setVal(to); clearInterval(t); }
        else setVal(Math.floor(start));
      }, 16);
    });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [to]);
  return <span ref={ref}>{val}{suffix}</span>;
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

  useEffect(() => {
    const dot = document.getElementById("cur-dot");
    const ring = document.getElementById("cur-ring");
    if (!dot || !ring) return;
    let mx = 0, my = 0, rx = 0, ry = 0;
    const onMove = (e: MouseEvent) => { mx = e.clientX; my = e.clientY; dot.style.left = mx + "px"; dot.style.top = my + "px"; };
    document.addEventListener("mousemove", onMove);
    let raf: number;
    const loop = () => { rx += (mx - rx) * 0.1; ry += (my - ry) * 0.1; ring.style.left = Math.round(rx) + "px"; ring.style.top = Math.round(ry) + "px"; raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => { document.removeEventListener("mousemove", onMove); cancelAnimationFrame(raf); };
  }, []);

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
        // Save to user's account if logged in
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
      // Save to user's account if logged in
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
    @import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,300;0,14..32,400;0,14..32,500;0,14..32,600;0,14..32,700;0,14..32,800;0,14..32,900;1,14..32,400&family=Instrument+Serif:ital@0;1&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{
      --bg:#0b0b09;--bg2:#111110;--bg3:#181816;
      --border:rgba(255,255,255,0.07);--border-glow:rgba(200,169,110,0.25);
      --gold:#c8a96e;--gold-l:#d8b97e;
      --text:#e8e2d8;--text-dim:rgba(232,226,216,0.5);--text-faint:rgba(232,226,216,0.22);
      --serif:'Instrument Serif',Georgia,serif;--sans:'Inter',-apple-system,sans-serif;
      --r:14px;--r-lg:20px;
    }
    html,body{background:var(--bg);color:var(--text);font-family:var(--sans);cursor:none}
    ::selection{background:rgba(200,169,110,0.22)}
    ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:var(--bg)}::-webkit-scrollbar-thumb{background:var(--bg3);border-radius:2px}
    input,button,a,label{cursor:none}
    @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
    @keyframes fade-up{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes pulse-r{0%,100%{opacity:.4;transform:scale(1)}50%{opacity:.8;transform:scale(1.1)}}
    @keyframes shimmer{0%{background-position:200%}100%{background-position:-200%}}
    .a1{animation:fade-up .65s ease both}
    .a2{animation:fade-up .65s .1s ease both}
    .a3{animation:fade-up .65s .2s ease both}
    .a4{animation:fade-up .65s .3s ease both}
    #cur-dot{position:fixed;width:5px;height:5px;border-radius:50%;background:var(--gold);pointer-events:none;z-index:9999;transform:translate(-50%,-50%)}
    #cur-ring{position:fixed;width:30px;height:30px;border-radius:50%;border:1.5px solid rgba(200,169,110,0.35);pointer-events:none;z-index:9998;transform:translate(-50%,-50%)}
    /* NAV */
    .nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:20px 40px;background:rgba(11,11,9,0.75);backdrop-filter:blur(24px);border-bottom:1px solid var(--border)}
    .nav-logo{font-family:var(--serif);font-size:19px;color:var(--text);text-decoration:none;letter-spacing:-.01em}
    .nav-logo span{color:var(--gold)}
    .nav-links{display:flex;align-items:center;gap:32px}
    .nav-link{font-size:13px;font-weight:500;color:var(--text-dim);text-decoration:none;transition:color .2s}
    .nav-link:hover{color:var(--text)}
    .nav-cta{padding:9px 20px;border-radius:10px;font-size:13px;font-weight:700;background:var(--gold);color:#0b0b09;text-decoration:none;transition:background .2s,transform .15s;letter-spacing:-.01em}
    .nav-cta:hover{background:var(--gold-l);transform:translateY(-1px)}
    /* HERO */
    .hero{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:120px 24px 80px;position:relative;overflow:hidden;text-align:center}
    .hero-glow{position:absolute;width:800px;height:800px;border-radius:50%;background:radial-gradient(circle,rgba(200,169,110,0.07) 0%,transparent 70%);top:50%;left:50%;transform:translate(-50%,-60%);pointer-events:none}
    .hero-noise{position:absolute;inset:0;opacity:.025;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");pointer-events:none}
    .hero-badge{display:inline-flex;align-items:center;gap:8px;padding:6px 14px 6px 8px;border-radius:100px;border:1px solid var(--border-glow);background:rgba(200,169,110,0.06);font-size:11.5px;font-weight:600;color:var(--gold);letter-spacing:.04em;text-transform:uppercase;margin-bottom:28px}
    .badge-dot{width:6px;height:6px;border-radius:50%;background:var(--gold);animation:pulse-r 2s ease-in-out infinite}
    .hero-h1{font-family:var(--serif);font-size:clamp(44px,7.5vw,92px);line-height:1.04;letter-spacing:-.03em;max-width:940px;margin-bottom:24px;font-weight:400}
    .hero-typed{color:var(--gold);font-style:italic}
    .cursor-blink{animation:blink 1s step-end infinite;opacity:.7;margin-left:2px;color:var(--gold)}
    .hero-sub{font-size:17px;line-height:1.68;color:var(--text-dim);max-width:500px;margin-bottom:48px;font-weight:400}
    /* FORM */
    .form-wrap{width:100%;max-width:640px;position:relative}
    .hero-form{display:flex;align-items:center;gap:10px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r-lg);padding:8px 8px 8px 22px;transition:border-color .2s,box-shadow .2s}
    .hero-form.focused{border-color:rgba(200,169,110,0.45);box-shadow:0 0 0 3px rgba(200,169,110,0.07),0 12px 48px rgba(0,0,0,0.45)}
    .hero-input{flex:1;background:transparent;border:none;font-size:15px;color:var(--text);font-family:var(--sans);outline:none;padding:6px 0;min-width:0}
    .hero-input::placeholder{color:var(--text-faint)}
    .hero-btn{flex-shrink:0;padding:12px 24px;border-radius:12px;font-size:14px;font-weight:700;letter-spacing:-.01em;background:var(--gold);color:#0b0b09;border:none;transition:background .15s,transform .15s;font-family:var(--sans);display:flex;align-items:center;gap:6px}
    .hero-btn:hover{background:var(--gold-l);transform:translateY(-1px)}
    .hero-hint{font-size:12px;color:var(--text-faint);margin-top:14px}
    /* SOCIAL PROOF */
    .sp-row{display:flex;align-items:center;gap:20px;margin-top:56px}
    .sp-avs{display:flex}
    .sp-av{width:32px;height:32px;border-radius:50%;border:2px solid var(--bg);background:linear-gradient(135deg,var(--bg3),var(--bg2));margin-left:-8px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--text-dim)}
    .sp-av:first-child{margin-left:0}
    .sp-txt{font-size:13px;color:var(--text-dim);text-align:left}
    .sp-stars{color:var(--gold);font-size:13px;display:block;margin-bottom:2px}
    /* SECTIONS */
    .section{padding:100px 24px;max-width:1100px;margin:0 auto}
    .sec-label{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--gold);margin-bottom:16px}
    .sec-h2{font-family:var(--serif);font-size:clamp(32px,4.5vw,58px);line-height:1.07;letter-spacing:-.025em;font-weight:400;margin-bottom:16px}
    .sec-h2 em{font-style:italic;color:var(--text-dim)}
    .sec-sub{font-size:16px;color:var(--text-dim);max-width:480px;line-height:1.7}
    /* STEPS */
    .steps{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;margin-top:56px}
    .step{background:var(--bg2);border:1px solid var(--border);padding:40px 36px;transition:border-color .25s}
    .step:first-child{border-radius:var(--r-lg) 0 0 var(--r-lg)}
    .step:last-child{border-radius:0 var(--r-lg) var(--r-lg) 0}
    .step:hover{border-color:var(--border-glow)}
    .step-num{font-size:11px;font-weight:700;letter-spacing:.08em;color:var(--gold);margin-bottom:20px;text-transform:uppercase}
    .step-icon{width:44px;height:44px;border-radius:12px;background:rgba(200,169,110,0.08);border:1px solid rgba(200,169,110,0.15);display:flex;align-items:center;justify-content:center;font-size:20px;margin-bottom:24px}
    .step-title{font-size:17px;font-weight:700;margin-bottom:10px;letter-spacing:-.01em}
    .step-desc{font-size:14px;color:var(--text-dim);line-height:1.65}
    /* STATS */
    .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--border);border:1px solid var(--border);border-radius:var(--r-lg);overflow:hidden;margin-top:72px}
    .stat{background:var(--bg2);padding:48px 40px;text-align:center}
    .stat-num{font-family:var(--serif);font-size:clamp(40px,5vw,64px);font-weight:400;letter-spacing:-.03em;margin-bottom:6px}
    .stat-lbl{font-size:13px;color:var(--text-dim);font-weight:500}
    /* PRICING */
    .pricing{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:52px}
    .p-card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r-lg);padding:36px 32px;position:relative;transition:border-color .25s,transform .2s}
    .p-card:hover{border-color:rgba(200,169,110,0.2);transform:translateY(-3px)}
    .p-card.feat{border-color:var(--border-glow);background:linear-gradient(180deg,rgba(200,169,110,0.05) 0%,var(--bg2) 100%)}
    .p-badge{position:absolute;top:-12px;left:50%;transform:translateX(-50%);padding:4px 14px;border-radius:100px;background:var(--gold);color:#0b0b09;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap}
    .p-tier{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--text-dim);margin-bottom:16px}
    .p-price{font-family:var(--serif);font-size:52px;font-weight:400;letter-spacing:-.03em;margin-bottom:4px;line-height:1}
    .p-price sup{font-size:22px;vertical-align:top;margin-top:12px;font-family:var(--sans);font-weight:500}
    .p-cad{font-size:13px;color:var(--text-dim);margin-bottom:28px}
    .p-div{height:1px;background:var(--border);margin-bottom:28px}
    .p-feats{list-style:none;display:flex;flex-direction:column;gap:12px;margin-bottom:32px}
    .p-feat{display:flex;align-items:flex-start;gap:10px;font-size:14px;color:var(--text-dim);line-height:1.5}
    .p-chk{color:var(--gold);font-size:13px;margin-top:1px;flex-shrink:0}
    .p-btn{display:block;width:100%;padding:13px;border-radius:10px;font-size:14px;font-weight:700;letter-spacing:-.01em;text-align:center;border:1px solid var(--border);color:var(--text);background:transparent;transition:all .2s;font-family:var(--sans)}
    .p-btn:hover{border-color:rgba(200,169,110,0.3);background:rgba(200,169,110,0.05)}
    .p-btn.gold{background:var(--gold);color:#0b0b09;border-color:var(--gold)}
    .p-btn.gold:hover{background:var(--gold-l)}
    /* TESTIMONIALS */
    .testi{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-top:52px}
    .t-card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r-lg);padding:32px;transition:border-color .25s}
    .t-card:hover{border-color:rgba(200,169,110,0.15)}
    .t-stars{color:var(--gold);font-size:13px;margin-bottom:16px}
    .t-quote{font-size:15px;line-height:1.72;color:var(--text-dim);margin-bottom:24px;font-style:italic}
    .t-author{display:flex;align-items:center;gap:12px}
    .t-av{width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,var(--bg3),var(--bg2));border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:var(--gold);flex-shrink:0}
    .t-name{font-size:14px;font-weight:600;margin-bottom:2px}
    .t-biz{font-size:12px;color:var(--text-dim)}
    /* CTA SECTION */
    .cta-sec{margin:0 24px 80px;background:linear-gradient(135deg,var(--bg2) 0%,rgba(200,169,110,0.04) 100%);border:1px solid var(--border-glow);border-radius:24px;padding:80px 48px;text-align:center;position:relative;overflow:hidden}
    .cta-glow{position:absolute;width:400px;height:400px;border-radius:50%;pointer-events:none;background:radial-gradient(circle,rgba(200,169,110,0.09) 0%,transparent 70%);top:50%;left:50%;transform:translate(-50%,-50%)}
    .cta-h2{font-family:var(--serif);font-size:clamp(32px,4vw,58px);letter-spacing:-.025em;font-weight:400;margin-bottom:16px;position:relative}
    .cta-sub{font-size:16px;color:var(--text-dim);max-width:440px;margin:0 auto 36px;line-height:1.68;position:relative}
    .btn-row{display:flex;gap:12px;justify-content:center;position:relative;flex-wrap:wrap}
    .btn-gold{display:inline-flex;align-items:center;gap:8px;padding:13px 28px;border-radius:10px;font-size:14px;font-weight:700;letter-spacing:-.01em;background:var(--gold);color:#0b0b09;border:none;transition:background .15s,transform .15s;font-family:var(--sans);text-decoration:none}
    .btn-gold:hover{background:var(--gold-l);transform:translateY(-1px)}
    .btn-out{display:inline-flex;align-items:center;gap:8px;padding:13px 24px;border-radius:10px;font-size:14px;font-weight:600;letter-spacing:-.01em;border:1px solid var(--border);color:var(--text);background:transparent;transition:all .2s;font-family:var(--sans);text-decoration:none}
    .btn-out:hover{border-color:rgba(200,169,110,0.3);background:rgba(200,169,110,0.05)}
    /* FOOTER */
    .footer{border-top:1px solid var(--border);padding:40px;display:flex;align-items:center;justify-content:space-between;max-width:1100px;margin:0 auto}
    .f-logo{font-family:var(--serif);font-size:16px}
    .f-logo span{color:var(--gold)}
    .f-links{display:flex;gap:24px}
    .f-link{font-size:13px;color:var(--text-dim);text-decoration:none;transition:color .2s}
    .f-link:hover{color:var(--text)}
    .f-copy{font-size:13px;color:var(--text-faint)}
    /* LOADING */
    .load-wrap{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:28px;padding:40px 24px}
    .load-orb{width:72px;height:72px;border-radius:50%;background:radial-gradient(circle,rgba(200,169,110,0.15) 0%,transparent 70%);border:1.5px solid rgba(200,169,110,0.25);display:flex;align-items:center;justify-content:center;position:relative}
    .load-orb::after{content:'';position:absolute;inset:-7px;border-radius:50%;border:1.5px solid transparent;border-top-color:var(--gold);animation:spin .9s linear infinite}
    .load-icon{font-size:26px}
    .load-title{font-family:var(--serif);font-size:30px;letter-spacing:-.02em;text-align:center}
    .load-sub{font-size:14px;color:var(--text-dim);text-align:center;margin-top:-12px}
    .load-steps{display:flex;flex-direction:column;gap:10px;width:100%;max-width:360px}
    .load-step{display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:10px;background:var(--bg2);border:1px solid var(--border);font-size:13px;color:var(--text-dim)}
    .load-step.active{border-color:rgba(200,169,110,0.3);color:var(--text)}
    .ls-dot{width:6px;height:6px;border-radius:50%;background:var(--border);flex-shrink:0}
    .ls-spin{width:14px;height:14px;border:1.5px solid rgba(200,169,110,0.2);border-top-color:var(--gold);border-radius:50%;animation:spin .7s linear infinite;flex-shrink:0}
    /* PREVIEW */
    .prev-bar{position:fixed;top:0;left:0;right:0;z-index:100;background:rgba(11,11,9,0.92);backdrop-filter:blur(24px);border-bottom:1px solid var(--border);padding:14px 24px;display:flex;align-items:center;gap:16px}
    .prev-back{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:500;color:var(--text-dim);background:transparent;border:none;padding:6px 0;transition:color .2s}
    .prev-back:hover{color:var(--text)}
    .prev-name{font-size:14px;font-weight:600;flex:1}
    .prev-cta{display:flex;align-items:center;gap:8px;padding:10px 22px;border-radius:10px;font-size:14px;font-weight:700;letter-spacing:-.01em;background:var(--gold);color:#0b0b09;border:none;transition:background .15s,transform .15s;font-family:var(--sans)}
    .prev-cta:hover{background:var(--gold-l);transform:translateY(-1px)}
    .prev-frame{position:fixed;top:57px;left:0;right:0;bottom:0;width:100%;border:none}
    .prev-hint{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:rgba(11,11,9,0.88);backdrop-filter:blur(12px);border:1px solid var(--border);padding:10px 20px;border-radius:100px;font-size:12px;color:var(--text-dim);white-space:nowrap}
    /* ERROR */
    .err-wrap{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;padding:40px 24px;text-align:center}
    .err-icon{font-size:40px}
    .err-title{font-family:var(--serif);font-size:30px;letter-spacing:-.02em}
    .err-msg{font-size:14px;color:var(--text-dim);max-width:400px;line-height:1.6}
    /* RESPONSIVE */
    @media(max-width:768px){
      .nav{padding:16px 20px}
    @media(max-width:640px){
      .hero-h1{font-size:clamp(36px,6vw,60px);margin-bottom:20px}
      .hero-sub{font-size:15px;margin-bottom:36px}
      .hero-form{flex-direction:column;gap:8px;padding:12px}
      .hero-input{padding:8px}
      .hero-btn{width:100%;justify-content:center;padding:14px 20px;font-size:13px}
      .nav-logo{font-size:16px}
      .sec-h2{font-size:clamp(28px,5vw,44px);margin-bottom:12px}
      .sec-sub{font-size:14px;max-width:100%}
      .sp-row{flex-direction:column;align-items:flex-start;gap:12px}
      .sp-avs{margin-bottom:8px}
      .hero-hint{font-size:11px;margin-top:10px}
    }
    @media(max-width:480px){
      html,body{font-size:14px}
      :root{--r:12px;--r-lg:16px}
      .nav{padding:12px 16px;height:56px}
      .nav-logo{font-size:14px}
      .nav-cta{padding:8px 16px;font-size:12px}
      .hero{padding:80px 16px 50px;gap:20px}
      .hero-badge{font-size:10px;padding:5px 12px 5px 6px}
      .hero-h1{font-size:clamp(28px,5vw,40px);line-height:1.1;margin-bottom:16px}
      .hero-sub{font-size:13px;margin-bottom:28px;max-width:100%}
      .hero-form{flex-direction:column}
      .hero-input{font-size:14px;padding:10px}
      .hero-btn{width:100%;padding:12px 18px;font-size:13px}
      .form-wrap{max-width:100%}
      .hero-hint{font-size:10px;margin-top:8px}
      .section{padding:60px 16px}
      .sec-h2{font-size:clamp(24px,5vw,36px)}
      .sec-label{font-size:10px}
      .sec-sub{font-size:13px}
      .steps{gap:1px}
      .step{padding:28px 20px}
      .step-icon{width:40px;height:40px;font-size:18px;margin-bottom:16px}
      .step-title{font-size:15px;margin-bottom:8px}
      .step-desc{font-size:13px}
      .stat{padding:32px 20px}
      .stat-num{font-size:26px}
      .stat-label{font-size:11px}
      .pricing{grid-template-columns:1fr;gap:12px}
      .price-card{padding:28px 20px}
      .price-name{font-size:16px;margin-bottom:8px}
      .price-num{font-size:24px}
      .price-fee{font-size:11px}
      .price-feat{font-size:12px;padding:8px 0}
      .price-cta{padding:10px 18px;font-size:12px;width:100%}
      .testi{grid-template-columns:1fr}
      .testi-card{padding:28px 20px}
      .testi-quote{font-size:13px;line-height:1.6;margin-bottom:12px}
      .testi-author{font-size:12px}
      .testi-role{font-size:11px}
      .cta-sec{margin:0;padding:40px 20px;border-radius:12px}
      .cta-h{font-size:clamp(24px,5vw,32px);margin-bottom:12px}
      .cta-sub{font-size:13px;margin-bottom:24px}
      .cta-btns{flex-direction:column;gap:10px}
      .cta-btn{width:100%;padding:12px 18px;font-size:13px}
      .footer{padding:28px 16px;gap:20px;text-align:center}
      .f-col{margin-bottom:20px}
      .f-title{font-size:13px;margin-bottom:12px}
      .f-link{font-size:12px}
      .f-copy{font-size:11px}
      /* Touch targets - min 48x48px tap area */
      button,a[role="button"]{min-height:44px;padding:10px 16px}
      .nav-cta{min-width:44px;min-height:44px}
      .hero-btn{min-height:44px}
    }
    
      .nav-links{display:none}
      .hero{padding:100px 20px 60px}
      .section{padding:72px 20px}
      .steps{grid-template-columns:1fr;gap:2px}
      .step:first-child{border-radius:var(--r-lg) var(--r-lg) 0 0}
      .step:last-child{border-radius:0 0 var(--r-lg) var(--r-lg)}
      .stats{grid-template-columns:1fr}
      .pricing{grid-template-columns:1fr}
      .testi{grid-template-columns:1fr}
      .cta-sec{margin:0 16px 60px;padding:56px 28px}
      .footer{flex-direction:column;gap:20px;text-align:center;padding:32px 20px}
      .f-links{display:none}
      .sp-row{flex-direction:column;gap:12px}
    }
  `;

  return (
    <div>
      <div id="cur-dot" />
      <div id="cur-ring" />
      <style>{CSS}</style>

      {/* PREVIEW */}
      {step === "preview" && preview && (
        <>
          <div className="prev-bar">
            <button className="prev-back" onClick={handleReset}>← Back</button>
            <span className="prev-name">{preview.businessName}</span>
            <button className="prev-cta" onClick={handleStartBuilding}>Get This Site →</button>
          </div>
          <iframe ref={iframeCallbackRef} className="prev-frame" sandbox="allow-scripts allow-same-origin" title="Preview" />
          <div className="prev-hint">Free AI preview — tap "Get This Site" to make it yours</div>
        </>
      )}

      {/* LOADING */}
      {(step === "scraping" || step === "generating") && (
        <div className="load-wrap">
          <div className="load-orb"><span className="load-icon">✦</span></div>
          <div>
            <div className="load-title">Building your preview</div>
            <div className="load-sub">{scrapeProgress}</div>
          </div>
          <div className="load-steps">
            {[
              { label: "Scanning your website", active: step === "scraping" },
              { label: "Extracting content & branding", active: step === "scraping" },
              { label: "Crafting your new design", active: step === "generating" },
              { label: "Adding finishing touches", active: step === "generating" },
            ].map((s, i) => (
              <div key={i} className={`load-step${s.active ? " active" : ""}`}>
                {s.active ? <span className="ls-spin" /> : <span className="ls-dot" />}
                {s.label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ERROR */}
      {step === "error" && (
        <div className="err-wrap">
          <div className="err-icon">⚡</div>
          <div className="err-title">Something went wrong</div>
          <div className="err-msg">{error || "We hit a snag. Give it another shot."}</div>
          <button className="btn-gold" onClick={handleReset}>Try Again</button>
        </div>
      )}

      {/* HOMEPAGE */}
      {step === "input" && (
        <>
          <nav className="nav">
            <a href="/" className="nav-logo">Site<span>craft</span></a>
            <div className="nav-links">
              <a href="#how" className="nav-link">How it works</a>
              <a href="/pricing" className="nav-link">Pricing</a>
              <a href="/gallery" className="nav-link">Gallery</a>
              <a href="/forge" className="nav-link" style={{fontWeight:700, color:"#c8a96e"}}>⚡ Forge Agent</a>
              <a href="mailto:hello@sitecraftai.com" className="nav-link">Contact</a>
            </div>
            {isLoggedIn ? (
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <a href="/dashboard" className="nav-link">Dashboard</a>
                <a href="/dashboard" style={{width:32,height:32,borderRadius:"50%",background:"rgba(200,169,110,0.15)",border:"1px solid rgba(200,169,110,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"var(--gold)",textDecoration:"none"}}>{userInitial}</a>
              </div>
            ) : (
              <a href="/login" className="nav-cta">Get started free →</a>
            )}
          </nav>

          <section className="hero" id="try">
            <div className="hero-glow" />
            <div className="hero-noise" />
            <div className="hero-badge a1"><span className="badge-dot" />AI-Powered Web Design</div>
            <h1 className="hero-h1 a2">
              A website that<br /><TypeCycle />
            </h1>
            <p className="hero-sub a3">
              Paste your URL or describe your business. Get a premium, mobile-ready website preview in under 60 seconds.
            </p>
            <div className="form-wrap a4" id="try-form">
              <form className={`hero-form${inputFocused ? " focused" : ""}`} onSubmit={handleSubmit}>
                <input
                  ref={inputRef} className="hero-input" value={url}
                  onChange={e => setUrl(e.target.value)}
                  onFocus={() => setInputFocused(true)} onBlur={() => setInputFocused(false)}
                  placeholder="yourwebsite.com or describe your business…"
                  autoFocus autoComplete="off" spellCheck={false}
                />
                <button type="submit" className="hero-btn">Build it free <span style={{fontSize:16}}>→</span></button>
              </form>
              <div className="hero-hint">No credit card · No signup · See your site in &lt;60 seconds</div>
            </div>
            <div className="sp-row a4">
              <div className="sp-avs">
                {["M","J","S","T","K"].map((l, i) => <div key={i} className="sp-av">{l}</div>)}
              </div>
              <div className="sp-txt">
                <span className="sp-stars">★★★★★</span>
                <strong>47 local businesses</strong> got their site this week
              </div>
            </div>
          </section>

          {/* HOW IT WORKS */}
          <div className="section" id="how">
            <p className="sec-label">The Process</p>
            <h2 className="sec-h2">Three steps.<br /><em>One premium site.</em></h2>
            <p className="sec-sub">We do the work. You get a site that looks like you paid $10,000 for it.</p>
            <div className="steps">
              {[
                { n:"01", icon:"🔍", title:"Drop your URL", desc:"Paste your existing website or describe your business in plain English. No forms, no questionnaires — just what you do." },
                { n:"02", icon:"⚡", title:"AI builds your preview", desc:"Our AI analyzes your content and generates a custom, conversion-optimized design in under 60 seconds. For free." },
                { n:"03", icon:"🚀", title:"We refine and launch", desc:"Love it? We polish it with you and launch — fully hosted, SEO-ready, mobile-first. Usually live within a week." },
              ].map(s => (
                <div key={s.n} className="step">
                  <div className="step-num">Step {s.n}</div>
                  <div className="step-icon">{s.icon}</div>
                  <div className="step-title">{s.title}</div>
                  <div className="step-desc">{s.desc}</div>
                </div>
              ))}
            </div>
            <div className="stats">
              {[
                { n: 60, s: "s", l: "Preview generation time" },
                { n: 97, s: "%", l: "Client satisfaction rate" },
                { n: 3, s: "×", l: "Average lead increase" },
              ].map((stat, i) => (
                <div key={i} className="stat">
                  <div className="stat-num"><Counter to={stat.n} suffix={stat.s} /></div>
                  <div className="stat-lbl">{stat.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* PRICING */}
          <div className="section" id="pricing" style={{paddingTop:0}}>
            <p className="sec-label">Transparent Pricing</p>
            <h2 className="sec-h2">Built for the budget<br /><em>that grows you.</em></h2>
            <p className="sec-sub">No surprises. No hidden fees. A site that actually works.</p>
            <div className="pricing">
              {[
                { tier:"Starter", price:"800", cad:"CAD one-time", feat:["5-page professional site","Mobile-first design","Contact form + Google Maps","1 revision round","Launched in 5 business days"], btn:"Get started →", gold:false, feat2:false },
                { tier:"Standard", price:"1,800", cad:"CAD one-time", feat:["Up to 10 pages","Custom branding & logo","Booking / quote forms","SEO setup + Google Analytics","3 revision rounds","Launched in 8 business days"], btn:"Get started →", gold:true, feat2:true },
                { tier:"Retainer", price:"200", cad:"CAD per month", feat:["Monthly content updates","Hosting + SSL managed","Performance monitoring","Priority support","Quarterly SEO review"], btn:"Get started →", gold:false, feat2:false },
              ].map((p, i) => (
                <div key={i} className={`p-card${p.feat2?" feat":""}`}>
                  {p.feat2 && <div className="p-badge">Most popular</div>}
                  <div className="p-tier">{p.tier}</div>
                  <div className="p-price"><sup>$</sup>{p.price}</div>
                  <div className="p-cad">{p.cad}</div>
                  <div className="p-div" />
                  <ul className="p-feats">
                    {p.feat.map(f => <li key={f} className="p-feat"><span className="p-chk">✓</span>{f}</li>)}
                  </ul>
                  <button className={`p-btn${p.gold?" gold":""}`} onClick={() => { document.getElementById("try-form")?.scrollIntoView({behavior:"smooth"}); setTimeout(()=>inputRef.current?.focus(),500); }}>{p.btn}</button>
                </div>
              ))}
            </div>
          </div>

          {/* TESTIMONIALS */}
          <div className="section" style={{paddingTop:0}}>
            <p className="sec-label">What clients say</p>
            <h2 className="sec-h2">Real businesses.<br /><em>Real results.</em></h2>
            <div className="testi">
              {[
                { q:"I was running my plumbing business off a Facebook page. Randy built me a site in a week — I got 3 calls from Google in the first month. Never had that before.", name:"Dale M.", biz:"DM Plumbing — Red Deer, AB" },
                { q:"Honestly expected a cheap template. What I got looked like something a $20K agency would build. My customers actually mention the website now.", name:"Jess T.", biz:"Tundra Landscaping — Leduc, AB" },
                { q:"Fast, professional, zero BS. Randy knew what he was doing from day one. The booking form alone paid for the whole site in two months.", name:"Mike S.", biz:"Summit HVAC — Cochrane, AB" },
                { q:"I described my cleaning company in a paragraph and got back a site I was proud to share. The whole process was painless.", name:"Carla F.", biz:"Pristine Clean Co. — Airdrie, AB" },
              ].map((t, i) => (
                <div key={i} className="t-card">
                  <div className="t-stars">★★★★★</div>
                  <p className="t-quote">"{t.q}"</p>
                  <div className="t-author">
                    <div className="t-av">{t.name[0]}</div>
                    <div><div className="t-name">{t.name}</div><div className="t-biz">{t.biz}</div></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FINAL CTA */}
          <div className="cta-sec">
            <div className="cta-glow" />
            <p className="sec-label" style={{position:"relative"}}>Ready?</p>
            <h2 className="cta-h2">See your new site.<br /><em>In 60 seconds. Free.</em></h2>
            <p className="cta-sub">No signup required. No credit card. Just drop your URL and see what you've been missing.</p>
            <div className="btn-row">
              <button className="btn-gold" onClick={() => { document.getElementById("try")?.scrollIntoView({behavior:"smooth"}); setTimeout(()=>inputRef.current?.focus(),600); }}>Build my site free →</button>
              <a href="mailto:hello@sitecraftai.com" className="btn-out">Talk to Randy</a>
            </div>
          </div>

          <footer className="footer">
            <div className="f-logo">Site<span>craft</span></div>
            <div className="f-links">
              <a href="#how" className="f-link">How it works</a>
              <a href="#pricing" className="f-link">Pricing</a>
              <a href="/gallery" className="f-link">Gallery</a>
              <a href="/forge" className="f-link">Forge Agent ⚡</a>
              <a href="mailto:hello@sitecraftai.com" className="f-link">Contact</a>
            </div>
            <div className="f-copy">© 2026 Sitecraft · Alberta, Canada · AI-Powered</div>
          </footer>
        </>
      )}
    </div>
  );
}

