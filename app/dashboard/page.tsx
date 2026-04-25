"use client";
import { useState, useEffect } from "react";
import { getSupabaseClient } from "../../lib/supabase";
import type { User } from "@supabase/supabase-js";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&family=Instrument+Serif:ital@0;1&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{
    --bg:#0b0b09;--bg2:#111110;--bg3:#181816;
    --border:rgba(255,255,255,0.07);--border-glow:rgba(200,169,110,0.25);
    --gold:#c8a96e;--gold-l:#d8b97e;
    --text:#e8e2d8;--text-dim:rgba(232,226,216,0.5);--text-faint:rgba(232,226,216,0.22);
    --serif:'Instrument Serif',Georgia,serif;--sans:'Inter',-apple-system,sans-serif;
  }
  html,body{background:var(--bg);color:var(--text);font-family:var(--sans);min-height:100vh}
  ::selection{background:rgba(200,169,110,0.22)}
  @keyframes fade-up{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes pulse-r{0%,100%{opacity:.4;transform:scale(1)}50%{opacity:.9;transform:scale(1.1)}}
  .a1{animation:fade-up .5s ease both}
  .a2{animation:fade-up .5s .07s ease both}
  .a3{animation:fade-up .5s .14s ease both}
  .a4{animation:fade-up .5s .21s ease both}
  .a5{animation:fade-up .5s .28s ease both}
  /* LAYOUT */
  .dash-wrap{min-height:100vh;display:grid;grid-template-rows:56px 1fr}
  /* TOP NAV */
  .top-nav{background:rgba(11,11,9,0.85);backdrop-filter:blur(20px);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 32px;position:sticky;top:0;z-index:50}
  .nav-logo{font-family:var(--serif);font-size:17px;color:var(--text);text-decoration:none}
  .nav-logo span{color:var(--gold)}
  .nav-right{display:flex;align-items:center;gap:16px}
  .user-pill{display:flex;align-items:center;gap:10px}
  .user-av{width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,rgba(200,169,110,0.3),rgba(200,169,110,0.1));border:1px solid rgba(200,169,110,0.3);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--gold)}
  .user-name{font-size:13px;font-weight:500;color:var(--text-dim)}
  .btn-sm{padding:7px 14px;border-radius:8px;font-size:13px;font-weight:600;background:transparent;border:1px solid var(--border);color:var(--text-dim);cursor:pointer;transition:all .2s;font-family:var(--sans)}
  .btn-sm:hover{border-color:rgba(200,169,110,0.3);color:var(--text)}
  .btn-sm.gold{background:var(--gold);color:#0b0b09;border-color:var(--gold)}
  .btn-sm.gold:hover{background:var(--gold-l)}
  /* CONTENT */
  .content{padding:40px 32px;max-width:1100px;margin:0 auto;width:100%}
  /* WELCOME BAND */
  .welcome-band{background:linear-gradient(135deg,var(--bg2) 0%,rgba(200,169,110,0.04) 100%);border:1px solid var(--border-glow);border-radius:18px;padding:32px 36px;display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:36px}
  .wb-left{}
  .wb-label{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--gold);margin-bottom:8px}
  .wb-h1{font-family:var(--serif);font-size:clamp(22px,2.5vw,32px);letter-spacing:-.02em;margin-bottom:6px}
  .wb-sub{font-size:14px;color:var(--text-dim);line-height:1.6}
  /* STATS */
  .stats-row{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:36px}
  .stat-card{background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:24px}
  .stat-val{font-family:var(--serif);font-size:36px;letter-spacing:-.03em;margin-bottom:4px}
  .stat-lbl{font-size:12px;color:var(--text-dim);font-weight:500}
  /* PROJECTS GRID */
  .sec-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}
  .sec-title{font-family:var(--serif);font-size:22px;letter-spacing:-.02em}
  .projects{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}
  .proj-card{background:var(--bg2);border:1px solid var(--border);border-radius:16px;overflow:hidden;cursor:pointer;transition:border-color .25s,transform .2s}
  .proj-card:hover{border-color:rgba(200,169,110,0.25);transform:translateY(-2px)}
  .proj-thumb{height:160px;background:var(--bg3);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:32px;color:var(--text-faint);position:relative;overflow:hidden}
  .proj-thumb-preview{position:absolute;inset:0;transform:scale(0.35) translateY(-90%);transform-origin:top center;pointer-events:none}
  .proj-info{padding:18px 20px}
  .proj-name{font-size:15px;font-weight:600;margin-bottom:4px;letter-spacing:-.01em}
  .proj-meta{font-size:12px;color:var(--text-dim)}
  .proj-tag{display:inline-block;padding:3px 10px;border-radius:100px;font-size:11px;font-weight:600;background:rgba(200,169,110,0.1);color:var(--gold);border:1px solid rgba(200,169,110,0.2);margin-top:10px}
  /* EMPTY STATE */
  .empty{background:var(--bg2);border:1px dashed rgba(255,255,255,0.1);border-radius:18px;padding:60px 40px;text-align:center;grid-column:1/-1}
  .empty-icon{font-size:36px;margin-bottom:16px}
  .empty-title{font-family:var(--serif);font-size:22px;letter-spacing:-.02em;margin-bottom:8px}
  .empty-sub{font-size:14px;color:var(--text-dim);max-width:360px;margin:0 auto 28px;line-height:1.65}
  .btn-gold{display:inline-flex;align-items:center;gap:8px;padding:13px 28px;border-radius:10px;font-size:14px;font-weight:700;letter-spacing:-.01em;background:var(--gold);color:#0b0b09;border:none;cursor:pointer;transition:background .15s,transform .15s;font-family:var(--sans);text-decoration:none}
  .btn-gold:hover{background:var(--gold-l);transform:translateY(-1px)}
  /* NEW PROJECT CARD */
  .new-card{background:transparent;border:1px dashed rgba(255,255,255,0.1);border-radius:16px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;min-height:220px;cursor:pointer;transition:border-color .2s,background .2s;text-decoration:none}
  .new-card:hover{border-color:rgba(200,169,110,0.3);background:rgba(200,169,110,0.03)}
  .new-plus{width:44px;height:44px;border-radius:12px;background:rgba(200,169,110,0.08);border:1px solid rgba(200,169,110,0.2);display:flex;align-items:center;justify-content:center;font-size:22px;color:var(--gold)}
  .new-lbl{font-size:14px;font-weight:600;color:var(--text-dim)}
  /* LOADING */
  .spinner{width:20px;height:20px;border:2px solid rgba(200,169,110,0.2);border-top-color:var(--gold);border-radius:50%;animation:spin .7s linear infinite;margin:0 auto}
  .loading-full{min-height:100vh;display:flex;align-items:center;justify-content:center}
  @media(max-width:768px){
    .stats-row{grid-template-columns:1fr 1fr}
    .content{padding:24px 16px}
    .top-nav{padding:0 16px}
    .welcome-band{flex-direction:column;align-items:flex-start}
    .stat-card:last-child{grid-column:span 2}
  }
`;

interface Project {
  id: string;
  businessName: string;
  sourceUrl: string;
  createdAt: string;
  html?: string;
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseClient();

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = "/login"; return; }
      setUser(session.user);

      // Load saved projects from localStorage (will be Supabase in prod)
      const saved = localStorage.getItem(`sc_projects_${session.user.id}`);
      if (saved) {
        try { setProjects(JSON.parse(saved)); } catch { /* ignore */ }
      }

      setLoading(false);
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") { window.location.href = "/login"; }
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  if (loading) {
    return (
      <div className="loading-full">
        <style>{CSS}</style>
        <div className="spinner" />
      </div>
    );
  }

  const name = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "there";
  const firstName = name.split(" ")[0];
  const initial = firstName[0]?.toUpperCase() || "?";

  return (
    <div className="dash-wrap">
      <style>{CSS}</style>

      {/* NAV */}
      <nav className="top-nav">
        <a href="/" className="nav-logo">Site<span>craft</span></a>
        <div className="nav-right">
          <div className="user-pill">
            <div className="user-av">{initial}</div>
            <span className="user-name">{firstName}</span>
          </div>
          <button className="btn-sm" onClick={handleSignOut}>Sign out</button>
        </div>
      </nav>

      <div className="content">
        {/* WELCOME */}
        <div className="welcome-band a1">
          <div className="wb-left">
            <div className="wb-label">Dashboard</div>
            <div className="wb-h1">Good to have you, {firstName}.</div>
            <div className="wb-sub">Build a new site or continue editing an existing one. Every preview is free.</div>
          </div>
          <a href="/" className="btn-gold">+ New site</a>
        </div>

        {/* STATS */}
        <div className="stats-row a2">
          <div className="stat-card">
            <div className="stat-val">{projects.length}</div>
            <div className="stat-lbl">Sites created</div>
          </div>
          <div className="stat-card">
            <div className="stat-val">0</div>
            <div className="stat-lbl">Sites live</div>
          </div>
          <div className="stat-card">
            <div className="stat-val">∞</div>
            <div className="stat-lbl">Free previews left</div>
          </div>
        </div>

        {/* PROJECTS */}
        <div className="a3">
          <div className="sec-header">
            <div className="sec-title">Your sites</div>
          </div>
          <div className="projects">
            {projects.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">✦</div>
                <div className="empty-title">No sites yet</div>
                <div className="empty-sub">Generate your first free preview in under 60 seconds. Paste a URL or describe your business.</div>
                <a href="/" className="btn-gold">Build my first site →</a>
              </div>
            ) : (
              <>
                {projects.map((p) => (
                  <div key={p.id} className="proj-card" onClick={() => window.location.href = "/build"}>
                    <div className="proj-thumb">✦</div>
                    <div className="proj-info">
                      <div className="proj-name">{p.businessName}</div>
                      <div className="proj-meta">{p.sourceUrl || "Generated from description"}</div>
                      <div className="proj-tag">Draft</div>
                    </div>
                  </div>
                ))}
                <a href="/" className="new-card">
                  <div className="new-plus">+</div>
                  <div className="new-lbl">New site</div>
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
