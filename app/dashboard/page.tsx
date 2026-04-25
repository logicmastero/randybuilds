"use client";
import { useState, useEffect, useCallback } from "react";
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
    --red:rgba(255,80,80,0.85);
  }
  html,body{background:var(--bg);color:var(--text);font-family:var(--sans);min-height:100vh}
  ::selection{background:rgba(200,169,110,0.22)}
  @keyframes fade-up{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
  .a1{animation:fade-up .5s ease both}
  .a2{animation:fade-up .5s .07s ease both}
  .a3{animation:fade-up .5s .14s ease both}
  .a4{animation:fade-up .5s .21s ease both}
  .a5{animation:fade-up .5s .28s ease both}
  /* LAYOUT */
  .dash{min-height:100vh;display:flex;flex-direction:column}
  /* NAV */
  .nav{height:56px;background:rgba(11,11,9,0.9);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 32px;position:sticky;top:0;z-index:100;flex-shrink:0}
  .nav-brand{font-family:var(--serif);font-size:18px;color:var(--text);text-decoration:none;letter-spacing:-.01em}
  .nav-brand span{color:var(--gold)}
  .nav-actions{display:flex;align-items:center;gap:12px}
  .user-chip{display:flex;align-items:center;gap:9px}
  .user-av{width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,rgba(200,169,110,0.25),rgba(200,169,110,0.08));border:1px solid rgba(200,169,110,0.3);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--gold);flex-shrink:0}
  .user-email{font-size:12px;color:var(--text-dim);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .btn-sm{padding:7px 14px;border-radius:8px;font-size:12px;font-weight:600;background:transparent;border:1px solid var(--border);color:var(--text-dim);cursor:pointer;transition:all .2s;font-family:var(--sans);text-decoration:none;display:inline-flex;align-items:center;gap:6px}
  .btn-sm:hover{border-color:rgba(200,169,110,0.3);color:var(--text)}
  .btn-sm.primary{background:var(--gold);color:#0b0b09;border-color:var(--gold)}
  .btn-sm.primary:hover{background:var(--gold-l)}
  /* CONTENT */
  .content{padding:40px 32px;max-width:1140px;margin:0 auto;width:100%;flex:1}
  /* WELCOME */
  .welcome{background:linear-gradient(120deg,var(--bg2),rgba(200,169,110,0.04));border:1px solid var(--border-glow);border-radius:20px;padding:32px 36px;display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:32px}
  .welcome-label{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--gold);margin-bottom:8px}
  .welcome-h1{font-family:var(--serif);font-size:clamp(22px,2.5vw,32px);letter-spacing:-.02em;margin-bottom:6px}
  .welcome-sub{font-size:13px;color:var(--text-dim);line-height:1.65;max-width:440px}
  /* STATS */
  .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:32px}
  .stat{background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:22px 24px}
  .stat-n{font-family:var(--serif);font-size:32px;letter-spacing:-.03em;color:var(--text);margin-bottom:4px;line-height:1}
  .stat-l{font-size:12px;color:var(--text-dim);font-weight:500}
  /* SECTION */
  .sec-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}
  .sec-title{font-family:var(--serif);font-size:20px;letter-spacing:-.02em}
  /* GRID */
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}
  /* PROJECT CARD */
  .proj{background:var(--bg2);border:1px solid var(--border);border-radius:16px;overflow:hidden;transition:border-color .25s,transform .2s,box-shadow .25s;cursor:pointer;text-decoration:none;display:flex;flex-direction:column}
  .proj:hover{border-color:rgba(200,169,110,0.3);transform:translateY(-2px);box-shadow:0 12px 40px rgba(0,0,0,.3)}
  .proj-thumb{height:150px;background:var(--bg3);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:28px;color:var(--text-faint);overflow:hidden;position:relative}
  .proj-thumb-iframe{position:absolute;inset:0;width:300%;height:300%;transform:scale(0.333);transform-origin:top left;pointer-events:none;border:none}
  .proj-body{padding:16px 18px;flex:1;display:flex;flex-direction:column;gap:4px}
  .proj-name{font-size:14px;font-weight:600;color:var(--text);letter-spacing:-.01em}
  .proj-url{font-size:11px;color:var(--text-faint)}
  .proj-footer{padding:12px 18px;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
  .proj-date{font-size:11px;color:var(--text-faint)}
  .proj-badge{font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;padding:3px 9px;border-radius:100px;background:rgba(200,169,110,0.1);color:var(--gold);border:1px solid rgba(200,169,110,0.2)}
  /* NEW PROJECT */
  .new-proj{background:transparent;border:1px dashed rgba(255,255,255,0.1);border-radius:16px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;min-height:220px;cursor:pointer;transition:border-color .2s,background .2s;text-decoration:none}
  .new-proj:hover{border-color:rgba(200,169,110,0.35);background:rgba(200,169,110,0.03)}
  .new-plus{width:40px;height:40px;border-radius:11px;background:rgba(200,169,110,0.08);border:1px solid rgba(200,169,110,0.2);display:flex;align-items:center;justify-content:center;font-size:20px;color:var(--gold)}
  .new-lbl{font-size:13px;font-weight:600;color:var(--text-dim)}
  /* EMPTY */
  .empty{background:var(--bg2);border:1px dashed rgba(255,255,255,0.1);border-radius:18px;padding:60px 40px;text-align:center;grid-column:1/-1}
  .empty-icon{font-size:36px;margin-bottom:16px}
  .empty-h{font-family:var(--serif);font-size:22px;letter-spacing:-.02em;margin-bottom:8px}
  .empty-sub{font-size:14px;color:var(--text-dim);max-width:340px;margin:0 auto 28px;line-height:1.65}
  .btn-gold{display:inline-flex;align-items:center;gap:8px;padding:12px 26px;border-radius:10px;font-size:14px;font-weight:700;background:var(--gold);color:#0b0b09;border:none;cursor:pointer;transition:all .15s;font-family:var(--sans);text-decoration:none}
  .btn-gold:hover{background:var(--gold-l);transform:translateY(-1px)}
  /* LOADING */
  .spinner{width:20px;height:20px;border:2px solid rgba(200,169,110,0.2);border-top-color:var(--gold);border-radius:50%;animation:spin .7s linear infinite;margin:0 auto}
  .loading-full{min-height:100vh;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px}
  .skeleton{background:linear-gradient(90deg,var(--bg2) 25%,var(--bg3) 50%,var(--bg2) 75%);background-size:200% 100%;animation:shimmer 1.4s infinite;border-radius:8px}
  /* MODAL */
  .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);z-index:1000;display:flex;align-items:center;justify-content:center;padding:24px}
  .modal{background:var(--bg2);border:1px solid var(--border);border-radius:20px;width:100%;max-width:560px;padding:36px;position:relative}
  .modal-close{position:absolute;top:18px;right:18px;width:32px;height:32px;border-radius:8px;background:var(--bg3);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:16px;cursor:pointer;color:var(--text-dim);transition:color .15s}
  .modal-close:hover{color:var(--text)}
  .modal-h{font-family:var(--serif);font-size:24px;letter-spacing:-.02em;margin-bottom:6px}
  .modal-sub{font-size:13px;color:var(--text-dim);margin-bottom:24px;line-height:1.6}
  .field{display:flex;flex-direction:column;gap:6px;margin-bottom:14px}
  .field label{font-size:12px;font-weight:600;color:var(--text-dim);letter-spacing:.01em}
  .field input,.field textarea{background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:11px 14px;font-size:14px;color:var(--text);font-family:var(--sans);outline:none;transition:border-color .2s}
  .field input:focus,.field textarea:focus{border-color:rgba(200,169,110,.4)}
  .field textarea{resize:vertical;min-height:80px}
  .field input::placeholder,.field textarea::placeholder{color:var(--text-faint)}
  .tab-row{display:flex;gap:8px;margin-bottom:20px;background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:4px}
  .tab{flex:1;padding:8px;border-radius:7px;font-size:12px;font-weight:600;text-align:center;cursor:pointer;transition:background .15s,color .15s;color:var(--text-dim);border:none;background:none;font-family:var(--sans)}
  .tab.active{background:var(--bg2);color:var(--text);border:1px solid var(--border)}
  /* NOTIFICATION */
  .notif{position:fixed;bottom:24px;right:24px;z-index:2000;padding:12px 20px;border-radius:12px;font-size:13px;font-weight:600;border:1px solid;animation:fade-up .3s ease both;max-width:320px}
  .notif.ok{background:rgba(80,200,120,0.1);border-color:rgba(80,200,120,0.3);color:rgba(80,200,120,.9)}
  .notif.err{background:rgba(255,80,80,0.1);border-color:rgba(255,80,80,0.3);color:rgba(255,80,80,.9)}
  @media(max-width:768px){
    .stats{grid-template-columns:1fr 1fr}
    .content{padding:24px 16px}
    .nav{padding:0 16px}
    .welcome{flex-direction:column;align-items:flex-start;padding:24px}
    .stat:last-child{grid-column:span 2}
    .user-email{display:none}
  }
