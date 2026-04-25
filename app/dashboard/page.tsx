"use client";
import { useState, useEffect } from "react";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&family=Instrument+Serif:ital@0;1&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{
    --bg:#0b0b09;--bg2:#111110;--bg3:#181816;
    --border:rgba(255,255,255,0.07);--border-glow:rgba(200,169,110,0.25);
    --gold:#c8a96e;--text:#e8e2d8;--text-dim:rgba(232,226,216,0.5);--text-faint:rgba(232,226,216,0.22);
    --serif:'Instrument Serif',Georgia,serif;--sans:'Inter',-apple-system,sans-serif;
  }
  html,body{background:var(--bg);color:var(--text);font-family:var(--sans);min-height:100vh}
  ::selection{background:rgba(200,169,110,0.22)}
  @keyframes fade-up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
  .a1{animation:fade-up .45s ease both}
  .a2{animation:fade-up .45s .06s ease both}
  .a3{animation:fade-up .45s .12s ease both}

  .dash{min-height:100vh;display:flex;flex-direction:column}
  .nav{height:56px;background:rgba(11,11,9,0.92);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 28px;position:sticky;top:0;z-index:100}
  .nav-brand{font-family:var(--serif);font-size:18px;color:var(--text);text-decoration:none;letter-spacing:-.01em}
  .nav-brand span{color:var(--gold)}
  .nav-right{display:flex;align-items:center;gap:12px}
  .btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;border:1px solid var(--border);background:transparent;color:var(--text-dim);transition:all .18s;text-decoration:none}
  .btn:hover{border-color:rgba(200,169,110,0.3);color:var(--text)}

  .content{padding:36px 28px;max-width:1200px;margin:0 auto;width:100%;flex:1}
  .hero{background:linear-gradient(115deg,var(--bg2) 0%,rgba(200,169,110,0.04) 100%);border:1px solid var(--border-glow);border-radius:20px;padding:28px;margin-bottom:28px}
  .hero h1{font-family:var(--serif);font-size:28px;letter-spacing:-.02em;margin-bottom:8px}
  .hero p{font-size:14px;color:var(--text-dim);line-height:1.6}

  .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:28px}
  .stat{background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:20px}
  .stat-label{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-faint);margin-bottom:8px;font-weight:600}
  .stat-val{font-family:var(--serif);font-size:32px;color:var(--text);line-height:1}
  .stat-sub{font-size:12px;color:var(--text-dim);margin-top:8px}

  .section-title{font-family:var(--serif);font-size:17px;letter-spacing:-.01em;margin-bottom:14px}
  .empty{background:var(--bg2);border:1px dashed var(--border);border-radius:14px;padding:40px 28px;text-align:center}
  .empty-icon{font-size:36px;margin-bottom:12px;opacity:.4}
  .empty-text{font-size:14px;color:var(--text-dim);margin-bottom:16px}
  .empty-cta{display:inline-flex;align-items:center;gap:6px;padding:10px 20px;background:var(--gold);color:#0b0b09;border-radius:9px;font-weight:600;font-size:13px;text-decoration:none;cursor:pointer;border:none;transition:opacity .2s}
  .empty-cta:hover{opacity:.9}

  .sites-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}
  .site-card{background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:18px;cursor:pointer;transition:all .2s}
  .site-card:hover{border-color:rgba(200,169,110,0.3);transform:translateY(-2px)}
  .site-name{font-family:var(--serif);font-size:15px;letter-spacing:-.01em;margin-bottom:8px}
  .site-meta{display:flex;align-items:center;justify-content:space-between;font-size:12px;color:var(--text-dim)}
  .site-date{margin-top:12px;padding-top:12px;border-top:1px solid var(--border);font-size:11px;color:var(--text-faint)}

  .loading{display:flex;align-items:center;justify-content:center;height:200px}
  .spinner{width:24px;height:24px;border:2px solid var(--border);border-top-color:var(--gold);border-radius:50%;animation:spin 1s linear infinite}

  @media(max-width:768px){
    .stats{grid-template-columns:1fr}
    .sites-grid{grid-template-columns:1fr}
    .content{padding:20px 16px}
  }
