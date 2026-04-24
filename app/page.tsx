"use client";
import { useState, useEffect, useRef, useCallback } from "react";

// ─── Typewriter ───────────────────────────────────────────────────────────────
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

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Cursor
  useEffect(() => {
    const dot = document.getElementById("cur-dot");
    const ring = document.getElementById("cur-ring");
    if (!dot || !ring) return;
    let mx = 0, my = 0, rx = 0, ry = 0;
    const onMove = (e: MouseEvent) => {
      mx = e.clientX; my = e.clientY;
      dot.style.left = mx + "px"; dot.style.top = my + "px";
    };
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

  // Nav compact on scroll
  useEffect(() => {
    const nav = document.getElementById("rbnav");
    if (!nav) return;
    const onScroll = () => nav.classList.toggle("compact", window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Reveal on scroll
  useEffect(() => {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          (e.target as HTMLElement).classList.add("in");
        }
      });
    }, { threshold: 0.06, rootMargin: "0px 0px -32px 0px" });
    document.querySelectorAll(".rv").forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) { inputRef.current?.focus(); return; }
    setError("");
    setLoading(true);
    try {
      let u = url.trim();
      if (!/^https?:\/\//i.test(u)) u = "https://" + u;
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: u }),
      });
      const data = await res.json();
      if (!res.ok || !data.previewUrl) throw new Error(data.error || "Something went wrong");
      window.location.href = data.previewUrl;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not generate preview. Try again.");
    } finally {
      setLoading(false);
    }
  }, [url]);

  return (
    <>
      {/* ── Global styles ────────────────────────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html{font-size:16px;scroll-behavior:smooth}
        body{
          background:#0a0a08;color:#e8e4dc;
          font-family:'Inter',system-ui,sans-serif;
          font-weight:300;overflow-x:hidden;cursor:none;
          -webkit-font-smoothing:antialiased;
        }
        a{color:inherit;text-decoration:none}
        ::selection{background:#c8a96e33;color:#e8e4dc}
        input,button{font-family:inherit}
        input{outline:none;pointer-events:auto}
        button{pointer-events:auto}
        input::placeholder{color:rgba(232,228,220,.3)}

        /* Cursor */
        #cur-dot{position:fixed;width:7px;height:7px;background:#e8e4dc;border-radius:50%;pointer-events:none;z-index:9999;transform:translate(-50%,-50%);mix-blend-mode:difference;transition:width .15s,height .15s}
        #cur-ring{position:fixed;width:38px;height:38px;border:1px solid rgba(232,228,220,.3);border-radius:50%;pointer-events:none;z-index:9998;transform:translate(-50%,-50%);transition:width .25s,height .25s}
        a:hover ~ #cur-ring,button:hover ~ #cur-ring{width:60px;height:60px}

        /* Nav */
        #rbnav{
          position:fixed;top:0;left:0;right:0;z-index:500;
          display:flex;align-items:center;justify-content:space-between;
          padding:32px 56px;
          transition:padding .4s cubic-bezier(.16,1,.3,1),background .3s,border-color .3s;
        }
        #rbnav.compact{padding:18px 56px;background:rgba(10,10,8,.95);backdrop-filter:blur(24px);border-bottom:1px solid rgba(255,255,255,.06)}
        .nav-logo{font-family:'Syne',sans-serif;font-size:.9rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#e8e4dc}
        .nav-logo span{color:#c8a96e}
        .nav-links{display:flex;align-items:center;gap:40px}
        .nav-link{font-family:'Syne',sans-serif;font-size:.7rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:rgba(232,228,220,.4);transition:color .2s}
        .nav-link:hover{color:#e8e4dc}
        .nav-cta{font-family:'Syne',sans-serif;font-size:.7rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#0a0a08;background:#c8a96e;padding:10px 24px;border-radius:100px;transition:opacity .15s,transform .15s}
        .nav-cta:hover{opacity:.88;transform:translateY(-1px)}
        @media(max-width:768px){#rbnav{padding:20px 24px}#rbnav.compact{padding:14px 24px}.nav-links{gap:20px}.nav-link{display:none}}

        /* Hero */
        .hero{
          min-height:100svh;
          display:flex;flex-direction:column;justify-content:flex-end;
          padding:0 56px 80px;
          position:relative;overflow:hidden;
        }
        .hero-noise{
          position:absolute;inset:0;z-index:0;pointer-events:none;
          background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
          opacity:.5;
        }
        .hero-glow{position:absolute;width:800px;height:800px;top:-200px;left:50%;transform:translateX(-50%);background:radial-gradient(circle,rgba(200,169,110,.07) 0%,transparent 65%);pointer-events:none;z-index:0}
        .hero-grid{
          position:absolute;inset:0;z-index:0;
          background-image:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);
          background-size:80px 80px;
          mask-image:radial-gradient(ellipse 80% 60% at 50% 0%,black,transparent);
        }
        .hero-eyebrow{
          position:relative;z-index:2;
          font-family:'Syne',sans-serif;font-size:.68rem;font-weight:600;
          letter-spacing:.16em;text-transform:uppercase;color:rgba(232,228,220,.35);
          display:flex;align-items:center;gap:14px;margin-bottom:36px;
          animation:fadeUp .8s cubic-bezier(.16,1,.3,1) both;
        }
        .hero-eyebrow::before{content:'';display:block;width:32px;height:1px;background:#c8a96e;opacity:.6}
        .hero-headline{
          position:relative;z-index:2;
          font-family:'Instrument Serif',Georgia,serif;
          font-size:clamp(3rem,8vw,8.5rem);
          font-weight:400;line-height:.95;letter-spacing:-.03em;
          color:#e8e4dc;margin-bottom:0;
          animation:fadeUp .9s cubic-bezier(.16,1,.3,1) .08s both;
        }
        .hero-headline em{font-style:italic;color:#c8a96e}
        .hero-bottom{
          position:relative;z-index:2;
          display:grid;grid-template-columns:1fr 520px;
          gap:60px;align-items:end;
          margin-top:64px;
        }
        .hero-sub{
          font-size:1rem;color:rgba(232,228,220,.45);
          line-height:1.8;font-weight:300;
          animation:fadeUp .9s cubic-bezier(.16,1,.3,1) .16s both;
        }

        /* URL Form — the centerpiece */
        .url-form-wrap{
          animation:fadeUp .9s cubic-bezier(.16,1,.3,1) .22s both;
        }
        .url-form-label{
          font-family:'Syne',sans-serif;font-size:.65rem;font-weight:600;
          letter-spacing:.12em;text-transform:uppercase;
          color:rgba(232,228,220,.3);margin-bottom:14px;display:block;
        }
        .url-form{
          display:flex;align-items:stretch;gap:0;
          background:#111110;
          border:1px solid rgba(255,255,255,.1);
          border-radius:14px;overflow:hidden;
          transition:border-color .25s;
        }
        .url-form:focus-within{border-color:rgba(200,169,110,.45)}
        .url-form:focus-within .url-icon{color:#c8a96e}
        .url-icon{
          display:flex;align-items:center;padding:0 18px;
          color:rgba(232,228,220,.2);font-size:.9rem;
          flex-shrink:0;transition:color .25s;
          font-family:'Syne',sans-serif;font-size:.72rem;
          letter-spacing:.04em;border-right:1px solid rgba(255,255,255,.07);
        }
        .url-input{
          flex:1;background:transparent;border:none;
          padding:18px 20px;font-size:.95rem;font-weight:300;
          color:#e8e4dc;min-width:0;
        }
        .url-submit{
          background:#c8a96e;color:#0a0a08;
          border:none;padding:0 28px;
          font-family:'Syne',sans-serif;font-size:.72rem;font-weight:800;
          letter-spacing:.08em;text-transform:uppercase;
          cursor:pointer;white-space:nowrap;
          transition:opacity .15s,background .15s;
          display:flex;align-items:center;gap:8px;
          flex-shrink:0;
        }
        .url-submit:hover:not(:disabled){opacity:.88}
        .url-submit:disabled{opacity:.5}
        .url-error{
          font-size:.78rem;color:#e07070;margin-top:10px;
          font-weight:300;padding-left:4px;
        }
        .url-hint{
          font-size:.72rem;color:rgba(232,228,220,.2);
          margin-top:10px;padding-left:4px;font-weight:300;
        }
        @media(max-width:900px){.hero-bottom{grid-template-columns:1fr;gap:40px}.hero{padding:0 24px 64px}}
        @media(max-width:640px){.hero-headline{font-size:clamp(2.8rem,12vw,5rem)}}

        /* Ticker */
        .ticker-wrap{overflow:hidden;border-top:1px solid rgba(255,255,255,.06);border-bottom:1px solid rgba(255,255,255,.06);padding:16px 0;background:#080807}
        .ticker-track{display:flex;width:max-content;animation:marquee 32s linear infinite}
        .ticker-item{display:inline-flex;align-items:center;gap:10px;padding:0 32px;font-family:'Syne',sans-serif;font-size:.65rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:rgba(232,228,220,.22);white-space:nowrap}
        .ticker-dot{color:#c8a96e;opacity:.5}

        /* How it works */
        .how{padding:160px 56px;max-width:1200px;margin:0 auto;border-bottom:1px solid rgba(255,255,255,.06)}
        .section-eyebrow{font-family:'Syne',sans-serif;font-size:.65rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:#c8a96e;margin-bottom:20px;display:block}
        .section-headline{font-family:'Instrument Serif',Georgia,serif;font-size:clamp(2.2rem,4.5vw,4rem);font-weight:400;line-height:1.1;letter-spacing:-.025em;color:#e8e4dc;margin-bottom:80px}
        .section-headline em{font-style:italic;color:rgba(232,228,220,.5)}
        .steps{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border:1px solid rgba(255,255,255,.07);border-radius:20px;overflow:hidden}
        .step{padding:48px 40px;position:relative}
        .step+.step{border-left:1px solid rgba(255,255,255,.07)}
        .step-num{font-family:'Instrument Serif',Georgia,serif;font-size:4rem;font-weight:400;font-style:italic;color:rgba(200,169,110,.15);line-height:1;margin-bottom:24px}
        .step-title{font-family:'Syne',sans-serif;font-size:1rem;font-weight:700;color:#e8e4dc;margin-bottom:12px;letter-spacing:-.01em}
        .step-desc{font-size:.88rem;color:rgba(232,228,220,.45);line-height:1.75;font-weight:300}
        @media(max-width:768px){.steps{grid-template-columns:1fr;border-radius:16px}.step+.step{border-left:none;border-top:1px solid rgba(255,255,255,.07)}.how{padding:100px 24px}}

        /* Pricing */
        .pricing{padding:160px 56px;max-width:1200px;margin:0 auto;border-bottom:1px solid rgba(255,255,255,.06)}
        .pricing-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:0}
        .price-card{
          padding:48px 36px;
          border:1px solid rgba(255,255,255,.08);
          border-radius:20px;
          background:#0e0e0c;
          position:relative;
          transition:border-color .25s,transform .25s;
        }
        .price-card:hover{border-color:rgba(200,169,110,.25);transform:translateY(-4px)}
        .price-card.featured{border-color:rgba(200,169,110,.3);background:#111009}
        .price-card.featured::before{
          content:'Most Popular';
          position:absolute;top:-12px;left:50%;transform:translateX(-50%);
          font-family:'Syne',sans-serif;font-size:.62rem;font-weight:700;
          letter-spacing:.1em;text-transform:uppercase;
          color:#0a0a08;background:#c8a96e;
          padding:5px 16px;border-radius:100px;white-space:nowrap;
        }
        .price-tier{font-family:'Syne',sans-serif;font-size:.68rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(232,228,220,.35);margin-bottom:20px}
        .price-amount{font-family:'Instrument Serif',Georgia,serif;font-size:3.2rem;font-weight:400;font-style:italic;color:#e8e4dc;line-height:1;margin-bottom:6px}
        .price-amount span{font-size:1.2rem;font-style:normal;color:rgba(232,228,220,.4);vertical-align:top;margin-top:8px;display:inline-block;margin-right:4px}
        .price-cycle{font-size:.78rem;color:rgba(232,228,220,.3);font-weight:300;margin-bottom:36px}
        .price-divider{height:1px;background:rgba(255,255,255,.07);margin-bottom:28px}
        .price-features{display:flex;flex-direction:column;gap:14px;margin-bottom:40px}
        .price-feat{display:flex;align-items:flex-start;gap:12px;font-size:.85rem;color:rgba(232,228,220,.55);line-height:1.5;font-weight:300}
        .price-feat::before{content:'—';color:#c8a96e;flex-shrink:0;font-style:italic}
        .price-btn{
          display:block;text-align:center;
          padding:14px 24px;border-radius:100px;
          font-family:'Syne',sans-serif;font-size:.72rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;
          transition:opacity .15s,transform .15s,background .15s,color .15s;
        }
        .price-btn-outline{border:1px solid rgba(255,255,255,.15);color:rgba(232,228,220,.6)}
        .price-btn-outline:hover{border-color:rgba(200,169,110,.4);color:#c8a96e}
        .price-btn-fill{background:#c8a96e;color:#0a0a08}
        .price-btn-fill:hover{opacity:.88;transform:translateY(-1px)}
        @media(max-width:900px){.pricing-grid{grid-template-columns:1fr;max-width:480px}.pricing{padding:100px 24px}}

        /* CTA */
        .cta-section{
          padding:180px 56px;
          text-align:center;position:relative;overflow:hidden;
        }
        .cta-glow{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:700px;height:700px;background:radial-gradient(circle,rgba(200,169,110,.07) 0%,transparent 65%);pointer-events:none}
        .cta-eyebrow{font-family:'Syne',sans-serif;font-size:.65rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:rgba(232,228,220,.3);margin-bottom:40px}
        .cta-headline{font-family:'Instrument Serif',Georgia,serif;font-size:clamp(2.8rem,7vw,7.5rem);font-weight:400;font-style:italic;line-height:.95;letter-spacing:-.03em;color:#e8e4dc;margin-bottom:56px}
        .cta-headline em{font-style:normal;color:#c8a96e}
        .cta-form-wrap{max-width:560px;margin:0 auto}
        @media(max-width:640px){.cta-section{padding:120px 24px}}

        /* Footer */
        .footer{
          padding:48px 56px;border-top:1px solid rgba(255,255,255,.07);
          display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:24px;
        }
        .footer-name{font-family:'Syne',sans-serif;font-size:.75rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:rgba(232,228,220,.35)}
        .footer-center{font-family:'Syne',sans-serif;font-size:.62rem;letter-spacing:.1em;text-transform:uppercase;color:rgba(232,228,220,.18);text-align:center}
        .footer-right{font-size:.72rem;color:rgba(232,228,220,.2);text-align:right;font-weight:300}
        @media(max-width:640px){.footer{padding:32px 24px;grid-template-columns:1fr}.footer-center,.footer-right{text-align:left}}

        /* Reveal */
        .rv{opacity:0;transform:translateY(28px);transition:opacity .8s cubic-bezier(.16,1,.3,1),transform .8s cubic-bezier(.16,1,.3,1)}
        .rv.in{opacity:1;transform:none}
        .rv-l{opacity:0;transform:translateX(-28px);transition:opacity .8s cubic-bezier(.16,1,.3,1),transform .8s cubic-bezier(.16,1,.3,1)}
        .rv-l.in{opacity:1;transform:none}

        /* Animations */
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
      `}</style>

      {/* Cursor */}
      <div id="cur-dot" />
      <div id="cur-ring" />

      {/* Nav */}
      <nav id="rbnav">
        <a href="/" className="nav-logo">Randy<span>Builds</span></a>
        <div className="nav-links">
          <a href="#how" className="nav-link">How it works</a>
          <a href="#pricing" className="nav-link">Pricing</a>
          <a href="mailto:hello@randybuilds.ca" className="nav-cta">Get a Site</a>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero-noise" />
        <div className="hero-glow" />
        <div className="hero-grid" />

        <div className="hero-eyebrow">Alberta web design — from $800 CAD</div>

        <h1 className="hero-headline">
          Your website<br />
          <em>actually</em><br />
          <TypeCycle />
        </h1>

        <div className="hero-bottom">
          <p className="hero-sub">
            We build fast, clean, conversion-ready websites for Alberta small businesses and tradespeople.
            Drop your current site below — see what it could look like in 60 seconds.
          </p>

          <div className="url-form-wrap">
            <span className="url-form-label">Paste your current website URL</span>
            <form className="url-form" onSubmit={handleSubmit}>
              <span className="url-icon">↗</span>
              <input
                ref={inputRef}
                className="url-input"
                type="text"
                placeholder="yourbusiness.com"
                value={url}
                onChange={e => setUrl(e.target.value)}
                disabled={loading}
              />
              <button className="url-submit" type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <span style={{ display: "inline-block", animation: "spin 1s linear infinite", borderRadius: "50%", width: 14, height: 14, border: "2px solid #0a0a08", borderTopColor: "transparent" }} />
                    Building
                  </>
                ) : "Preview →"}
              </button>
            </form>
            {error && <p className="url-error">{error}</p>}
            {!error && <p className="url-hint">Free. No account needed. Takes ~30 seconds.</p>}
          </div>
        </div>
      </section>

      {/* Ticker */}
      <div className="ticker-wrap">
        <div className="ticker-track">
          {["Web Design", "Alberta", "From $800", "Fast Turnaround", "Mobile First", "SEO Ready", "Trades & Local Business", "Web Design", "Alberta", "From $800", "Fast Turnaround", "Mobile First", "SEO Ready", "Trades & Local Business"].map((t, i) => (
            <span key={i} className="ticker-item">{t} <span className="ticker-dot">✦</span></span>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────────── */}
      <section className="how rv" id="how">
        <span className="section-eyebrow">How it works</span>
        <h2 className="section-headline">Three steps.<br /><em>One great website.</em></h2>
        <div className="steps">
          {[
            { num: "01", title: "Paste your URL above", desc: "Drop in your current site. Our system scrapes your brand, pulls your photos, reads your services — and builds a live preview in under a minute." },
            { num: "02", title: "See your redesign live", desc: "A full-page premium preview — your actual business, your actual colors, rebuilt to a standard that makes people trust you the moment they land." },
            { num: "03", title: "We build the real thing", desc: "Love what you see? We take it from preview to production in 2 weeks. Clean code, fast load, mobile-first, ready to rank on Google." },
          ].map(s => (
            <div key={s.num} className="step">
              <div className="step-num">{s.num}</div>
              <h3 className="step-title">{s.title}</h3>
              <p className="step-desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────────────────────── */}
      <section className="pricing rv" id="pricing">
        <span className="section-eyebrow">Pricing</span>
        <h2 className="section-headline">Straightforward.<br /><em>No surprises.</em></h2>
        <div className="pricing-grid">
          {[
            {
              tier: "Starter", amount: "800", suffix: "+", cycle: "one-time",
              features: ["5-page website", "Mobile-first design", "Contact form", "Google-ready SEO basics", "Delivered in 7 days"],
              btn: "price-btn-outline", label: "Get Started",
            },
            {
              tier: "Standard", amount: "1,500", suffix: "+", cycle: "one-time", featured: true,
              features: ["Up to 10 pages", "Booking or quote form", "Full SEO setup", "Google Analytics", "2-week delivery"],
              btn: "price-btn-fill", label: "Get Started",
            },
            {
              tier: "Retainer", amount: "200", suffix: "/mo", cycle: "monthly",
              features: ["Hosting management", "Monthly updates", "Speed & security", "Priority support", "Ongoing peace of mind"],
              btn: "price-btn-outline", label: "Talk to Us",
            },
          ].map(p => (
            <div key={p.tier} className={`price-card rv${p.featured ? " featured" : ""}`}>
              <div className="price-tier">{p.tier}</div>
              <div className="price-amount"><span>$</span>{p.amount}<span style={{ fontSize: "1rem" }}>{p.suffix}</span></div>
              <div className="price-cycle">CAD · {p.cycle}</div>
              <div className="price-divider" />
              <div className="price-features">
                {p.features.map(f => <div key={f} className="price-feat">{f}</div>)}
              </div>
              <a href="mailto:hello@randybuilds.ca" className={`price-btn ${p.btn}`}>{p.label} ↗</a>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section className="cta-section" id="contact">
        <div className="cta-glow" />
        <p className="cta-eyebrow">Ready to look the part?</p>
        <h2 className="cta-headline">
          Drop your<br />URL. See the <em>difference.</em>
        </h2>
        <div className="cta-form-wrap">
          <div className="url-form-wrap">
            <form className="url-form" onSubmit={handleSubmit}>
              <span className="url-icon">↗</span>
              <input
                className="url-input"
                type="text"
                placeholder="yourbusiness.com"
                value={url}
                onChange={e => setUrl(e.target.value)}
                disabled={loading}
              />
              <button className="url-submit" type="submit" disabled={loading}>
                {loading ? "Building..." : "Preview →"}
              </button>
            </form>
            {error && <p className="url-error">{error}</p>}
            {!error && <p className="url-hint">Free. No account needed. ~30 seconds.</p>}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <span className="footer-name">RandyBuilds</span>
        <span className="footer-center">Alberta Web Design · {new Date().getFullYear()}</span>
        <span className="footer-right">hello@randybuilds.ca</span>
      </footer>
    </>
  );
}