`;

interface Project {
  id: string;
  business_name?: string;
  businessName?: string;
  source_url?: string;
  sourceUrl?: string;
  preview_url?: string;
  slug?: string;
  created_at?: string;
  updated_at?: string;
  html?: string;
}

function formatDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
}

function Notif({ msg, type, onClose }: { msg: string; type: "ok" | "err"; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  return <div className={`notif ${type}`}>{msg}</div>;
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [newModal, setNewModal] = useState(false);
  const [newTab, setNewTab] = useState<"url" | "desc">("url");
  const [newInput, setNewInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [notif, setNotif] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const supabase = getSupabaseClient();

  const showNotif = (msg: string, type: "ok" | "err" = "ok") => {
    setNotif({ msg, type });
  };

  // ── Load user + projects ──────────────────────────────────────────────────
  const loadProjects = useCallback(async (userId: string) => {
    try {
      const res = await fetch("/api/projects/list");
      if (res.ok) {
        const data = await res.json();
        if (data.projects?.length > 0) {
          setProjects(data.projects);
          return;
        }
      }
    } catch { /* fall through */ }
    // Fallback: localStorage
    const saved = localStorage.getItem(`sc_projects_${userId}`);
    if (saved) {
      try { setProjects(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        window.location.href = "/login";
        return;
      }
      setUser(session.user);
      await loadProjects(session.user.id);
      setLoading(false);
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: unknown) => {
      if (event === "SIGNED_OUT" || !session) {
        window.location.href = "/login";
      }
    });
    return () => subscription.unsubscribe();
  }, [supabase, loadProjects]);

  // ── Generate new preview ──────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!newInput.trim()) return;
    setGenerating(true);
    try {
      const body = newTab === "url"
        ? { scraped: { url: newInput.trim(), businessName: "", description: "", services: [], headline: "", colors: [], images: [] } }
        : { input: newInput.trim(), isDescription: true };

      const r = await fetch("/api/redesign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok || data.error) throw new Error(data.error || "Generation failed");

      // Save to DB
      const project: Project = {
        id: data.slug || `proj_${Date.now()}`,
        businessName: data.businessName,
        business_name: data.businessName,
        source_url: newTab === "url" ? newInput.trim() : undefined,
        preview_url: data.previewUrl,
        slug: data.slug,
        created_at: new Date().toISOString(),
        html: data.previewHtml,
      };

      await fetch("/api/projects/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project }),
      });

      // Also save to localStorage as backup
      const updated = [project, ...projects];
      setProjects(updated);
      if (user) localStorage.setItem(`sc_projects_${user.id}`, JSON.stringify(updated.slice(0, 50)));

      setNewModal(false);
      setNewInput("");
      showNotif(`✅ Preview created for ${data.businessName}`);

      // Navigate to preview
      if (data.previewUrl) window.open(data.previewUrl, "_blank");

    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Generation failed";
      showNotif(msg, "err");
    } finally {
      setGenerating(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/api/auth/signout";
  };

  const displayName = user?.user_metadata?.full_name
    || user?.user_metadata?.name
    || user?.email?.split("@")[0]
    || "there";
  const initials = displayName.slice(0, 2).toUpperCase();

  if (loading) {
    return (
      <>
        <style>{CSS}</style>
        <div className="loading-full">
          <div className="spinner" />
          <div style={{ fontSize: "13px", color: "rgba(232,226,216,0.3)" }}>Loading your dashboard...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{CSS}</style>
      {notif && <Notif msg={notif.msg} type={notif.type} onClose={() => setNotif(null)} />}

      <div className="dash">
        {/* NAV */}
        <nav className="nav">
          <a href="/" className="nav-brand">Site<span>craft</span></a>
          <div className="nav-actions">
            <div className="user-chip">
              <div className="user-av">{initials}</div>
              <span className="user-email">{user?.email}</span>
            </div>
            <button className="btn-sm" onClick={handleSignOut}>Sign out</button>
            <button className="btn-sm primary" onClick={() => setNewModal(true)}>+ New site</button>
          </div>
        </nav>

        {/* CONTENT */}
        <div className="content">
          {/* WELCOME */}
          <div className="welcome a1">
            <div>
              <div className="welcome-label">Dashboard</div>
              <div className="welcome-h1">Welcome back, {displayName.split(" ")[0]}.</div>
              <div className="welcome-sub">
                Generate a preview in 60 seconds — paste a URL or describe any business.
              </div>
            </div>
            <button className="btn-gold" onClick={() => setNewModal(true)}>
              ✦ Generate new site
            </button>
          </div>

          {/* STATS */}
          <div className="stats a2">
            <div className="stat">
              <div className="stat-n">{projects.length}</div>
              <div className="stat-l">Sites generated</div>
            </div>
            <div className="stat">
              <div className="stat-n">{projects.length > 0 ? "Active" : "Ready"}</div>
              <div className="stat-l">Account status</div>
            </div>
            <div className="stat">
              <div className="stat-n">Free</div>
              <div className="stat-l">Current plan</div>
            </div>
          </div>

          {/* PROJECTS */}
          <div className="sec-head a3">
            <div className="sec-title">Your sites</div>
            {projects.length > 0 && (
              <button className="btn-sm" onClick={() => setNewModal(true)}>+ New</button>
            )}
          </div>

          <div className="grid a4">
            {projects.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">✦</div>
                <div className="empty-h">No sites yet</div>
                <div className="empty-sub">
                  Generate your first site preview in 60 seconds — paste a URL or describe any business.
                </div>
                <button className="btn-gold" onClick={() => setNewModal(true)}>
                  Generate your first site →
                </button>
              </div>
            ) : (
              <>
                {projects.map((p) => (
                  <a
                    key={p.id}
                    className="proj"
                    href={p.preview_url || p.slug ? `/preview/${p.slug || p.id}` : "#"}
                    target={p.preview_url ? "_blank" : undefined}
                    rel="noopener noreferrer"
                  >
                    <div className="proj-thumb">
                      {p.html ? (
                        <iframe
                          className="proj-thumb-iframe"
                          srcDoc={p.html}
                          title={p.business_name || p.businessName}
                          sandbox="allow-same-origin"
                        />
                      ) : "🌐"}
                    </div>
                    <div className="proj-body">
                      <div className="proj-name">{p.business_name || p.businessName || "Unnamed site"}</div>
                      <div className="proj-url">{p.source_url || p.sourceUrl || "Generated from description"}</div>
                    </div>
                    <div className="proj-footer">
                      <span className="proj-date">{formatDate(p.updated_at || p.created_at)}</span>
                      <span className="proj-badge">Preview</span>
                    </div>
                  </a>
                ))}
                <button className="new-proj" onClick={() => setNewModal(true)}>
                  <div className="new-plus">+</div>
                  <div className="new-lbl">New site</div>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* NEW SITE MODAL */}
      {newModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setNewModal(false); }}>
          <div className="modal">
            <button className="modal-close" onClick={() => setNewModal(false)}>✕</button>
            <div className="modal-h">Generate a site</div>
            <div className="modal-sub">Paste a URL to redesign, or describe the business you want to build for.</div>

            <div className="tab-row">
              <button className={`tab ${newTab === "url" ? "active" : ""}`} onClick={() => setNewTab("url")}>From URL</button>
              <button className={`tab ${newTab === "desc" ? "active" : ""}`} onClick={() => setNewTab("desc")}>From description</button>
            </div>

            {newTab === "url" ? (
              <div className="field">
                <label>Website URL</label>
                <input
                  type="url"
                  placeholder="https://their-current-site.com"
                  value={newInput}
                  onChange={e => setNewInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleGenerate()}
                  autoFocus
                />
              </div>
            ) : (
              <div className="field">
                <label>Business description</label>
                <textarea
                  placeholder="Residential plumber in Calgary, 24/7 emergency service, drain cleaning, hot water tanks..."
                  value={newInput}
                  onChange={e => setNewInput(e.target.value)}
                  autoFocus
                />
              </div>
            )}

            <button
              className="btn-gold"
              style={{ width: "100%", justifyContent: "center", fontSize: "14px", marginTop: "4px" }}
              onClick={handleGenerate}
              disabled={generating || !newInput.trim()}
            >
              {generating ? "Generating..." : "Generate preview →"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