`;

interface SavedSite {
  id: string;
  slug: string;
  business_name: string;
  is_published: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
}

interface Stats {
  total_sites: number;
  total_generations: number;
  total_leads: number;
  published_sites: number;
}

export default function DashboardPage() {
  const [user, setUser] = useState<{ email?: string; name?: string } | null>(null);
  const [sites, setSites] = useState<SavedSite[]>([]);
  const [stats, setStats] = useState<Stats>({ total_sites: 0, total_generations: 0, total_leads: 0, published_sites: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        // Check if user is logged in
        const meRes = await fetch("/api/auth/me");
        if (!meRes.ok) {
          window.location.href = "/login";
          return;
        }

        const userData = await meRes.json();
        setUser(userData);

        // Fetch user's sites
        const sitesRes = await fetch("/api/crm/sites");
        if (sitesRes.ok) {
          const sitesData = await sitesRes.json();
          setSites(sitesData || []);
        }

        // Fetch stats
        const statsRes = await fetch("/api/crm/stats");
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData || { total_sites: 0, total_generations: 0, total_leads: 0, published_sites: 0 });
        }
      } catch (e) {
        console.error("Dashboard init error:", e);
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    window.location.href = "/";
  };

  const handleNewSite = () => {
    window.location.href = "/";
  };

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Dashboard — Sitecraft</title>
        <style>{CSS}</style>
      </head>
      <body>
        <div className="dash">
          {/* NAV */}
          <nav className="nav">
            <a href="/dashboard" className="nav-brand">
              Site<span>craft</span>
            </a>
            <div className="nav-right">
              <button className="btn" onClick={handleNewSite}>
                ✨ New Site
              </button>
              <button className="btn" onClick={handleLogout}>
                Sign Out
              </button>
            </div>
          </nav>

          {/* CONTENT */}
          <div className="content a1">
            {loading ? (
              <div className="loading">
                <div className="spinner" />
              </div>
            ) : error ? (
              <div className="empty">
                <div className="empty-icon">⚠️</div>
                <div className="empty-text">{error}</div>
              </div>
            ) : (
              <>
                {/* HERO */}
                <div className="hero a1">
                  <h1>Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}!</h1>
                  <p>Check your website progress and manage your pipeline below.</p>
                </div>

                {/* STATS */}
                <div className="stats a2">
                  <div className="stat">
                    <div className="stat-label">Total Sites</div>
                    <div className="stat-val">{stats.total_sites}</div>
                    <div className="stat-sub">{stats.published_sites} published</div>
                  </div>
                  <div className="stat">
                    <div className="stat-label">Generations</div>
                    <div className="stat-val">{stats.total_generations}</div>
                    <div className="stat-sub">this month</div>
                  </div>
                  <div className="stat">
                    <div className="stat-label">Leads</div>
                    <div className="stat-val">{stats.total_leads}</div>
                    <div className="stat-sub">in pipeline</div>
                  </div>
                  <div className="stat">
                    <div className="stat-label">Avg. Views</div>
                    <div className="stat-val">
                      {sites.length > 0
                        ? Math.round(sites.reduce((sum, s) => sum + s.view_count, 0) / sites.length)
                        : 0}
                    </div>
                    <div className="stat-sub">per site</div>
                  </div>
                </div>

                {/* SITES */}
                <div className="a3">
                  <h2 className="section-title">Your Sites</h2>
                  {sites.length === 0 ? (
                    <div className="empty">
                      <div className="empty-icon">🎨</div>
                      <div className="empty-text">No sites yet. Create your first AI-powered website.</div>
                      <button className="empty-cta" onClick={handleNewSite}>
                        Start Building
                      </button>
                    </div>
                  ) : (
                    <div className="sites-grid">
                      {sites.map((site) => (
                        <div
                          key={site.id}
                          className="site-card"
                          onClick={() => {
                            window.location.href = `/preview/${site.slug}`;
                          }}
                        >
                          <div className="site-name">{site.business_name}</div>
                          <div className="site-meta">
                            <span>{site.view_count} views</span>
                            <span>{site.is_published ? "🟢 Live" : "🔵 Draft"}</span>
                          </div>
                          <div className="site-date">
                            Updated {new Date(site.updated_at).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
