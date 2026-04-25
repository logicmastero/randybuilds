"use client";
import { useState, useEffect, useCallback } from "react";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&family=Instrument+Serif:ital@0;1&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{
    --bg:#0b0b09;--bg2:#111110;--bg3:#181816;
    --border:rgba(255,255,255,0.07);--border-glow:rgba(200,169,110,0.2);
    --gold:#c8a96e;--gold-l:#d8b97e;--gold-dim:rgba(200,169,110,0.12);
    --text:#e8e2d8;--text-dim:rgba(232,226,216,0.5);--text-faint:rgba(232,226,216,0.22);
    --serif:'Instrument Serif',Georgia,serif;--sans:'Inter',-apple-system,sans-serif;
  }
  html,body{background:var(--bg);color:var(--text);font-family:var(--sans);min-height:100vh}
  ::selection{background:rgba(200,169,110,0.22)}
  @keyframes fade-up{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
  @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
  .a1{animation:fade-up .5s ease both}
  .a2{animation:fade-up .5s .07s ease both}
  .a3{animation:fade-up .5s .14s ease both}

  /* NAV */
  .nav{height:56px;background:rgba(11,11,9,0.92);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 28px;position:sticky;top:0;z-index:100}
  .nav-brand{font-family:var(--serif);font-size:18px;color:var(--text);text-decoration:none;letter-spacing:-.01em}
  .nav-brand span{color:var(--gold)}
  .nav-cta{padding:8px 16px;background:var(--gold);color:#0b0b09;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none}

  /* PAGE */
  .page{max-width:1200px;margin:0 auto;padding:56px 28px 80px}

  /* HERO */
  .hero-label{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--gold);margin-bottom:12px}
  .hero-h1{font-family:var(--serif);font-size:clamp(32px,4.5vw,56px);letter-spacing:-.025em;line-height:1.1;margin-bottom:16px}
  .hero-h1 em{font-style:italic;color:var(--text-dim)}
  .hero-sub{font-size:16px;color:var(--text-dim);line-height:1.65;max-width:560px;margin-bottom:36px}

  /* FILTERS */
  .filters{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:40px;padding-bottom:20px;border-bottom:1px solid var(--border)}
  .filter-btn{padding:7px 14px;border-radius:100px;font-size:12px;font-weight:600;border:1px solid var(--border);background:transparent;color:var(--text-dim);cursor:pointer;transition:all .15s;font-family:var(--sans)}
  .filter-btn:hover{border-color:rgba(200,169,110,0.3);color:var(--text)}
  .filter-btn.active{background:var(--gold-dim);border-color:rgba(200,169,110,0.4);color:var(--gold)}

  /* GRID */
  .gallery-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px;margin-bottom:48px}

  /* CARD */
  .gallery-card{background:var(--bg2);border:1px solid var(--border);border-radius:18px;overflow:hidden;cursor:pointer;transition:all .22s;display:flex;flex-direction:column}
  .gallery-card:hover{border-color:rgba(200,169,110,0.3);transform:translateY(-3px);box-shadow:0 20px 60px rgba(0,0,0,0.5)}
  .card-thumb{width:100%;height:200px;background:var(--bg3);position:relative;overflow:hidden;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px}
  .card-thumb-label{font-size:12px;color:var(--text-faint);font-family:var(--serif);font-style:italic}
  .card-overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(11,11,9,0.8) 0%,transparent 50%);opacity:0;transition:opacity .22s}
  .gallery-card:hover .card-overlay{opacity:1}
  .card-overlay-btn{position:absolute;bottom:16px;left:50%;transform:translateX(-50%);background:var(--gold);color:#0b0b09;padding:8px 20px;border-radius:8px;font-size:12px;font-weight:800;white-space:nowrap;opacity:0;transition:opacity .22s;pointer-events:none}
  .gallery-card:hover .card-overlay-btn{opacity:1}
  .card-body{padding:18px;flex:1;display:flex;flex-direction:column;gap:6px}
  .card-name{font-family:var(--serif);font-size:16px;letter-spacing:-.01em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .card-meta{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
  .badge{display:inline-flex;align-items:center;padding:3px 8px;border-radius:6px;font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase}
  .badge-gold{background:rgba(200,169,110,0.1);color:var(--gold);border:1px solid rgba(200,169,110,0.2)}
  .badge-grey{background:rgba(255,255,255,0.04);color:var(--text-dim);border:1px solid var(--border)}
  .badge-blue{background:rgba(96,165,250,0.08);color:#60a5fa;border:1px solid rgba(96,165,250,0.2)}
  .card-url{font-size:11px;color:var(--text-faint);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .card-views{font-size:11px;color:var(--text-faint);margin-top:auto}

  /* LOAD MORE */
  .load-more-wrap{text-align:center}
  .load-more-btn{padding:13px 32px;border-radius:10px;font-size:14px;font-weight:600;border:1px solid var(--border);background:transparent;color:var(--text-dim);cursor:pointer;transition:all .18s;font-family:var(--sans)}
  .load-more-btn:hover{border-color:rgba(200,169,110,0.3);color:var(--text)}

  /* EMPTY */
  .empty{text-align:center;padding:80px 20px}
  .empty-title{font-family:var(--serif);font-size:22px;color:var(--text-dim);margin-bottom:12px}
  .empty-sub{font-size:14px;color:var(--text-faint);margin-bottom:28px}

  /* SKELETON */
  .skeleton{background:linear-gradient(90deg,var(--bg3) 25%,rgba(255,255,255,0.04) 50%,var(--bg3) 75%);background-size:200% 100%;animation:shimmer 1.6s infinite;border-radius:12px;height:200px}

  /* CTA BAND */
  .cta-band{background:linear-gradient(120deg,rgba(200,169,110,0.07),rgba(200,169,110,0.02));border:1px solid rgba(200,169,110,0.2);border-radius:20px;padding:52px 40px;text-align:center}
  .cta-band h2{font-family:var(--serif);font-size:clamp(26px,3vw,40px);letter-spacing:-.025em;margin-bottom:10px}
  .cta-band p{font-size:15px;color:var(--text-dim);margin-bottom:28px;line-height:1.6}
  .btn-gold{display:inline-flex;align-items:center;gap:8px;padding:14px 28px;border-radius:10px;font-size:14px;font-weight:700;background:var(--gold);color:#0b0b09;border:none;text-decoration:none;transition:background .15s;font-family:var(--sans)}
  .btn-gold:hover{background:var(--gold-l)}

  /* RESPONSIVE */
  @media(max-width:640px){
    .page{padding:32px 16px 60px}
    .gallery-grid{grid-template-columns:1fr}
    .filters{gap:6px}
  }
`;

interface GalleryItem {
  slug: string;
  business_name: string;
  source: string;
  input_url?: string;
  industry?: string;
  view_count: number;
  created_at: string;
  record_type: "preview" | "saved";
}

// Mini color palette from business name for placeholder thumbnail
function nameToColor(name: string): string {
  const palettes = [
    ["#1a1208","#c8a96e"],["#0d1a0d","#4ade80"],["#0a0f1a","#60a5fa"],
    ["#1a0d1a","#c084fc"],["#1a1008","#fb923c"],["#0a1a1a","#22d3ee"],
    ["#1a0d0d","#f87171"],["#121208","#a3e635"],
  ];
  const idx = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % palettes.length;
  return palettes[idx][1];
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
}

export default function GalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [activeIndustry, setActiveIndustry] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchGallery = useCallback(async (cursor?: string, industry?: string | null, append = false) => {
    if (!append) setLoading(true);
    else setLoadingMore(true);
    try {
      const params = new URLSearchParams({ limit: "24" });
      if (cursor) params.set("cursor", cursor);
      if (industry) params.set("industry", industry);
      const res = await fetch(`/api/gallery?${params}`);
      const data = await res.json();
      if (append) setItems(prev => [...prev, ...(data.items || [])]);
      else setItems(data.items || []);
      if (!industry && !cursor) setIndustries(data.industries || []);
      setNextCursor(data.next_cursor || null);
    } catch (e) {
      console.error("[gallery]", e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { fetchGallery(undefined, activeIndustry); }, [activeIndustry, fetchGallery]);

  const handleIndustry = (ind: string | null) => {
    setActiveIndustry(ind);
    setItems([]);
    setNextCursor(null);
  };

  const handleLoadMore = () => {
    if (nextCursor) fetchGallery(nextCursor, activeIndustry, true);
  };

  return (
    <>
      <style>{CSS}</style>
      {/* NAV */}
      <nav className="nav">
        <a href="/" className="nav-brand">Site<span>craft</span></a>
        <a href="/build" className="nav-cta">✦ Build mine free →</a>
      </nav>

      <div className="page">
        {/* HERO */}
        <div className="a1" style={{ marginBottom: 48 }}>
          <div className="hero-label">Gallery</div>
          <h1 className="hero-h1">AI-generated sites,<br /><em>built in seconds.</em></h1>
          <p className="hero-sub">
            Every site below was generated by our AI — from a URL or a plain-English description.
            Click any to preview it, or generate your own for free.
          </p>
        </div>

        {/* FILTERS */}
        {industries.length > 0 && (
          <div className="filters a2">
            <button className={`filter-btn ${activeIndustry === null ? "active" : ""}`} onClick={() => handleIndustry(null)}>
              All
            </button>
            {industries.map(ind => (
              <button key={ind} className={`filter-btn ${activeIndustry === ind ? "active" : ""}`} onClick={() => handleIndustry(ind)}>
                {ind}
              </button>
            ))}
          </div>
        )}

        {/* GRID */}
        {loading ? (
          <div className="gallery-grid a3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} style={{ borderRadius: 18, overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="skeleton" />
                <div style={{ padding: "18px", background: "var(--bg2)", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div className="skeleton" style={{ height: 16, width: "60%" }} />
                  <div className="skeleton" style={{ height: 12, width: "40%" }} />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="empty a3">
            <div className="empty-title">No sites yet</div>
            <p className="empty-sub">Be the first to generate a site and it will appear here.</p>
            <a href="/build" className="btn-gold">✦ Generate a site →</a>
          </div>
        ) : (
          <div className="gallery-grid a3">
            {items.map(item => {
              const accent = nameToColor(item.business_name);
              return (
                <a key={item.slug} href={`/preview/${item.slug}`} className="gallery-card" style={{ textDecoration: "none", color: "inherit" }}>
                  <div className="card-thumb" style={{ background: `radial-gradient(ellipse at 30% 40%, ${accent}18 0%, var(--bg3) 70%)` }}>
                    <div style={{ fontSize: 28, opacity: 0.15, userSelect: "none" }}>🌐</div>
                    <div className="card-thumb-label">{item.business_name}</div>
                    <div className="card-overlay" />
                    <div className="card-overlay-btn">✦ View preview →</div>
                  </div>
                  <div className="card-body">
                    <div className="card-name">{item.business_name}</div>
                    <div className="card-meta">
                      <span className="badge badge-gold">✦ AI</span>
                      {item.industry && <span className="badge badge-grey">{item.industry}</span>}
                      {item.record_type === "saved" && <span className="badge badge-blue">saved</span>}
                    </div>
                    {item.input_url && (
                      <div className="card-url">{item.input_url.replace(/^https?:\/\//, "")}</div>
                    )}
                    <div className="card-views">
                      {item.view_count > 0 ? `${item.view_count} view${item.view_count !== 1 ? "s" : ""}` : ""}
                      {item.view_count > 0 && " · "}{fmtDate(item.created_at)}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}

        {/* LOAD MORE */}
        {nextCursor && !loading && (
          <div className="load-more-wrap" style={{ marginBottom: 60 }}>
            <button className="load-more-btn" onClick={handleLoadMore} disabled={loadingMore}>
              {loadingMore ? "Loading…" : "Load more →"}
            </button>
          </div>
        )}

        {/* CTA BAND */}
        <div className="cta-band">
          <h2>Generate yours in 30 seconds.</h2>
          <p>Enter your business URL or describe what you do. Our AI builds the whole site.</p>
          <a href="/build" className="btn-gold">✦ Build my site free</a>
        </div>
      </div>
    </>
  );
}
