"use client";
import { useState, useEffect, useCallback } from "react";
import { getSupabaseClient } from "../../lib/supabase";
import type { User } from "@supabase/supabase-js";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&family=Instrument+Serif:ital@0;1&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{
    --bg:#0b0b09;--bg2:#111110;--bg3:#181816;--bg4:#1e1e1b;
    --border:rgba(255,255,255,0.07);--border-glow:rgba(200,169,110,0.22);
    --gold:#c8a96e;--gold-l:#d8b97e;--gold-dim:rgba(200,169,110,0.15);
    --text:#e8e2d8;--text-dim:rgba(232,226,216,0.5);--text-faint:rgba(232,226,216,0.22);
    --green:#4ade80;--green-bg:rgba(74,222,128,0.08);
    --blue:#60a5fa;--blue-bg:rgba(96,165,250,0.08);
    --red:rgba(255,80,80,0.85);
    --serif:'Instrument Serif',Georgia,serif;--sans:'Inter',-apple-system,sans-serif;
    --r:14px;
  }
  html,body{background:var(--bg);color:var(--text);font-family:var(--sans);min-height:100vh}
  ::selection{background:rgba(200,169,110,0.22)}
  @keyframes fade-up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
  @keyframes pulse-dot{0%,100%{opacity:1}50%{opacity:.3}}
  .a1{animation:fade-up .45s ease both}
  .a2{animation:fade-up .45s .06s ease both}
  .a3{animation:fade-up .45s .12s ease both}
  .a4{animation:fade-up .45s .18s ease both}
  .a5{animation:fade-up .45s .24s ease both}
  .a6{animation:fade-up .45s .30s ease both}

  /* LAYOUT */
  .dash{min-height:100vh;display:flex;flex-direction:column}

  /* NAV */
  .nav{height:56px;background:rgba(11,11,9,0.92);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 28px;position:sticky;top:0;z-index:100}
  .nav-brand{font-family:var(--serif);font-size:18px;color:var(--text);text-decoration:none;letter-spacing:-.01em}
  .nav-brand span{color:var(--gold)}
  .nav-right{display:flex;align-items:center;gap:10px}
  .user-chip{display:flex;align-items:center;gap:8px}
  .user-av{width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,rgba(200,169,110,0.25),rgba(200,169,110,0.06));border:1px solid rgba(200,169,110,0.25);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:var(--gold);flex-shrink:0;overflow:hidden}
  .user-av img{width:100%;height:100%;object-fit:cover}
  .user-name{font-size:12px;color:var(--text-dim);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;transition:all .18s;font-family:var(--sans);text-decoration:none;border:none}
  .btn-ghost{background:transparent;border:1px solid var(--border);color:var(--text-dim)}
  .btn-ghost:hover{border-color:rgba(200,169,110,0.3);color:var(--text)}
  .btn-gold{background:var(--gold);color:#0b0b09;border:1px solid var(--gold)}
  .btn-gold:hover{background:var(--gold-l)}
  .btn-sm{padding:6px 12px;font-size:12px;border-radius:8px}

  /* CONTENT */
  .content{padding:36px 28px;max-width:1160px;margin:0 auto;width:100%;flex:1}

  /* HERO STRIP */
  .hero-strip{background:linear-gradient(115deg,var(--bg2) 0%,rgba(200,169,110,0.04) 100%);border:1px solid var(--border-glow);border-radius:20px;padding:28px 32px;display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:28px}
  .hero-label{font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--gold);margin-bottom:6px}
  .hero-h1{font-family:var(--serif);font-size:clamp(20px,2.2vw,28px);letter-spacing:-.02em;margin-bottom:4px}
  .hero-sub{font-size:13px;color:var(--text-dim);line-height:1.6}
  .live-dot{display:inline-flex;align-items:center;gap:5px;font-size:11px;color:var(--green);font-weight:600}
  .live-dot::before{content:'';width:6px;height:6px;border-radius:50%;background:var(--green);animation:pulse-dot 2s ease-in-out infinite}

  /* STATS GRID */
  .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:28px}
  .stat{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:20px 22px;transition:border-color .2s}
  .stat:hover{border-color:rgba(200,169,110,0.2)}
  .stat-label{font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--text-faint);margin-bottom:10px}
  .stat-val{font-family:var(--serif);font-size:32px;letter-spacing:-.02em;color:var(--text);line-height:1}
  .stat-sub{font-size:11px;color:var(--text-dim);margin-top:6px}
  .stat-gold .stat-val{color:var(--gold)}
  .stat-green .stat-val{color:var(--green)}

  /* SECTION HEADER */
  .section-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
  .section-title{font-family:var(--serif);font-size:17px;letter-spacing:-.01em}
  .section-count{font-size:12px;color:var(--text-dim);background:var(--bg3);border:1px solid var(--border);border-radius:20px;padding:3px 10px}

  /* PROJECTS GRID */
  .projects-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:14px;margin-bottom:32px}
  .project-card{background:var(--bg2);border:1px solid var(--border);border-radius:16px;overflow:hidden;transition:all .2s;cursor:pointer;display:flex;flex-direction:column}
  .project-card:hover{border-color:rgba(200,169,110,0.25);transform:translateY(-2px);box-shadow:0 12px 40px rgba(0,0,0,0.4)}
  .project-thumb{width:100%;height:140px;background:var(--bg3);border-bottom:1px solid var(--border);overflow:hidden;position:relative}
  .project-thumb iframe{width:200%;height:200%;transform:scale(.5);transform-origin:top left;pointer-events:none;border:none}
  .project-thumb-placeholder{width:100%;height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px}
  .project-thumb-icon{font-size:28px;opacity:.3}
  .project-thumb-name{font-size:11px;color:var(--text-faint)}
  .project-body{padding:16px;flex:1;display:flex;flex-direction:column;gap:8px}
  .project-name{font-family:var(--serif);font-size:15px;letter-spacing:-.01em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .project-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  .badge{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:6px;font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase}
  .badge-gold{background:var(--gold-dim);color:var(--gold);border:1px solid rgba(200,169,110,0.2)}
  .badge-green{background:var(--green-bg);color:var(--green);border:1px solid rgba(74,222,128,0.2)}
  .badge-blue{background:var(--blue-bg);color:var(--blue);border:1px solid rgba(96,165,250,0.2)}
  .badge-grey{background:rgba(255,255,255,0.04);color:var(--text-dim);border:1px solid var(--border)}
  .project-date{font-size:11px;color:var(--text-faint);margin-top:auto}
  .project-actions{display:flex;gap:8px;padding:12px 16px;border-top:1px solid var(--border)}

  /* PIPELINE */
  .pipeline{background:var(--bg2);border:1px solid var(--border);border-radius:16px;overflow:hidden;margin-bottom:28px}
  .pipeline-hdr{padding:18px 22px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
  .pipeline-row{display:flex;align-items:center;padding:14px 22px;border-bottom:1px solid rgba(255,255,255,0.04);transition:background .15s}
  .pipeline-row:last-child{border-bottom:none}
  .pipeline-row:hover{background:rgba(255,255,255,0.02)}
  .pipeline-biz{font-size:14px;font-weight:500;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .pipeline-stage{width:100px;text-align:center}
  .pipeline-city{font-size:12px;color:var(--text-dim);width:120px}
  .pipeline-date{font-size:11px;color:var(--text-faint);width:100px;text-align:right}
  .pipeline-val{font-size:13px;color:var(--gold);width:80px;text-align:right;font-weight:600}

  /* GEN LOG */
  .gen-log{background:var(--bg2);border:1px solid var(--border);border-radius:16px;overflow:hidden;margin-bottom:28px}
  .gen-row{display:flex;align-items:center;gap:14px;padding:11px 20px;border-bottom:1px solid rgba(255,255,255,0.04);font-size:12px}
  .gen-row:last-child{border-bottom:none}
  .gen-input{flex:1;color:var(--text-dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .gen-model{color:var(--text-faint);width:100px}
  .gen-time{color:var(--text-faint);width:80px;text-align:right}
  .gen-ok{color:var(--green)}
  .gen-fail{color:var(--red)}

  /* EMPTY STATE */
  .empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;text-align:center;gap:16px;border:1px dashed rgba(255,255,255,0.08);border-radius:16px}
  .empty-icon{font-size:36px;opacity:.3}
  .empty-title{font-family:var(--serif);font-size:18px;color:var(--text-dim)}
  .empty-sub{font-size:13px;color:var(--text-faint);max-width:300px;line-height:1.6}

  /* NEW SITE MODAL */
  .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:200;padding:20px}
  .modal{background:var(--bg2);border:1px solid var(--border-glow);border-radius:20px;padding:32px;width:100%;max-width:480px;animation:fade-up .3s ease}
  .modal-title{font-family:var(--serif);font-size:22px;margin-bottom:6px}
  .modal-sub{font-size:13px;color:var(--text-dim);margin-bottom:24px;line-height:1.6}
  .tab-row{display:flex;gap:4px;background:var(--bg);border-radius:10px;padding:4px;margin-bottom:20px}
  .tab{flex:1;padding:8px;text-align:center;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;border:none;font-family:var(--sans);color:var(--text-dim);background:transparent}
  .tab.active{background:var(--bg3);color:var(--text);border:1px solid var(--border)}
  .input-wrap{display:flex;flex-direction:column;gap:8px;margin-bottom:20px}
  .input-label{font-size:12px;font-weight:600;color:var(--text-dim);letter-spacing:.04em}
  .inp{width:100%;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:12px 14px;border-radius:10px;font-size:14px;font-family:var(--sans);outline:none;transition:border-color .2s;resize:vertical}
  .inp:focus{border-color:rgba(200,169,110,0.4)}
  .inp::placeholder{color:var(--text-faint)}
  .modal-actions{display:flex;gap:10px;justify-content:flex-end}

  /* LOADING SKELETONS */
  .skeleton{background:linear-gradient(90deg,var(--bg3) 25%,var(--bg4) 50%,var(--bg3) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:8px}

  /* NOTIF */
  .notif{position:fixed;bottom:24px;right:24px;padding:12px 20px;border-radius:12px;font-size:13px;font-weight:600;z-index:999;animation:fade-up .3s ease;pointer-events:none}
  .notif-ok{background:rgba(74,222,128,0.15);border:1px solid rgba(74,222,128,0.3);color:var(--green)}
  .notif-err{background:rgba(255,80,80,0.12);border:1px solid rgba(255,80,80,0.25);color:#ff5050}

  /* RESPONSIVE */
  @media(max-width:768px){
    .content{padding:20px 16px}
    .stats{grid-template-columns:repeat(2,1fr)}
    .hero-strip{flex-direction:column;align-items:flex-start}
    .nav{padding:0 16px}
    .projects-grid{grid-template-columns:1fr}
    .pipeline-city,.pipeline-date,.pipeline-val{display:none}
  }
  @media(max-width:480px){
    .stats{grid-template-columns:1fr 1fr}
  }
`;

interface Project {
  id: string;
  business_name: string;
  slug: string;
  url?: string;
  source: string;
  industry?: string;
  is_published: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
}

interface Lead {
  id: string;
  business_name: string;
  owner_name?: string;
  city?: string;
  stage: string;
  deal_value?: number;
  follow_up_date?: string;
  created_at: string;
}

interface GenLog {
  id: string;
  input_type: string;
  input_value?: string;
  model: string;
  duration_ms?: number;
  success: boolean;
  created_at: string;
}

interface Stats {
  total_sites: number;
  published_sites: number;
  total_leads: number;
  leads_by_stage: Record<string, number>;
  generations: { total: number; today: number; this_week: number; avg_ms: number };
}

const STAGE_LABELS: Record<string, { label: string; cls: string }> = {
  new:       { label: "New",       cls: "badge-grey" },
  contacted: { label: "Contacted", cls: "badge-blue" },
  proposal:  { label: "Proposal",  cls: "badge-gold" },
  closed:    { label: "Closed",    cls: "badge-green" },
  lost:      { label: "Lost",      cls: "badge-grey" },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

function fmtMs(ms?: number) {
  if (!ms) return "—";
  return ms > 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [synced, setSynced] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [genLog, setGenLog] = useState<GenLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [newModal, setNewModal] = useState(false);
  const [newTab, setNewTab] = useState<"url" | "desc">("url");
  const [newInput, setNewInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [notif, setNotif] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [activeSection, setActiveSection] = useState<"sites" | "leads" | "log">("sites");

  const notify = (msg: string, type: "ok" | "err" = "ok") => {
    setNotif({ msg, type });
    setTimeout(() => setNotif(null), 3200);
  };

  const loadData = useCallback(async () => {
    try {
      const [projectsRes, leadsRes, logRes] = await Promise.all([
        fetch("/api/projects/list"),
        fetch("/api/leads/list"),
        fetch("/api/generations/log"),
      ]);
      if (projectsRes.ok) {
        const d = await projectsRes.json();
        setProjects(d.projects || []);
        setStats(d.stats || null);
      }
      if (leadsRes.ok) {
        const d = await leadsRes.json();
        setLeads(d.leads || []);
      }
      if (logRes.ok) {
        const d = await logRes.json();
        setGenLog(d.log || []);
      }
    } catch (e) {
      console.error("[dashboard] load error", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) { setLoading(false); return; }

    const syncUser = async () => {
    try {
      await fetch("/api/auth/sync", { method: "POST" });
      setSynced(true);
    } catch (e) {
      console.error("sync failed", e);
    }
  };

  const init = async () => {
      const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
      if (!session) { window.location.href = "/login"; return; }
      setUser(session.user);
      await loadData();
    };
    syncUser();
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: unknown) => {
      if (event === "SIGNED_OUT" || !session) window.location.href = "/login";
    });
    return () => subscription.unsubscribe();
  }, [loadData]);

  const handleSignOut = async () => {
    const supabase = getSupabaseClient();
    if (supabase) await supabase.auth.signOut();
    window.location.href = "/";
  };

  const handleGenerate = async () => {
    if (!newInput.trim()) return;
    setGenerating(true);
    try {
      const payload = newTab === "url"
        ? { url: newInput.trim() }
        : { description: newInput.trim() };

      const res = await fetch("/api/redesign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Generation failed");

      // Save to user account
      await fetch("/api/projects/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: {
            slug: d.slug,
            businessName: d.businessName,
            html: d.previewHtml,
            source: d.source,
            url: newTab === "url" ? newInput.trim() : undefined,
          },
        }),
      });

      notify(`Site generated for ${d.businessName}`);
      setNewModal(false);
      setNewInput("");
      await loadData();

      if (d.previewUrl) window.open(d.previewUrl, "_blank");
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : "Generation failed", "err");
    } finally {
      setGenerating(false);
    }
  };

  const initials = (name?: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  };

  const avatarUrl = user?.user_metadata?.avatar_url;
  const displayName = user?.user_metadata?.full_name || user?.email || "there";
  const firstName = displayName.split(" ")[0].split("@")[0];

  if (loading) {
    return (
      <>
        <style>{CSS}</style>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", flexDirection: "column", gap: 16 }}>
          <div style={{ width: 28, height: 28, border: "2px solid rgba(200,169,110,0.3)", borderTopColor: "#c8a96e", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <span style={{ fontSize: 13, color: "rgba(232,226,216,0.4)" }}>Loading dashboard…</span>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="dash">

        {/* NAV */}
        <nav className="nav">
          <a href="/" className="nav-brand">Site<span>craft</span></a>
          <div className="nav-right">
            <div className="user-chip">
              <div className="user-av">
                {avatarUrl ? <img src={avatarUrl} alt="" /> : initials(displayName)}
              </div>
              <span className="user-name">{displayName}</span>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setNewModal(true)}>+ New Site</button>
            <button className="btn btn-ghost btn-sm" onClick={handleSignOut}>Sign out</button>
          </div>
        </nav>

        <div className="content">

          {/* HERO STRIP */}
          <div className="hero-strip a1">
            <div>
              <div className="hero-label">Dashboard</div>
              <div className="hero-h1">Welcome back, {firstName}</div>
              <div className="hero-sub">Your AI-generated sites, lead pipeline, and generation activity.</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10, flexShrink: 0 }}>
              <div className="live-dot">Neon Postgres connected</div>
              <button className="btn btn-gold" onClick={() => setNewModal(true)}>
                ✦ Generate new site
              </button>
            </div>
          </div>

          {/* STATS */}
          <div className="stats a2">
            <div className="stat">
              <div className="stat-label">Total Sites</div>
              <div className="stat-val">{stats?.total_sites ?? projects.length}</div>
              <div className="stat-sub">{stats?.published_sites ?? 0} published</div>
            </div>
            <div className="stat stat-gold">
              <div className="stat-label">AI Generations</div>
              <div className="stat-val">{stats?.generations?.total ?? 0}</div>
              <div className="stat-sub">{stats?.generations?.today ?? 0} today · avg {fmtMs(stats?.generations?.avg_ms)}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Leads</div>
              <div className="stat-val">{stats?.total_leads ?? leads.length}</div>
              <div className="stat-sub">
                {stats?.leads_by_stage?.proposal ?? 0} in proposal ·{" "}
                {stats?.leads_by_stage?.closed ?? 0} closed
              </div>
            </div>
            <div className="stat stat-green">
              <div className="stat-label">This Week</div>
              <div className="stat-val">{stats?.generations?.this_week ?? 0}</div>
              <div className="stat-sub">generations this week</div>
            </div>
          </div>

          {/* SECTION TABS */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }} className="a3">
            {(["sites", "leads", "log"] as const).map(s => (
              <button key={s} className={`btn btn-sm ${activeSection === s ? "btn-gold" : "btn-ghost"}`}
                onClick={() => setActiveSection(s)}>
                {s === "sites" ? `Sites (${projects.length})` : s === "leads" ? `Leads (${leads.length})` : `Gen Log (${genLog.length})`}
              </button>
            ))}
          </div>

          {/* SITES */}
          {activeSection === "sites" && (
            <div className="a4">
              <div className="section-hdr">
                <div className="section-title">Your Sites</div>
                <button className="btn btn-ghost btn-sm" onClick={() => setNewModal(true)}>+ New</button>
              </div>
              {projects.length === 0 ? (
                <div className="empty">
                  <div className="empty-icon">🌐</div>
                  <div className="empty-title">No sites yet</div>
                  <div className="empty-sub">Generate your first AI-powered site in 30 seconds. Enter a URL or describe a business.</div>
                  <button className="btn btn-gold" onClick={() => setNewModal(true)}>Generate first site</button>
                </div>
              ) : (
                <div className="projects-grid">
                  {projects.map(p => (
                    <div key={p.id} className="project-card">
                      <div className="project-thumb">
                        <div className="project-thumb-placeholder">
                          <div className="project-thumb-icon">🌐</div>
                          <div className="project-thumb-name">{p.business_name}</div>
                        </div>
                      </div>
                      <div className="project-body">
                        <div className="project-name">{p.business_name}</div>
                        <div className="project-meta">
                          <span className={`badge ${p.source === "claude" ? "badge-gold" : "badge-grey"}`}>
                            {p.source === "claude" ? "✦ AI" : "template"}
                          </span>
                          {p.is_published && <span className="badge badge-green">live</span>}
                          {p.industry && <span className="badge badge-grey">{p.industry}</span>}
                          {p.view_count > 0 && <span className="badge badge-blue">{p.view_count} views</span>}
                        </div>
                        <div className="project-date">{fmtDate(p.updated_at)}</div>
                      </div>
                      <div className="project-actions">
                        <a href={`/preview/${p.slug}`} target="_blank" className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: "center" }}>Preview</a>
                        <a href={`/build?slug=${p.slug}`} className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: "center" }}>Edit</a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* LEADS */}
          {activeSection === "leads" && (
            <div className="a4">
              <div className="section-hdr">
                <div className="section-title">Lead Pipeline</div>
                <span className="section-count">{leads.length} leads</span>
              </div>
              {leads.length === 0 ? (
                <div className="empty">
                  <div className="empty-icon">📋</div>
                  <div className="empty-title">No leads yet</div>
                  <div className="empty-sub">Your CRM pipeline for prospective clients will appear here.</div>
                </div>
              ) : (
                <div className="pipeline">
                  <div className="pipeline-hdr">
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-faint)", letterSpacing: ".08em", textTransform: "uppercase" }}>Business</span>
                    <div style={{ display: "flex", gap: 0 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-faint)", letterSpacing: ".08em", textTransform: "uppercase", width: 100, textAlign: "center" }}>Stage</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-faint)", letterSpacing: ".08em", textTransform: "uppercase", width: 120 }}>City</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-faint)", letterSpacing: ".08em", textTransform: "uppercase", width: 80, textAlign: "right" }}>Value</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-faint)", letterSpacing: ".08em", textTransform: "uppercase", width: 100, textAlign: "right" }}>Follow-up</span>
                    </div>
                  </div>
                  {leads.map(l => {
                    const stg = STAGE_LABELS[l.stage] || { label: l.stage, cls: "badge-grey" };
                    return (
                      <div key={l.id} className="pipeline-row">
                        <div className="pipeline-biz">
                          <div style={{ fontWeight: 500 }}>{l.business_name}</div>
                          {l.owner_name && <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>{l.owner_name}</div>}
                        </div>
                        <div className="pipeline-stage"><span className={`badge ${stg.cls}`}>{stg.label}</span></div>
                        <div className="pipeline-city">{l.city || "—"}</div>
                        <div className="pipeline-val">{l.deal_value ? `$${l.deal_value.toLocaleString()}` : "—"}</div>
                        <div className="pipeline-date">{l.follow_up_date ? fmtDate(l.follow_up_date) : "—"}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* GENERATION LOG */}
          {activeSection === "log" && (
            <div className="a4">
              <div className="section-hdr">
                <div className="section-title">Generation Log</div>
                <span className="section-count">{genLog.length} entries</span>
              </div>
              {genLog.length === 0 ? (
                <div className="empty">
                  <div className="empty-icon">⚡</div>
                  <div className="empty-title">No generations logged yet</div>
                  <div className="empty-sub">Every AI generation will be tracked here with timing and model data.</div>
                </div>
              ) : (
                <div className="gen-log">
                  {genLog.slice(0, 50).map(g => (
                    <div key={g.id} className="gen-row">
                      <span className={g.success ? "gen-ok" : "gen-fail"}>{g.success ? "✓" : "✗"}</span>
                      <span className="badge badge-grey">{g.input_type}</span>
                      <span className="gen-input">{g.input_value || "—"}</span>
                      <span className="gen-model">{g.model?.replace("claude-", "").slice(0, 12)}</span>
                      <span className="gen-time">{fmtMs(g.duration_ms)}</span>
                      <span className="gen-time">{fmtDate(g.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* NEW SITE MODAL */}
      {newModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setNewModal(false); }}>
          <div className="modal">
            <div className="modal-title">Generate a new site</div>
            <div className="modal-sub">Enter a business URL to scrape and redesign, or describe the business in plain English.</div>
            <div className="tab-row">
              <button className={`tab ${newTab === "url" ? "active" : ""}`} onClick={() => setNewTab("url")}>From URL</button>
              <button className={`tab ${newTab === "desc" ? "active" : ""}`} onClick={() => setNewTab("desc")}>From description</button>
            </div>
            <div className="input-wrap">
              <label className="input-label">{newTab === "url" ? "Website URL" : "Describe the business"}</label>
              {newTab === "url" ? (
                <input className="inp" placeholder="https://example.com" value={newInput} onChange={e => setNewInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleGenerate()} autoFocus />
              ) : (
                <textarea className="inp" rows={4} placeholder="e.g. Local plumber in Calgary, family-owned since 1998, specializes in emergency repairs and new home builds"
                  value={newInput} onChange={e => setNewInput(e.target.value)} autoFocus />
              )}
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => { setNewModal(false); setNewInput(""); }}>Cancel</button>
              <button className="btn btn-gold" onClick={handleGenerate} disabled={generating || !newInput.trim()}>
                {generating ? (
                  <><span style={{ width: 14, height: 14, border: "2px solid rgba(0,0,0,0.3)", borderTopColor: "#0b0b09", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" }} /> Generating…</>
                ) : "✦ Generate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {notif && <div className={`notif notif-${notif.type}`}>{notif.msg}</div>}
    </>
  );
}
