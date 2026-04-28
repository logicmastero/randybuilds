"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Site {
  id: string;
  slug: string;
  business_name: string;
  title?: string;
  description?: string;
  url?: string;
  html?: string;
  is_published: boolean;
  thumbnail_url?: string;
  industry?: string;
  color_scheme?: string;
  view_count?: number;
  created_at: string;
  updated_at: string;
  custom_domain?: string;
  seo_title?: string;
  seo_description?: string;
  analytics_id?: string;
  password_protected?: boolean;
  site_password?: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  plan?: string;
}

interface Analytics {
  total_generations?: number;
  total_views?: number;
  total_leads?: number;
  recent_activity?: { label: string; time: string }[];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Avatar({ user, size = 32 }: { user: User; size?: number }) {
  if (user.avatar_url) {
    return <img src={user.avatar_url} alt={user.name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }} />;
  }
  const initials = (user.name || user.email || "U").slice(0, 2).toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "linear-gradient(135deg,#c8a96e,#a07840)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.38, fontWeight: 700, color: "#0a0a08", flexShrink: 0 }}>
      {initials}
    </div>
  );
}

function SiteCard({ site, active, onClick, onEdit, onDelete }: { site: Site; active: boolean; onClick: () => void; onEdit: () => void; onDelete: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    if (menuOpen) document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  const updated = new Date(site.updated_at);
  const timeAgo = (() => {
    const diff = Date.now() - updated.getTime();
    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`;
    return `${Math.floor(diff/86400000)}d ago`;
  })();

  return (
    <div onClick={onClick}
      style={{ background: active ? "rgba(200,169,110,.07)" : "#0e0d0b", border: `1px solid ${active ? "rgba(200,169,110,.25)" : "#1a1810"}`, borderRadius: 12, padding: "14px 14px 12px", cursor: "pointer", transition: "all .15s", position: "relative" }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLDivElement).style.borderColor = "#2a2820"; }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLDivElement).style.borderColor = "#1a1810"; }}>

      {/* Thumbnail / placeholder */}
      <div style={{ width: "100%", aspectRatio: "16/9", borderRadius: 8, background: "#111", marginBottom: 10, overflow: "hidden", position: "relative" }}>
        {site.thumbnail_url
          ? <img src={site.thumbnail_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 22 }}>🌐</span>
              <span style={{ fontSize: 10, color: "#2a2820" }}>{site.industry || "website"}</span>
            </div>
        }
        {/* Published badge */}
        <div style={{ position: "absolute", top: 6, right: 6, background: site.is_published ? "rgba(34,197,94,.2)" : "rgba(30,28,24,.8)", border: `1px solid ${site.is_published ? "rgba(34,197,94,.4)" : "#2a2820"}`, borderRadius: 20, padding: "2px 8px", fontSize: 10, color: site.is_published ? "#4ade80" : "#3a3830", fontWeight: 600 }}>
          {site.is_published ? "Published" : "Draft"}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: active ? "#e8e0d0" : "#c0b8a8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{site.business_name}</div>
          <div style={{ fontSize: 11, color: "#2a2820", marginTop: 2 }}>{timeAgo}</div>
        </div>
        {/* Kebab menu */}
        <div ref={menuRef} style={{ position: "relative", flexShrink: 0 }}>
          <button onClick={e => { e.stopPropagation(); setMenuOpen(p => !p); }}
            style={{ width: 26, height: 26, borderRadius: 6, border: "none", background: menuOpen ? "#1a1810" : "transparent", cursor: "pointer", color: "#3a3830", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", transition: "all .1s" }}
            onMouseEnter={e => { (e.currentTarget).style.background="#1a1810"; (e.currentTarget).style.color="#c8a96e"; }}
            onMouseLeave={e => { if (!menuOpen) { (e.currentTarget).style.background="transparent"; (e.currentTarget).style.color="#3a3830"; } }}>
            ···
          </button>
          {menuOpen && (
            <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", background: "#111", border: "1px solid #1a1810", borderRadius: 10, overflow: "hidden", width: 140, zIndex: 100, boxShadow: "0 8px 30px rgba(0,0,0,.6)" }}>
              {[
                { label: "Open Editor", action: () => { window.location.href = `/?site=${site.id}`; } },
                { label: "Site Settings", action: () => { setMenuOpen(false); onEdit(); } },
                { label: site.is_published ? "Unpublish" : "Publish", action: () => { setMenuOpen(false); } },
                { label: "Duplicate", action: () => { setMenuOpen(false); } },
                { label: "Delete", action: () => { setMenuOpen(false); onDelete(); }, danger: true },
              ].map((item, i) => (
                <button key={i} onClick={e => { e.stopPropagation(); item.action(); }}
                  style={{ width: "100%", padding: "9px 14px", background: "transparent", border: "none", cursor: "pointer", fontSize: 13, color: (item as any).danger ? "#f87171" : "#b0a898", textAlign: "left", fontFamily: "inherit", transition: "background .1s", borderBottom: i < 4 ? "1px solid #161410" : "none" }}
                  onMouseEnter={e => { (e.currentTarget).style.background="#1a1810"; }}
                  onMouseLeave={e => { (e.currentTarget).style.background="transparent"; }}>
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Settings panels ──────────────────────────────────────────────────────────

function SiteSettings({ site, onSave, saving }: { site: Site; onSave: (data: Partial<Site>) => Promise<void>; saving: boolean }) {
  const [tab, setTab] = useState<"general"|"domain"|"seo"|"access"|"danger">("general");
  const [form, setForm] = useState({
    business_name: site.business_name || "",
    description: site.description || "",
    seo_title: site.seo_title || "",
    seo_description: site.seo_description || "",
    custom_domain: site.custom_domain || "",
    analytics_id: site.analytics_id || "",
    password_protected: site.password_protected || false,
    site_password: "",
    is_published: site.is_published,
  });
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [domainStep, setDomainStep] = useState<"input"|"instructions">("input");

  const update = (k: string, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const TABS = [
    { id: "general", label: "General", icon: "◈" },
    { id: "domain", label: "Domain", icon: "🌐" },
    { id: "seo", label: "SEO", icon: "🔍" },
    { id: "access", label: "Access", icon: "🔒" },
    { id: "danger", label: "Danger", icon: "⚠" },
  ];

  const dnsHost = form.custom_domain ? form.custom_domain.replace(/^www\./,"") : "yourdomain.com";
  const cname_target = "cname.sitecraft.app";

  return (
    <div style={{ display: "flex", height: "100%", minHeight: 0 }}>
      {/* Settings sidebar */}
      <div style={{ width: 160, flexShrink: 0, borderRight: "1px solid #161410", padding: "20px 0" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
            style={{ width: "100%", padding: "10px 16px", background: tab === t.id ? "rgba(200,169,110,.08)" : "transparent", border: "none", borderRight: tab === t.id ? "2px solid #c8a96e" : "2px solid transparent", cursor: "pointer", fontSize: 13, color: tab === t.id ? "#c8a96e" : "#3a3830", textAlign: "left", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8, transition: "all .1s" }}
            onMouseEnter={e => { if (tab !== t.id) (e.currentTarget).style.color = "#e8e0d0"; }}
            onMouseLeave={e => { if (tab !== t.id) (e.currentTarget).style.color = "#3a3830"; }}>
            <span style={{ fontSize: 14 }}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* Settings content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>

        {/* ── GENERAL ── */}
        {tab === "general" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#e8e0d0", marginBottom: 4 }}>General Settings</div>
              <div style={{ fontSize: 13, color: "#3a3830" }}>Basic info about your site</div>
            </div>

            <Field label="Site Name" hint="Shown in your dashboard and browser tab">
              <Input value={form.business_name} onChange={v => update("business_name", v)} placeholder="Rocky Mountain Plumbing" />
            </Field>

            <Field label="Description" hint="A short description of your business">
              <Textarea value={form.description} onChange={v => update("description", v)} placeholder="Residential and commercial plumbing services in Calgary, AB" />
            </Field>

            <Field label="Status">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Toggle value={form.is_published} onChange={v => update("is_published", v)} />
                <span style={{ fontSize: 13, color: form.is_published ? "#4ade80" : "#3a3830" }}>
                  {form.is_published ? "Published — live on the web" : "Draft — not publicly visible"}
                </span>
              </div>
            </Field>

            <Field label="Live URL" hint="Your site's Sitecraft URL">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, background: "#0d0c0a", border: "1px solid #1a1810", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "#3a3830", fontFamily: "monospace" }}>
                  sitecraft.app/s/{site.slug}
                </div>
                <CopyButton text={`https://sitecraft.app/s/${site.slug}`} />
              </div>
            </Field>

            <SaveBtn onClick={() => onSave({ business_name: form.business_name, description: form.description, is_published: form.is_published })} saving={saving} />
          </div>
        )}

        {/* ── DOMAIN ── */}
        {tab === "domain" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#e8e0d0", marginBottom: 4 }}>Custom Domain</div>
              <div style={{ fontSize: 13, color: "#3a3830" }}>Connect your own domain to this site</div>
            </div>

            {/* Free subdomain */}
            <div style={{ background: "#0d0c0a", border: "1px solid #1a1810", borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ fontSize: 11, color: "#3a3830", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 8 }}>Free Sitecraft Subdomain</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, fontFamily: "monospace", fontSize: 13, color: "#c8a96e" }}>sitecraft.app/s/{site.slug}</div>
                <CopyButton text={`https://sitecraft.app/s/${site.slug}`} />
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, height: 1, background: "#1a1810" }} />
              <span style={{ fontSize: 11, color: "#2a2820" }}>OR CONNECT YOUR OWN</span>
              <div style={{ flex: 1, height: 1, background: "#1a1810" }} />
            </div>

            {domainStep === "input" ? (
              <>
                <Field label="Your Domain" hint="Enter your domain (e.g. myplumbingco.com)">
                  <div style={{ display: "flex", gap: 8 }}>
                    <Input value={form.custom_domain} onChange={v => update("custom_domain", v)} placeholder="myplumbingco.com" />
                    <button onClick={() => { if (form.custom_domain) setDomainStep("instructions"); }}
                      style={{ padding: "0 16px", background: "rgba(200,169,110,.1)", border: "1px solid rgba(200,169,110,.2)", borderRadius: 8, color: "#c8a96e", cursor: "pointer", fontSize: 13, fontFamily: "inherit", fontWeight: 600, flexShrink: 0, whiteSpace: "nowrap" }}>
                      Get DNS Records
                    </button>
                  </div>
                </Field>

                {site.custom_domain && (
                  <StatusBadge status="pending" label={`${site.custom_domain} — Pending verification`} />
                )}
              </>
            ) : (
              <>
                <div style={{ background: "#0d0c0a", border: "1px solid rgba(200,169,110,.15)", borderRadius: 10, padding: "16px 18px" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#c8a96e", marginBottom: 12 }}>DNS Configuration for {form.custom_domain}</div>
                  <div style={{ fontSize: 12, color: "#3a3830", marginBottom: 12 }}>Add these records to your DNS provider (GoDaddy, Namecheap, Cloudflare, etc.)</div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                      { type: "CNAME", name: "www", value: cname_target, ttl: "3600" },
                      { type: "CNAME", name: "@", value: cname_target, ttl: "3600" },
                    ].map((record, i) => (
                      <div key={i} style={{ background: "#111", borderRadius: 8, padding: "10px 12px", display: "grid", gridTemplateColumns: "60px 80px 1fr 80px", gap: 8, fontSize: 12, fontFamily: "monospace", alignItems: "center" }}>
                        <span style={{ color: "#c8a96e", fontWeight: 700 }}>{record.type}</span>
                        <span style={{ color: "#b0a898" }}>{record.name}</span>
                        <span style={{ color: "#e8e0d0", overflow: "hidden", textOverflow: "ellipsis" }}>{record.value}</span>
                        <span style={{ color: "#3a3830" }}>{record.ttl}s</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 14, padding: "10px 12px", background: "rgba(251,191,36,.05)", border: "1px solid rgba(251,191,36,.1)", borderRadius: 8, fontSize: 12, color: "#a8924e", display: "flex", gap: 8 }}>
                    <span>⏳</span>
                    <span>DNS changes can take 5 min – 24 hours to propagate globally. We'll verify automatically.</span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setDomainStep("input")} style={{ flex: 1, padding: "10px 0", background: "transparent", border: "1px solid #1a1810", borderRadius: 8, color: "#3a3830", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
                    ← Back
                  </button>
                  <SaveBtn label="Save Domain" onClick={() => onSave({ custom_domain: form.custom_domain })} saving={saving} />
                </div>
              </>
            )}
          </div>
        )}

        {/* ── SEO ── */}
        {tab === "seo" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#e8e0d0", marginBottom: 4 }}>SEO Settings</div>
              <div style={{ fontSize: 13, color: "#3a3830" }}>Control how your site appears in search results</div>
            </div>

            <Field label="SEO Title" hint="Shown in browser tab and Google results (50–60 chars)">
              <Input value={form.seo_title} onChange={v => update("seo_title", v)} placeholder={`${form.business_name || "My Business"} — Calgary, AB`} maxLength={60} />
              <CharCount value={form.seo_title} max={60} />
            </Field>

            <Field label="Meta Description" hint="Shown under the link in Google results (150–160 chars)">
              <Textarea value={form.seo_description} onChange={v => update("seo_description", v)} placeholder="Professional plumbing services in Calgary. Available 24/7 for emergencies. Call for a free estimate." maxLength={160} />
              <CharCount value={form.seo_description} max={160} />
            </Field>

            {/* SERP Preview */}
            <div style={{ background: "#0d0c0a", border: "1px solid #1a1810", borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ fontSize: 11, color: "#3a3830", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 10 }}>Google Preview</div>
              <div style={{ fontSize: 16, color: "#8ab4f8", marginBottom: 2 }}>
                {form.seo_title || form.business_name || "Your Business Name"}
              </div>
              <div style={{ fontSize: 12, color: "#4ade80", marginBottom: 4 }}>
                https://sitecraft.app/s/{site.slug}
              </div>
              <div style={{ fontSize: 13, color: "#9aa0a6", lineHeight: 1.5 }}>
                {form.seo_description || "Add a meta description to appear here in search results."}
              </div>
            </div>

            <Field label="Google Analytics ID" hint="Paste your GA4 Measurement ID (e.g. G-XXXXXXXXXX)">
              <Input value={form.analytics_id} onChange={v => update("analytics_id", v)} placeholder="G-XXXXXXXXXX" />
            </Field>

            <SaveBtn onClick={() => onSave({ seo_title: form.seo_title, seo_description: form.seo_description, analytics_id: form.analytics_id })} saving={saving} />
          </div>
        )}

        {/* ── ACCESS ── */}
        {tab === "access" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#e8e0d0", marginBottom: 4 }}>Access Control</div>
              <div style={{ fontSize: 13, color: "#3a3830" }}>Control who can see your site</div>
            </div>

            <div style={{ background: "#0d0c0a", border: "1px solid #1a1810", borderRadius: 10, overflow: "hidden" }}>
              {[
                { label: "Public", desc: "Anyone with the link can view", value: "public" },
                { label: "Password Protected", desc: "Visitors need a password to access", value: "password" },
                { label: "Private (Draft)", desc: "Only visible to you", value: "private" },
              ].map((opt, i) => {
                const isSel = opt.value === "password" ? form.password_protected : opt.value === "private" ? !form.is_published : form.is_published && !form.password_protected;
                return (
                  <div key={i} onClick={() => {
                    if (opt.value === "public") { update("is_published", true); update("password_protected", false); }
                    if (opt.value === "password") { update("is_published", true); update("password_protected", true); }
                    if (opt.value === "private") { update("is_published", false); update("password_protected", false); }
                  }} style={{ padding: "14px 16px", borderBottom: i < 2 ? "1px solid #161410" : "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, background: isSel ? "rgba(200,169,110,.05)" : "transparent", transition: "background .1s" }}>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${isSel ? "#c8a96e" : "#2a2820"}`, background: isSel ? "rgba(200,169,110,.2)" : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {isSel && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#c8a96e" }} />}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: isSel ? "#e8e0d0" : "#b0a898" }}>{opt.label}</div>
                      <div style={{ fontSize: 12, color: "#3a3830" }}>{opt.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {form.password_protected && (
              <Field label="Password" hint="Visitors must enter this to access your site">
                <Input type="password" value={form.site_password} onChange={v => update("site_password", v)} placeholder="Enter a password for your site" />
              </Field>
            )}

            <SaveBtn onClick={() => onSave({ is_published: form.is_published, password_protected: form.password_protected, site_password: form.site_password || undefined })} saving={saving} />
          </div>
        )}

        {/* ── DANGER ZONE ── */}
        {tab === "danger" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#f87171", marginBottom: 4 }}>Danger Zone</div>
              <div style={{ fontSize: 13, color: "#3a3830" }}>Irreversible actions — be careful</div>
            </div>

            <div style={{ background: "rgba(248,113,113,.04)", border: "1px solid rgba(248,113,113,.15)", borderRadius: 10, padding: "16px 18px" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#e8e0d0", marginBottom: 4 }}>Delete this site</div>
              <div style={{ fontSize: 13, color: "#3a3830", marginBottom: 14 }}>
                This will permanently delete <strong style={{ color: "#e8e0d0" }}>{site.business_name}</strong> and all its content. This cannot be undone.
              </div>
              <Field label={`Type "${site.business_name}" to confirm`}>
                <Input value={deleteConfirm} onChange={setDeleteConfirm} placeholder={site.business_name} />
              </Field>
              <button disabled={deleteConfirm !== site.business_name}
                style={{ marginTop: 12, padding: "10px 18px", background: deleteConfirm === site.business_name ? "rgba(248,113,113,.15)" : "transparent", border: `1px solid ${deleteConfirm === site.business_name ? "rgba(248,113,113,.4)" : "#1a1810"}`, borderRadius: 8, color: deleteConfirm === site.business_name ? "#f87171" : "#3a3830", cursor: deleteConfirm === site.business_name ? "pointer" : "default", fontSize: 13, fontFamily: "inherit", fontWeight: 600, transition: "all .15s" }}
                onClick={() => onSave({ business_name: "__DELETE__" })}>
                Delete Site Permanently
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Small form helpers ───────────────────────────────────────────────────────
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: "#c0b8a8" }}>{label}</label>
      {hint && <span style={{ fontSize: 11, color: "#2a2820", marginTop: -4 }}>{hint}</span>}
      {children}
    </div>
  );
}
function Input({ value, onChange, placeholder, type="text", maxLength }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string; maxLength?: number }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength}
      style={{ background: "#0d0c0a", border: "1px solid #1a1810", borderRadius: 8, padding: "10px 12px", color: "#e8e0d0", fontSize: 13, fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box" as const, transition: "border-color .15s" }}
      onFocus={e => { e.target.style.borderColor = "rgba(200,169,110,.3)"; }}
      onBlur={e => { e.target.style.borderColor = "#1a1810"; }}
    />
  );
}
function Textarea({ value, onChange, placeholder, maxLength }: { value: string; onChange: (v: string) => void; placeholder?: string; maxLength?: number }) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} rows={3}
      style={{ background: "#0d0c0a", border: "1px solid #1a1810", borderRadius: 8, padding: "10px 12px", color: "#e8e0d0", fontSize: 13, fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box" as const, resize: "vertical", transition: "border-color .15s" }}
      onFocus={e => { e.target.style.borderColor = "rgba(200,169,110,.3)"; }}
      onBlur={e => { e.target.style.borderColor = "#1a1810"; }}
    />
  );
}
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!value)} style={{ width: 44, height: 24, borderRadius: 12, background: value ? "rgba(200,169,110,.3)" : "#1a1810", border: `1px solid ${value ? "rgba(200,169,110,.5)" : "#2a2820"}`, cursor: "pointer", position: "relative", transition: "all .2s", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 3, left: value ? 22 : 2, width: 16, height: 16, borderRadius: "50%", background: value ? "#c8a96e" : "#3a3830", transition: "left .2s" }} />
    </div>
  );
}
function CharCount({ value, max }: { value: string; max: number }) {
  const len = value.length;
  const color = len > max * .9 ? (len > max ? "#f87171" : "#fbbf24") : "#3a3830";
  return <div style={{ fontSize: 11, color, textAlign: "right", marginTop: -4 }}>{len}/{max}</div>;
}
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      style={{ padding: "8px 12px", background: copied ? "rgba(74,222,128,.1)" : "transparent", border: `1px solid ${copied ? "rgba(74,222,128,.3)" : "#1a1810"}`, borderRadius: 8, color: copied ? "#4ade80" : "#3a3830", cursor: "pointer", fontSize: 12, fontFamily: "inherit", flexShrink: 0, transition: "all .15s" }}>
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}
function SaveBtn({ onClick, saving, label = "Save Changes" }: { onClick: () => void; saving: boolean; label?: string }) {
  return (
    <button onClick={onClick} disabled={saving}
      style={{ padding: "10px 20px", background: saving ? "transparent" : "linear-gradient(135deg,#c8a96e,#a87030)", border: saving ? "1px solid #1a1810" : "none", borderRadius: 9, color: saving ? "#3a3830" : "#0a0a08", cursor: saving ? "default" : "pointer", fontSize: 13, fontFamily: "inherit", fontWeight: 700, transition: "all .15s", width: "fit-content" }}>
      {saving ? "Saving…" : label}
    </button>
  );
}
function StatusBadge({ status, label }: { status: "ok" | "pending" | "error"; label: string }) {
  const colors = { ok: { bg: "rgba(74,222,128,.1)", border: "rgba(74,222,128,.3)", text: "#4ade80" }, pending: { bg: "rgba(251,191,36,.05)", border: "rgba(251,191,36,.2)", text: "#fbbf24" }, error: { bg: "rgba(248,113,113,.05)", border: "rgba(248,113,113,.2)", text: "#f87171" } };
  const c = colors[status];
  return <div style={{ padding: "8px 12px", background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, fontSize: 12, color: c.text }}>{label}</div>;
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [activeSiteId, setActiveSiteId] = useState<string | null>(null);
  const [view, setView] = useState<"sites"|"analytics"|"account">("sites");
  const [sitePanel, setSitePanel] = useState<"overview"|"editor"|"settings">("overview");
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [deleteModal, setDeleteModal] = useState<Site | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const activeSite = sites.find(s => s.id === activeSiteId) || null;

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [meRes, sitesRes, statsRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/projects/list"),
          fetch("/api/crm/stats"),
        ]);
        if (!meRes.ok) { router.push("/login"); return; }
        const [meData, sitesData, statsData] = await Promise.all([meRes.json(), sitesRes.json(), statsRes.json()]);
        setUser(meData);
        const siteList = sitesData.projects || sitesData.sites || [];
        setSites(siteList);
        if (siteList.length > 0) setActiveSiteId(siteList[0].id);
        setAnalytics(statsData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  // ── Load active site HTML for preview ──────────────────────────────────────
  useEffect(() => {
    if (!activeSite?.html || !iframeRef.current) return;
    const doc = iframeRef.current.contentDocument ?? iframeRef.current.contentWindow?.document;
    if (!doc) return;
    doc.open(); doc.write(activeSite.html); doc.close();
  }, [activeSite?.html, activeSite?.id]);

  // ── Fetch full site data when selected ─────────────────────────────────────
  const loadSiteDetail = useCallback(async (id: string) => {
    const res = await fetch(`/api/sites/${id}`);
    if (!res.ok) return;
    const { site } = await res.json();
    setSites(prev => prev.map(s => s.id === id ? { ...s, ...site } : s));
  }, []);

  const handleSelectSite = useCallback((id: string) => {
    setActiveSiteId(id);
    setSitePanel("overview");
    loadSiteDetail(id);
  }, [loadSiteDetail]);

  // ── Save site settings ─────────────────────────────────────────────────────
  const handleSaveSettings = useCallback(async (data: Partial<Site>) => {
    if (!activeSiteId) return;

    // Handle delete
    if (data.business_name === "__DELETE__") {
      const res = await fetch(`/api/sites/${activeSiteId}`, { method: "DELETE" });
      if (res.ok) {
        setSites(prev => prev.filter(s => s.id !== activeSiteId));
        setActiveSiteId(sites.find(s => s.id !== activeSiteId)?.id || null);
        setSitePanel("overview");
      }
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/sites/${activeSiteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setSites(prev => prev.map(s => s.id === activeSiteId ? { ...s, ...data } : s));
        setSettingsSaved(true);
        setTimeout(() => setSettingsSaved(false), 2500);
      }
    } finally {
      setSaving(false);
    }
  }, [activeSiteId, sites]);

  const handleSignOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/");
  };

  // ─────────────────────────────────────────────────────────────────────────
  // LOADING
  if (loading) return (
    <div style={{ height: "100svh", background: "#0a0a08", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <div style={{ width: 36, height: 36, border: "3px solid #1a1810", borderTopColor: "#c8a96e", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      <div style={{ fontSize: 13, color: "#2a2820" }}>Loading your dashboard…</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const totalSites = sites.length;
  const publishedSites = sites.filter(s => s.is_published).length;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ height: "100svh", background: "#0a0a08", color: "#e8e0d0", fontFamily: "'Inter', -apple-system, sans-serif", display: "flex", overflow: "hidden" }}>

      {/* ═══════════════════════════════════════════════════════ LEFT SIDEBAR */}
      <div style={{ width: 260, flexShrink: 0, display: "flex", flexDirection: "column", background: "#090907", borderRight: "1px solid #161410", overflow: "hidden" }}>

        {/* Logo */}
        <div style={{ padding: "16px 16px 14px", borderBottom: "1px solid #161410", display: "flex", alignItems: "center", gap: 8 }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: "linear-gradient(135deg,#c8a96e,#a07840)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 14, color: "#0a0a08", boxShadow: "0 2px 12px rgba(200,169,110,.2)", flexShrink: 0 }}>S</div>
            <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-.3px", color: "#e8e0d0" }}>Site<span style={{ color: "#c8a96e" }}>craft</span></span>
          </a>
          <div style={{ flex: 1 }} />
          <a href="/" style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid #1a1810", display: "flex", alignItems: "center", justifyContent: "center", color: "#3a3830", fontSize: 14, textDecoration: "none", transition: "all .1s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color="#c8a96e"; (e.currentTarget as HTMLAnchorElement).style.borderColor="rgba(200,169,110,.2)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color="#3a3830"; (e.currentTarget as HTMLAnchorElement).style.borderColor="#1a1810"; }}>
            +
          </a>
        </div>

        {/* Nav */}
        <div style={{ padding: "10px 8px", borderBottom: "1px solid #161410" }}>
          {[
            { id: "sites", label: "My Sites", icon: "▣" },
            { id: "analytics", label: "Analytics", icon: "↗" },
            { id: "account", label: "Account", icon: "◯" },
          ].map(item => (
            <button key={item.id} onClick={() => setView(item.id as typeof view)}
              style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: "none", background: view === item.id ? "rgba(200,169,110,.08)" : "transparent", cursor: "pointer", fontSize: 13, color: view === item.id ? "#c8a96e" : "#3a3830", textAlign: "left", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 9, transition: "all .1s", fontWeight: view === item.id ? 600 : 400 }}
              onMouseEnter={e => { if (view !== item.id) (e.currentTarget).style.color = "#b0a898"; }}
              onMouseLeave={e => { if (view !== item.id) (e.currentTarget).style.color = "#3a3830"; }}>
              <span style={{ fontSize: 15 }}>{item.icon}</span>{item.label}
            </button>
          ))}
        </div>

        {/* Sites list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "10px 8px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1.5px", color: "#2a2820", textTransform: "uppercase", padding: "4px 8px 8px" }}>
            Sites · {totalSites}
          </div>

          {sites.length === 0 ? (
            <div style={{ padding: "20px 10px", textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🌐</div>
              <div style={{ fontSize: 12, color: "#2a2820", lineHeight: 1.5 }}>No sites yet.<br/>Go build something.</div>
              <a href="/" style={{ display: "inline-block", marginTop: 12, padding: "8px 16px", background: "rgba(200,169,110,.1)", border: "1px solid rgba(200,169,110,.2)", borderRadius: 8, color: "#c8a96e", fontSize: 12, textDecoration: "none", fontWeight: 600 }}>
                Build a site →
              </a>
            </div>
          ) : (
            sites.map(site => (
              <button key={site.id} onClick={() => handleSelectSite(site.id)}
                style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: "none", background: activeSiteId === site.id ? "rgba(200,169,110,.07)" : "transparent", cursor: "pointer", textAlign: "left", fontFamily: "inherit", transition: "all .1s", display: "flex", alignItems: "center", gap: 9, marginBottom: 1 }}
                onMouseEnter={e => { if (activeSiteId !== site.id) (e.currentTarget).style.background="rgba(255,255,255,.02)"; }}
                onMouseLeave={e => { if (activeSiteId !== site.id) (e.currentTarget).style.background="transparent"; }}>
                {/* Site icon */}
                <div style={{ width: 28, height: 28, borderRadius: 7, background: activeSiteId === site.id ? "rgba(200,169,110,.15)" : "#111", border: `1px solid ${activeSiteId === site.id ? "rgba(200,169,110,.2)" : "#1a1810"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>
                  {site.thumbnail_url ? <img src={site.thumbnail_url} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 6 }} alt="" /> : "🌐"}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: activeSiteId === site.id ? "#e8e0d0" : "#8a8278", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{site.business_name}</div>
                  <div style={{ fontSize: 10, color: site.is_published ? "#3a6a3a" : "#2a2820", marginTop: 1 }}>{site.is_published ? "● Live" : "○ Draft"}</div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* User footer */}
        {user && (
          <div style={{ padding: "12px 12px", borderTop: "1px solid #161410", display: "flex", alignItems: "center", gap: 9 }}>
            <Avatar user={user} size={30} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#b0a898", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name || user.email}</div>
              <div style={{ fontSize: 10, color: "#2a2820" }}>{user.plan || "Free"} plan</div>
            </div>
            <button onClick={handleSignOut}
              style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid #1a1810", background: "transparent", cursor: "pointer", color: "#2a2820", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", transition: "all .1s" }}
              title="Sign out"
              onMouseEnter={e => { (e.currentTarget).style.color="#f87171"; (e.currentTarget).style.borderColor="rgba(248,113,113,.2)"; }}
              onMouseLeave={e => { (e.currentTarget).style.color="#2a2820"; (e.currentTarget).style.borderColor="#1a1810"; }}>
              ⎋
            </button>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════ MAIN CONTENT */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>

        {/* ── SITES VIEW ── */}
        {view === "sites" && (
          <div style={{ flex: 1, display: "flex", minHeight: 0, overflow: "hidden" }}>

            {/* Site grid */}
            <div style={{ width: 300, flexShrink: 0, borderRight: "1px solid #161410", overflowY: "auto", padding: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#e8e0d0" }}>All Sites</div>
                <a href="/" style={{ fontSize: 12, color: "#c8a96e", textDecoration: "none", padding: "5px 10px", background: "rgba(200,169,110,.08)", border: "1px solid rgba(200,169,110,.15)", borderRadius: 7, fontWeight: 600 }}>+ New</a>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {sites.map(site => (
                  <SiteCard
                    key={site.id}
                    site={site}
                    active={site.id === activeSiteId}
                    onClick={() => handleSelectSite(site.id)}
                    onEdit={() => { setActiveSiteId(site.id); setSitePanel("settings"); }}
                    onDelete={() => { setActiveSiteId(site.id); setDeleteModal(site); }}
                  />
                ))}
                {sites.length === 0 && (
                  <div style={{ padding: "40px 20px", textAlign: "center", color: "#2a2820", fontSize: 13, lineHeight: 1.7 }}>
                    No sites yet.<br />
                    <a href="/" style={{ color: "#c8a96e" }}>Build your first one →</a>
                  </div>
                )}
              </div>
            </div>

            {/* Site detail panel */}
            {activeSite ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>

                {/* Sub-nav */}
                <div style={{ height: 48, background: "#090907", borderBottom: "1px solid #161410", display: "flex", alignItems: "center", padding: "0 20px", gap: 2, flexShrink: 0 }}>
                  {([
                    { id: "overview", label: "Overview" },
                    { id: "settings", label: "Settings" },
                  ] as const).map(t => (
                    <button key={t.id} onClick={() => setSitePanel(t.id)}
                      style={{ padding: "6px 14px", borderRadius: 7, border: "none", background: sitePanel === t.id ? "rgba(200,169,110,.08)" : "transparent", cursor: "pointer", fontSize: 13, color: sitePanel === t.id ? "#c8a96e" : "#3a3830", fontFamily: "inherit", fontWeight: sitePanel === t.id ? 600 : 400 }}>
                      {t.label}
                    </button>
                  ))}
                  <div style={{ flex: 1 }} />
                  {settingsSaved && <div style={{ fontSize: 12, color: "#4ade80", display: "flex", alignItems: "center", gap: 5 }}>✓ Saved</div>}
                  {/* Actions */}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => { window.open(`/?site=${activeSite.id}`, "_blank"); }}
                      style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid #1a1810", background: "transparent", color: "#3a3830", cursor: "pointer", fontSize: 12, fontFamily: "inherit", transition: "all .1s" }}
                      onMouseEnter={e => { (e.currentTarget).style.color="#e8e0d0"; }}
                      onMouseLeave={e => { (e.currentTarget).style.color="#3a3830"; }}>
                      Open Editor
                    </button>
                    {activeSite.is_published && (
                      <a href={`/s/${activeSite.slug}`} target="_blank" rel="noreferrer"
                        style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid rgba(200,169,110,.2)", background: "rgba(200,169,110,.06)", color: "#c8a96e", fontSize: 12, textDecoration: "none", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                        ↗ View Live
                      </a>
                    )}
                  </div>
                </div>

                {/* ── OVERVIEW ── */}
                {sitePanel === "overview" && (
                  <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
                    {/* Site header */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 24 }}>
                      <div style={{ width: 56, height: 56, borderRadius: 14, background: "#111", border: "1px solid #1a1810", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>🌐</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: "#e8e0d0", letterSpacing: "-.4px", marginBottom: 4 }}>{activeSite.business_name}</div>
                        <div style={{ fontSize: 13, color: "#3a3830", marginBottom: 8 }}>{activeSite.description || "No description added"}</div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <div style={{ padding: "3px 10px", background: activeSite.is_published ? "rgba(74,222,128,.08)" : "rgba(255,255,255,.03)", border: `1px solid ${activeSite.is_published ? "rgba(74,222,128,.2)" : "#1a1810"}`, borderRadius: 20, fontSize: 11, color: activeSite.is_published ? "#4ade80" : "#3a3830", fontWeight: 600 }}>
                            {activeSite.is_published ? "● Published" : "○ Draft"}
                          </div>
                          {activeSite.industry && (
                            <div style={{ padding: "3px 10px", background: "rgba(200,169,110,.06)", border: "1px solid rgba(200,169,110,.1)", borderRadius: 20, fontSize: 11, color: "#c8a96e" }}>{activeSite.industry}</div>
                          )}
                          {activeSite.custom_domain && (
                            <div style={{ padding: "3px 10px", background: "rgba(200,169,110,.06)", border: "1px solid rgba(200,169,110,.1)", borderRadius: 20, fontSize: 11, color: "#c8a96e" }}>🌐 {activeSite.custom_domain}</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stats row */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 24 }}>
                      {[
                        { label: "Total Views", value: (activeSite.view_count ?? 0).toLocaleString(), icon: "👁" },
                        { label: "Status", value: activeSite.is_published ? "Live" : "Draft", icon: "📡" },
                        { label: "Last Updated", value: new Date(activeSite.updated_at).toLocaleDateString("en-CA", { month: "short", day: "numeric" }), icon: "🕐" },
                      ].map((stat, i) => (
                        <div key={i} style={{ background: "#0e0d0b", border: "1px solid #1a1810", borderRadius: 10, padding: "14px 16px" }}>
                          <div style={{ fontSize: 20, marginBottom: 6 }}>{stat.icon}</div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: "#e8e0d0", letterSpacing: "-.5px" }}>{stat.value}</div>
                          <div style={{ fontSize: 11, color: "#3a3830", marginTop: 2 }}>{stat.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Live Preview */}
                    <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #1a1810", marginBottom: 20 }}>
                      {/* Browser chrome */}
                      <div style={{ height: 34, background: "#0a0908", display: "flex", alignItems: "center", padding: "0 12px", gap: 8 }}>
                        <div style={{ display: "flex", gap: 4 }}>
                          {["#ff5f57","#febc2e","#28c840"].map(c=><div key={c} style={{ width:10,height:10,borderRadius:"50%",background:c,opacity:.7 }}/>)}
                        </div>
                        <div style={{ flex: 1, background: "#0d0c0a", border: "1px solid #161410", borderRadius: 5, height: 22, display: "flex", alignItems: "center", padding: "0 8px", fontSize: 10, color: "#1e1c18", gap: 4 }}>
                          <span style={{ opacity: .4 }}>🔒</span>
                          {activeSite.custom_domain || `sitecraft.app/s/${activeSite.slug}`}
                        </div>
                      </div>
                      <div style={{ height: 280, background: "#111", overflow: "hidden" }}>
                        <iframe ref={iframeRef} style={{ width: "100%", height: "100%", border: "none", pointerEvents: "none" }} title="preview" sandbox="allow-scripts allow-same-origin" />
                      </div>
                    </div>

                    {/* Quick actions */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8 }}>
                      {[
                        { label: "Open Editor", desc: "Edit with AI chat", icon: "✏️", action: () => { window.location.href = `/?site=${activeSite.id}`; } },
                        { label: activeSite.is_published ? "Unpublish" : "Publish Site", desc: activeSite.is_published ? "Take offline" : "Go live now", icon: activeSite.is_published ? "⏸" : "🚀", action: () => handleSaveSettings({ is_published: !activeSite.is_published }) },
                        { label: "Site Settings", desc: "Domain, SEO, access", icon: "⚙️", action: () => setSitePanel("settings") },
                        { label: "View Live Site", desc: activeSite.is_published ? "Open in new tab" : "Publish first", icon: "↗", action: () => { if (activeSite.is_published) window.open(`/s/${activeSite.slug}`, "_blank"); } },
                      ].map((action, i) => (
                        <button key={i} onClick={action.action}
                          style={{ padding: "14px 16px", background: "#0e0d0b", border: "1px solid #1a1810", borderRadius: 10, cursor: "pointer", textAlign: "left", fontFamily: "inherit", transition: "all .15s", display: "flex", alignItems: "center", gap: 12 }}
                          onMouseEnter={e => { (e.currentTarget).style.borderColor="#2a2820"; (e.currentTarget).style.background="#111"; }}
                          onMouseLeave={e => { (e.currentTarget).style.borderColor="#1a1810"; (e.currentTarget).style.background="#0e0d0b"; }}>
                          <span style={{ fontSize: 20 }}>{action.icon}</span>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#c0b8a8" }}>{action.label}</div>
                            <div style={{ fontSize: 11, color: "#2a2820" }}>{action.desc}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── SETTINGS ── */}
                {sitePanel === "settings" && activeSite && (
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <SiteSettings site={activeSite} onSave={handleSaveSettings} saving={saving} />
                  </div>
                )}
              </div>
            ) : (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, color: "#2a2820" }}>
                <div style={{ fontSize: 48 }}>🌐</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#3a3830" }}>Select a site to get started</div>
                <a href="/" style={{ padding: "10px 20px", background: "rgba(200,169,110,.1)", border: "1px solid rgba(200,169,110,.2)", borderRadius: 9, color: "#c8a96e", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
                  + Build a new site
                </a>
              </div>
            )}
          </div>
        )}

        {/* ── ANALYTICS VIEW ── */}
        {view === "analytics" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#e8e0d0", letterSpacing: "-.5px", marginBottom: 6 }}>Analytics</div>
            <div style={{ fontSize: 13, color: "#3a3830", marginBottom: 24 }}>Overview of your Sitecraft activity</div>

            {/* KPI cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12, marginBottom: 28 }}>
              {[
                { label: "Total Sites", value: totalSites, icon: "🌐", sub: `${publishedSites} published` },
                { label: "Total Views", value: (analytics?.total_views ?? 0).toLocaleString(), icon: "👁", sub: "across all sites" },
                { label: "AI Generations", value: (analytics?.total_generations ?? 0).toLocaleString(), icon: "⚡", sub: "since you joined" },
                { label: "Form Leads", value: (analytics?.total_leads ?? 0).toLocaleString(), icon: "📬", sub: "captured via forms" },
              ].map((kpi, i) => (
                <div key={i} style={{ background: "#0e0d0b", border: "1px solid #1a1810", borderRadius: 12, padding: "18px 20px" }}>
                  <div style={{ fontSize: 24, marginBottom: 10 }}>{kpi.icon}</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: "#e8e0d0", letterSpacing: "-1px" }}>{kpi.value}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#c0b8a8", marginTop: 2 }}>{kpi.label}</div>
                  <div style={{ fontSize: 11, color: "#2a2820", marginTop: 2 }}>{kpi.sub}</div>
                </div>
              ))}
            </div>

            {/* Sites table */}
            <div style={{ background: "#0e0d0b", border: "1px solid #1a1810", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid #161410", fontSize: 13, fontWeight: 700, color: "#e8e0d0" }}>Site Performance</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #161410" }}>
                    {["Site", "Status", "Views", "Last Updated", ""].map((h,i) => (
                      <th key={i} style={{ padding: "10px 18px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#2a2820", textTransform: "uppercase", letterSpacing: "1px" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sites.map(site => (
                    <tr key={site.id} style={{ borderBottom: "1px solid #161410" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background="rgba(255,255,255,.02)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background="transparent"; }}>
                      <td style={{ padding: "12px 18px" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#c0b8a8" }}>{site.business_name}</div>
                        <div style={{ fontSize: 11, color: "#2a2820" }}>sitecraft.app/s/{site.slug}</div>
                      </td>
                      <td style={{ padding: "12px 18px" }}>
                        <span style={{ padding: "3px 9px", background: site.is_published ? "rgba(74,222,128,.08)" : "rgba(255,255,255,.03)", border: `1px solid ${site.is_published ? "rgba(74,222,128,.15)" : "#1a1810"}`, borderRadius: 20, fontSize: 11, color: site.is_published ? "#4ade80" : "#3a3830" }}>
                          {site.is_published ? "Published" : "Draft"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 18px", fontSize: 13, color: "#3a3830" }}>{(site.view_count ?? 0).toLocaleString()}</td>
                      <td style={{ padding: "12px 18px", fontSize: 12, color: "#3a3830" }}>{new Date(site.updated_at).toLocaleDateString("en-CA")}</td>
                      <td style={{ padding: "12px 18px" }}>
                        <button onClick={() => { setActiveSiteId(site.id); setView("sites"); setSitePanel("settings"); }}
                          style={{ padding: "5px 12px", background: "transparent", border: "1px solid #1a1810", borderRadius: 7, color: "#3a3830", cursor: "pointer", fontSize: 12, fontFamily: "inherit", transition: "all .1s" }}
                          onMouseEnter={e => { (e.currentTarget).style.color="#e8e0d0"; }}
                          onMouseLeave={e => { (e.currentTarget).style.color="#3a3830"; }}>
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── ACCOUNT VIEW ── */}
        {view === "account" && user && (
          <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px", maxWidth: 640 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#e8e0d0", letterSpacing: "-.5px", marginBottom: 6 }}>Account Settings</div>
            <div style={{ fontSize: 13, color: "#3a3830", marginBottom: 28 }}>Manage your profile and billing</div>

            {/* Profile card */}
            <div style={{ background: "#0e0d0b", border: "1px solid #1a1810", borderRadius: 12, padding: "20px", marginBottom: 16, display: "flex", alignItems: "center", gap: 16 }}>
              <Avatar user={user} size={56} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#e8e0d0" }}>{user.name}</div>
                <div style={{ fontSize: 13, color: "#3a3830", marginTop: 2 }}>{user.email}</div>
                <div style={{ marginTop: 6, display: "flex", gap: 8 }}>
                  <span style={{ padding: "3px 10px", background: "rgba(200,169,110,.08)", border: "1px solid rgba(200,169,110,.15)", borderRadius: 20, fontSize: 11, color: "#c8a96e", fontWeight: 600 }}>{user.plan || "Free"} Plan</span>
                </div>
              </div>
            </div>

            {/* Plan details */}
            <div style={{ background: "#0e0d0b", border: "1px solid #1a1810", borderRadius: 12, padding: "20px", marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#e8e0d0", marginBottom: 14 }}>Current Plan</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                {[
                  { label: "Sites", value: `${totalSites} / 3`, pct: totalSites/3*100 },
                  { label: "AI Generations", value: `${analytics?.total_generations ?? 0} / 50`, pct: (analytics?.total_generations ?? 0)/50*100 },
                ].map((item,i) => (
                  <div key={i} style={{ background: "#111", borderRadius: 8, padding: "12px 14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: "#3a3830" }}>{item.label}</span>
                      <span style={{ fontSize: 12, color: "#c0b8a8", fontWeight: 600 }}>{item.value}</span>
                    </div>
                    <div style={{ height: 4, background: "#1a1810", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min(100,item.pct)}%`, background: item.pct > 80 ? "#f87171" : "linear-gradient(90deg,#8a6030,#c8a96e)", borderRadius: 2, transition: "width .5s" }} />
                    </div>
                  </div>
                ))}
              </div>
              <button style={{ width: "100%", padding: "11px 0", background: "linear-gradient(135deg,#c8a96e,#a87030)", border: "none", borderRadius: 9, color: "#0a0a08", cursor: "pointer", fontSize: 14, fontFamily: "inherit", fontWeight: 700 }}>
                Upgrade to Pro — $29/mo
              </button>
            </div>

            {/* Danger zone */}
            <div style={{ background: "rgba(248,113,113,.03)", border: "1px solid rgba(248,113,113,.1)", borderRadius: 12, padding: "20px" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#f87171", marginBottom: 8 }}>Danger Zone</div>
              <div style={{ fontSize: 13, color: "#3a3830", marginBottom: 14 }}>Permanently delete your account and all your sites. This cannot be undone.</div>
              <button onClick={handleSignOut}
                style={{ padding: "9px 16px", background: "transparent", border: "1px solid rgba(248,113,113,.2)", borderRadius: 8, color: "#f87171", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═══ Delete confirmation modal */}
      {deleteModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
          <div style={{ background: "#0e0d0b", border: "1px solid #1a1810", borderRadius: 14, padding: "28px", width: 400, maxWidth: "90vw", boxShadow: "0 20px 60px rgba(0,0,0,.6)" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#f87171", marginBottom: 8 }}>Delete Site</div>
            <div style={{ fontSize: 13, color: "#3a3830", marginBottom: 16, lineHeight: 1.6 }}>
              This will permanently delete <strong style={{ color: "#e8e0d0" }}>{deleteModal.business_name}</strong> and all its content. There is no undo.
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "#3a3830", marginBottom: 6 }}>Type <strong style={{ color: "#e8e0d0" }}>{deleteModal.business_name}</strong> to confirm:</div>
              <input value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder={deleteModal.business_name}
                style={{ width: "100%", background: "#111", border: "1px solid #1a1810", borderRadius: 8, padding: "10px 12px", color: "#e8e0d0", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" as const }}
                onFocus={e => { e.target.style.borderColor="rgba(248,113,113,.3)"; }}
                onBlur={e => { e.target.style.borderColor="#1a1810"; }}
              />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setDeleteModal(null); setDeleteConfirmText(""); }}
                style={{ flex: 1, padding: "10px 0", background: "transparent", border: "1px solid #1a1810", borderRadius: 8, color: "#3a3830", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
                Cancel
              </button>
              <button disabled={deleteConfirmText !== deleteModal.business_name}
                onClick={async () => {
                  if (!deleteModal) return;
                  const res = await fetch(`/api/sites/${deleteModal.id}`, { method: "DELETE" });
                  if (res.ok) {
                    setSites(prev => prev.filter(s => s.id !== deleteModal.id));
                    if (activeSiteId === deleteModal.id) setActiveSiteId(sites.find(s => s.id !== deleteModal.id)?.id || null);
                  }
                  setDeleteModal(null); setDeleteConfirmText("");
                }}
                style={{ flex: 1, padding: "10px 0", background: deleteConfirmText === deleteModal.business_name ? "rgba(248,113,113,.15)" : "transparent", border: `1px solid ${deleteConfirmText === deleteModal.business_name ? "rgba(248,113,113,.4)" : "#1a1810"}`, borderRadius: 8, color: deleteConfirmText === deleteModal.business_name ? "#f87171" : "#2a2820", cursor: deleteConfirmText === deleteModal.business_name ? "pointer" : "default", fontSize: 13, fontFamily: "inherit", fontWeight: 600, transition: "all .15s" }}>
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes slideIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-thumb{background:#1a1810;border-radius:4px}
        ::-webkit-scrollbar-track{background:transparent}
      `}</style>
    </div>
  );
}
