"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const NAV = [
  { id: "sites", label: "My Sites", icon: "🌐" },
  { id: "leads", label: "Leads", icon: "📬" },
  { id: "analytics", label: "Analytics", icon: "📊" },
  { id: "settings", label: "Settings", icon: "⚙️" },
];

const SETTINGS_TABS = ["Profile", "Billing", "Domain", "Notifications", "Team", "Danger Zone"];

const MOCK_SITES = [
  { id: "1", name: "Rocky Mountain Plumbing", url: "rocky-mountain-plumbing", status: "Published", visits: 1243, leads: 14, updated: "2 hours ago", thumb: "🔧" },
  { id: "2", name: "Prairie Sun Bakery", url: "prairie-sun-bakery", status: "Draft", visits: 0, leads: 0, updated: "Yesterday", thumb: "🥐" },
  { id: "3", name: "Apex Electrical Services", url: "apex-electrical", status: "Published", visits: 892, leads: 9, updated: "3 days ago", thumb: "⚡" },
];

const MOCK_LEADS = [
  { email: "mike@rockymtn.ca", site: "Rocky Mountain Plumbing", source: "/", referrer: "google.com", date: "2 hrs ago" },
  { email: "sarah.j@gmail.com", site: "Rocky Mountain Plumbing", source: "/services", referrer: "facebook.com", date: "5 hrs ago" },
  { email: "tom@outlook.com", site: "Apex Electrical", source: "/", referrer: "direct", date: "Yesterday" },
  { email: "jennifer.w@hotmail.com", site: "Apex Electrical", source: "/contact", referrer: "google.com", date: "Yesterday" },
  { email: "brad.k@gmail.com", site: "Rocky Mountain Plumbing", source: "/", referrer: "instagram.com", date: "2 days ago" },
];

const MOCK_ANALYTICS = {
  totalVisits: 2135,
  thisWeek: 384,
  leads: 23,
  conversionRate: "1.08%",
  topPage: "/",
  deviceBreakdown: { mobile: 61, desktop: 32, tablet: 7 },
  referrers: [
    { source: "Google", visits: 812 },
    { source: "Direct", visits: 643 },
    { source: "Facebook", visits: 411 },
    { source: "Instagram", visits: 269 },
  ],
  daily: [42, 55, 38, 71, 64, 82, 32],
};

export default function Dashboard() {
  const [nav, setNav] = useState("sites");
  const [settingsTab, setSettingsTab] = useState("Profile");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user] = useState({ name: "Adam Finlay", email: "adamfinlay999@gmail.com", plan: "Pro", avatar: "AF" });
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifLeads, setNotifLeads] = useState(true);
  const [notifWeekly, setNotifWeekly] = useState(false);
  const [domainInput, setDomainInput] = useState("");
  const [domainStatus, setDomainStatus] = useState<null | "checking" | "available" | "taken">(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const router = useRouter();

  const checkDomain = () => {
    if (!domainInput.trim()) return;
    setDomainStatus("checking");
    setTimeout(() => setDomainStatus(Math.random() > 0.4 ? "available" : "taken"), 1400);
  };

  const s = {
    page: { display: "flex", height: "100vh", background: "#0a0a08", color: "#e8e0d0", fontFamily: "'Inter', -apple-system, sans-serif", overflow: "hidden" } as React.CSSProperties,
    sidebar: { width: sidebarOpen ? 240 : 64, background: "#111109", borderRight: "1px solid #2a2820", display: "flex", flexDirection: "column" as const, transition: "width 0.2s", overflow: "hidden", flexShrink: 0 },
    logo: { padding: "20px 16px 12px", borderBottom: "1px solid #2a2820", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" as const, flexShrink: 0 },
    navItem: (active: boolean) => ({ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", cursor: "pointer" as const, borderRadius: 8, margin: "2px 8px", background: active ? "#1e1c14" : "transparent", color: active ? "#c8a96e" : "#888", fontWeight: active ? 600 : 400, fontSize: 14, whiteSpace: "nowrap" as const, transition: "all 0.15s", border: active ? "1px solid #2a2820" : "1px solid transparent" }),
    main: { flex: 1, display: "flex", flexDirection: "column" as const, overflow: "hidden" },
    topbar: { padding: "16px 28px", borderBottom: "1px solid #2a2820", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0d0d0b", flexShrink: 0 },
    content: { flex: 1, overflow: "auto" as const, padding: "28px" },
    card: { background: "#111109", border: "1px solid #2a2820", borderRadius: 12, padding: "20px 24px" },
    badge: (status: string) => ({ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: status === "Published" ? "#14532d22" : "#1c1c1022", color: status === "Published" ? "#4ade80" : "#888", border: `1px solid ${status === "Published" ? "#166534" : "#333"}` }),
    btn: { background: "#c8a96e", color: "#0a0a08", border: "none", borderRadius: 8, padding: "9px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer" as const },
    btnGhost: { background: "transparent", color: "#e8e0d0", border: "1px solid #2a2820", borderRadius: 8, padding: "9px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer" as const },
    btnDanger: { background: "#7f1d1d22", color: "#f87171", border: "1px solid #991b1b", borderRadius: 8, padding: "9px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer" as const },
    input: { background: "#1a1810", border: "1px solid #2a2820", borderRadius: 8, padding: "10px 14px", color: "#e8e0d0", fontSize: 14, width: "100%", outline: "none" as const },
    toggle: (on: boolean) => ({ width: 40, height: 22, borderRadius: 11, background: on ? "#c8a96e" : "#2a2820", position: "relative" as const, cursor: "pointer" as const, transition: "background 0.2s", flexShrink: 0 }),
    toggleDot: (on: boolean) => ({ position: "absolute" as const, top: 3, left: on ? 21 : 3, width: 16, height: 16, borderRadius: "50%", background: "white", transition: "left 0.2s" }),
    tag: { fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#1a1810", border: "1px solid #2a2820", color: "#888" },
    settingsTab: (active: boolean) => ({ padding: "8px 16px", borderRadius: 8, cursor: "pointer" as const, fontSize: 13, fontWeight: active ? 600 : 400, color: active ? "#c8a96e" : "#888", background: active ? "#1e1c14" : "transparent", border: active ? "1px solid #2a2820" : "1px solid transparent", whiteSpace: "nowrap" as const }),
    statBox: { background: "#111109", border: "1px solid #2a2820", borderRadius: 12, padding: "20px 24px", flex: 1 },
  };

  return (
    <div style={s.page}>
      {/* Sidebar */}
      <div style={s.sidebar}>
        <div style={s.logo} onClick={() => setSidebarOpen(!sidebarOpen)}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>✦</span>
          {sidebarOpen && <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: -0.5 }}>Site<span style={{ color: "#c8a96e" }}>craft</span></span>}
        </div>
        <div style={{ flex: 1, padding: "12px 0", display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV.map(n => (
            <div key={n.id} style={s.navItem(nav === n.id)} onClick={() => setNav(n.id)}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{n.icon}</span>
              {sidebarOpen && <span>{n.label}</span>}
            </div>
          ))}
        </div>
        <div style={{ padding: "16px 8px", borderTop: "1px solid #2a2820" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px", borderRadius: 8, cursor: "pointer" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#c8a96e22", border: "1px solid #c8a96e44", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#c8a96e", flexShrink: 0 }}>{user.avatar}</div>
            {sidebarOpen && (
              <div style={{ overflow: "hidden" }}>
                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</div>
                <div style={{ fontSize: 11, color: "#888" }}>{user.plan} Plan</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={s.main}>
        {/* Topbar */}
        <div style={s.topbar}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{NAV.find(n => n.id === nav)?.label}</div>
            <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
              {nav === "sites" && `${MOCK_SITES.length} sites · ${MOCK_SITES.filter(s => s.status === "Published").length} published`}
              {nav === "leads" && `${MOCK_LEADS.length} total leads captured`}
              {nav === "analytics" && "Last 7 days overview"}
              {nav === "settings" && "Manage your account"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {nav === "sites" && (
              <button style={s.btn} onClick={() => router.push("/")}>+ New Site</button>
            )}
            {nav === "leads" && (
              <button style={s.btnGhost}>Export CSV</button>
            )}
            <button style={{ ...s.btnGhost, padding: "9px 12px" }} onClick={() => router.push("/")}>← Home</button>
          </div>
        </div>

        {/* Content */}
        <div style={s.content}>

          {/* SITES */}
          {nav === "sites" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {MOCK_SITES.map(site => (
                <div key={site.id} style={{ ...s.card, display: "flex", alignItems: "center", gap: 20 }}>
                  <div style={{ width: 52, height: 52, background: "#1a1810", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>{site.thumb}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{site.name}</div>
                      <span style={s.badge(site.status)}>{site.status}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#888" }}>sitecraft.app/{site.url} · Updated {site.updated}</div>
                  </div>
                  <div style={{ display: "flex", gap: 24, textAlign: "center" as const }}>
                    <div><div style={{ fontWeight: 700, fontSize: 18, color: "#c8a96e" }}>{site.visits.toLocaleString()}</div><div style={{ fontSize: 11, color: "#888" }}>Visits</div></div>
                    <div><div style={{ fontWeight: 700, fontSize: 18, color: "#4ade80" }}>{site.leads}</div><div style={{ fontSize: 11, color: "#888" }}>Leads</div></div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button style={s.btnGhost} onClick={() => router.push(`/build`)}>Edit</button>
                    <button style={s.btn}>{site.status === "Published" ? "View Live" : "Publish"}</button>
                  </div>
                </div>
              ))}
              <div
                style={{ ...s.card, border: "1px dashed #2a2820", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px", cursor: "pointer", gap: 8 }}
                onClick={() => router.push("/")}
              >
                <div style={{ fontSize: 28 }}>+</div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Create a new site</div>
                <div style={{ fontSize: 12, color: "#888" }}>Drop a URL or describe your business</div>
              </div>
            </div>
          )}

          {/* LEADS */}
          {nav === "leads" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Stats row */}
              <div style={{ display: "flex", gap: 16 }}>
                {[
                  { label: "Total Leads", value: MOCK_LEADS.length, color: "#c8a96e" },
                  { label: "This Week", value: 8, color: "#4ade80" },
                  { label: "Conversion Rate", value: "1.08%", color: "#60a5fa" },
                  { label: "Sites Capturing", value: 2, color: "#a78bfa" },
                ].map(stat => (
                  <div key={stat.label} style={s.statBox}>
                    <div style={{ fontSize: 26, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                    <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>{stat.label}</div>
                  </div>
                ))}
              </div>
              {/* Table */}
              <div style={s.card}>
                <table style={{ width: "100%", borderCollapse: "collapse" as const }}>
                  <thead>
                    <tr>
                      {["Email", "Site", "Source Page", "Referrer", "Captured"].map(h => (
                        <th key={h} style={{ textAlign: "left" as const, padding: "8px 12px", fontSize: 11, fontWeight: 600, color: "#888", borderBottom: "1px solid #2a2820", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_LEADS.map((lead, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #1a1810" }}>
                        <td style={{ padding: "12px", fontSize: 13, fontWeight: 500 }}>{lead.email}</td>
                        <td style={{ padding: "12px", fontSize: 13 }}>{lead.site}</td>
                        <td style={{ padding: "12px", fontSize: 12, color: "#888" }}>{lead.source}</td>
                        <td style={{ padding: "12px", fontSize: 12, color: "#888" }}>{lead.referrer}</td>
                        <td style={{ padding: "12px", fontSize: 12, color: "#888" }}>{lead.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ANALYTICS */}
          {nav === "analytics" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Stats row */}
              <div style={{ display: "flex", gap: 16 }}>
                {[
                  { label: "Total Visits", value: MOCK_ANALYTICS.totalVisits.toLocaleString(), sub: `+${MOCK_ANALYTICS.thisWeek} this week`, color: "#c8a96e" },
                  { label: "Leads Captured", value: MOCK_ANALYTICS.leads, sub: "Across all sites", color: "#4ade80" },
                  { label: "Conversion Rate", value: MOCK_ANALYTICS.conversionRate, sub: "Visits → Leads", color: "#60a5fa" },
                  { label: "Top Page", value: MOCK_ANALYTICS.topPage, sub: "Most visited", color: "#f472b6" },
                ].map(stat => (
                  <div key={stat.label} style={s.statBox}>
                    <div style={{ fontSize: 26, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                    <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{stat.sub}</div>
                    <div style={{ fontSize: 11, color: "#555", marginTop: 6, textTransform: "uppercase" as const, letterSpacing: "0.05em", fontWeight: 600 }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {/* Traffic Chart */}
                <div style={s.card}>
                  <div style={{ fontWeight: 700, marginBottom: 20 }}>Daily Traffic — Last 7 Days</div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 100 }}>
                    {MOCK_ANALYTICS.daily.map((v, i) => {
                      const max = Math.max(...MOCK_ANALYTICS.daily);
                      const pct = (v / max) * 100;
                      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
                      return (
                        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                          <div style={{ width: "100%", background: "#c8a96e33", borderRadius: "4px 4px 0 0", height: `${pct}%`, minHeight: 4, position: "relative" }}>
                            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "#c8a96e", borderRadius: "4px 4px 0 0", height: `${pct}%` }} />
                          </div>
                          <div style={{ fontSize: 10, color: "#888" }}>{days[i]}</div>
                          <div style={{ fontSize: 10, color: "#555" }}>{v}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Device breakdown */}
                <div style={s.card}>
                  <div style={{ fontWeight: 700, marginBottom: 20 }}>Device Breakdown</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {Object.entries(MOCK_ANALYTICS.deviceBreakdown).map(([device, pct]) => (
                      <div key={device}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 13 }}>
                          <span style={{ textTransform: "capitalize" as const }}>{device}</span>
                          <span style={{ color: "#888" }}>{pct}%</span>
                        </div>
                        <div style={{ height: 6, background: "#1a1810", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: device === "mobile" ? "#c8a96e" : device === "desktop" ? "#60a5fa" : "#a78bfa", borderRadius: 3 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Referrers */}
                <div style={s.card}>
                  <div style={{ fontWeight: 700, marginBottom: 16 }}>Top Referrers</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {MOCK_ANALYTICS.referrers.map((r, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 28, height: 28, background: "#1a1810", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#c8a96e" }}>{i + 1}</div>
                          <span style={{ fontSize: 13 }}>{r.source}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 80, height: 4, background: "#1a1810", borderRadius: 2 }}>
                            <div style={{ height: "100%", width: `${(r.visits / MOCK_ANALYTICS.referrers[0].visits) * 100}%`, background: "#c8a96e", borderRadius: 2 }} />
                          </div>
                          <span style={{ fontSize: 12, color: "#888", width: 35, textAlign: "right" as const }}>{r.visits}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Site breakdown */}
                <div style={s.card}>
                  <div style={{ fontWeight: 700, marginBottom: 16 }}>Performance by Site</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {MOCK_SITES.map(site => (
                      <div key={site.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #1a1810" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 18 }}>{site.thumb}</span>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{site.name}</div>
                            <span style={s.badge(site.status)}>{site.status}</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 20, fontSize: 13, textAlign: "right" as const }}>
                          <div><div style={{ fontWeight: 700, color: "#c8a96e" }}>{site.visits}</div><div style={{ fontSize: 10, color: "#888" }}>visits</div></div>
                          <div><div style={{ fontWeight: 700, color: "#4ade80" }}>{site.leads}</div><div style={{ fontSize: 10, color: "#888" }}>leads</div></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SETTINGS */}
          {nav === "settings" && (
            <div style={{ display: "flex", gap: 24 }}>
              {/* Settings sidebar */}
              <div style={{ width: 180, flexShrink: 0 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {SETTINGS_TABS.map(tab => (
                    <div key={tab} style={s.settingsTab(settingsTab === tab)} onClick={() => setSettingsTab(tab)}>{tab}</div>
                  ))}
                </div>
              </div>

              {/* Settings content */}
              <div style={{ flex: 1 }}>

                {settingsTab === "Profile" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <div style={s.card}>
                      <div style={{ fontWeight: 700, marginBottom: 20 }}>Personal Information</div>
                      <div style={{ display: "flex", gap: 20, alignItems: "center", marginBottom: 24 }}>
                        <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#c8a96e22", border: "2px solid #c8a96e44", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700, color: "#c8a96e" }}>AF</div>
                        <div>
                          <button style={s.btnGhost}>Change Photo</button>
                          <div style={{ fontSize: 12, color: "#888", marginTop: 6 }}>JPG, PNG up to 5MB</div>
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                        <div>
                          <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 6 }}>First Name</label>
                          <input style={s.input} defaultValue="Adam" />
                        </div>
                        <div>
                          <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 6 }}>Last Name</label>
                          <input style={s.input} defaultValue="Finlay" />
                        </div>
                        <div>
                          <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 6 }}>Email</label>
                          <input style={s.input} defaultValue="adamfinlay999@gmail.com" />
                        </div>
                        <div>
                          <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 6 }}>Company</label>
                          <input style={s.input} defaultValue="2628285 Alberta Corp" />
                        </div>
                      </div>
                      <button style={s.btn}>Save Changes</button>
                    </div>
                    <div style={s.card}>
                      <div style={{ fontWeight: 700, marginBottom: 16 }}>Password</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 400 }}>
                        <div>
                          <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 6 }}>Current Password</label>
                          <input style={s.input} type="password" placeholder="••••••••" />
                        </div>
                        <div>
                          <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 6 }}>New Password</label>
                          <input style={s.input} type="password" placeholder="••••••••" />
                        </div>
                        <button style={s.btnGhost}>Update Password</button>
                      </div>
                    </div>
                  </div>
                )}

                {settingsTab === "Billing" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <div style={s.card}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 16 }}>Current Plan</div>
                          <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>You are on the Pro plan</div>
                        </div>
                        <span style={{ ...s.badge("Published"), fontSize: 13, padding: "4px 12px" }}>Pro</span>
                      </div>
                      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
                        {[
                          { name: "Starter", price: "$29", sites: "3 sites", color: "#888" },
                          { name: "Pro", price: "$79", sites: "10 sites", color: "#c8a96e" },
                          { name: "Agency", price: "$199", sites: "Unlimited", color: "#a78bfa" },
                        ].map(plan => (
                          <div key={plan.name} style={{ flex: 1, background: "#1a1810", border: `1px solid ${plan.name === "Pro" ? "#c8a96e44" : "#2a2820"}`, borderRadius: 10, padding: "16px", textAlign: "center" as const }}>
                            <div style={{ fontWeight: 700, color: plan.color }}>{plan.name}</div>
                            <div style={{ fontSize: 24, fontWeight: 800, margin: "8px 0", color: "#e8e0d0" }}>{plan.price}<span style={{ fontSize: 12, color: "#888" }}>/mo</span></div>
                            <div style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>{plan.sites}</div>
                            <button style={plan.name === "Pro" ? { ...s.btn, width: "100%", opacity: 0.5, cursor: "default" as const } : { ...s.btnGhost, width: "100%" }}>
                              {plan.name === "Pro" ? "Current" : "Upgrade"}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={s.card}>
                      <div style={{ fontWeight: 700, marginBottom: 16 }}>Payment Method</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px", background: "#1a1810", borderRadius: 8, border: "1px solid #2a2820", marginBottom: 12 }}>
                        <span style={{ fontSize: 24 }}>💳</span>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>Mastercard ending in 5021</div>
                          <div style={{ fontSize: 11, color: "#888" }}>Expires 09/2027</div>
                        </div>
                        <button style={{ ...s.btnGhost, marginLeft: "auto" }}>Update</button>
                      </div>
                      <div style={{ fontWeight: 700, marginBottom: 12, marginTop: 20 }}>Billing History</div>
                      {[
                        { date: "Apr 23, 2026", desc: "Pro Plan — Monthly", amount: "$79.00" },
                        { date: "Mar 23, 2026", desc: "Pro Plan — Monthly", amount: "$79.00" },
                        { date: "Feb 23, 2026", desc: "Pro Plan — Monthly", amount: "$79.00" },
                      ].map((inv, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #1a1810", fontSize: 13 }}>
                          <div><div style={{ fontWeight: 500 }}>{inv.desc}</div><div style={{ fontSize: 11, color: "#888" }}>{inv.date}</div></div>
                          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                            <span style={{ fontWeight: 600 }}>{inv.amount}</span>
                            <button style={{ ...s.btnGhost, padding: "4px 10px", fontSize: 11 }}>Receipt</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {settingsTab === "Domain" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <div style={s.card}>
                      <div style={{ fontWeight: 700, marginBottom: 8 }}>Your Sitecraft Subdomain</div>
                      <div style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>Your sites are accessible at your free subdomain by default.</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 0, background: "#1a1810", border: "1px solid #2a2820", borderRadius: 8, overflow: "hidden" }}>
                        <div style={{ padding: "10px 14px", color: "#888", fontSize: 13, background: "#111109", borderRight: "1px solid #2a2820" }}>sitecraft.app/</div>
                        <input style={{ ...s.input, border: "none", background: "transparent", borderRadius: 0, flex: 1 }} defaultValue="adam-finlay" />
                        <button style={{ ...s.btn, borderRadius: 0, padding: "10px 20px" }}>Save</button>
                      </div>
                    </div>
                    <div style={s.card}>
                      <div style={{ fontWeight: 700, marginBottom: 8 }}>Connect Custom Domain</div>
                      <div style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>Use your own domain (e.g. yourcompany.com) for any site on your plan.</div>
                      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                        <input style={{ ...s.input, flex: 1 }} placeholder="yourdomain.com" value={domainInput} onChange={e => { setDomainInput(e.target.value); setDomainStatus(null); }} />
                        <button style={s.btn} onClick={checkDomain}>{domainStatus === "checking" ? "Checking…" : "Check"}</button>
                      </div>
                      {domainStatus === "available" && <div style={{ padding: "10px 14px", background: "#14532d22", border: "1px solid #166534", borderRadius: 8, color: "#4ade80", fontSize: 13 }}>✅ {domainInput} is available! Click Connect to proceed.</div>}
                      {domainStatus === "taken" && <div style={{ padding: "10px 14px", background: "#7f1d1d22", border: "1px solid #991b1b", borderRadius: 8, color: "#f87171", fontSize: 13 }}>❌ {domainInput} is already connected to another account.</div>}
                    </div>
                    <div style={s.card}>
                      <div style={{ fontWeight: 700, marginBottom: 12 }}>DNS Setup Guide</div>
                      <div style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>Add these records to your DNS provider (GoDaddy, IONOS, Cloudflare, etc.)</div>
                      {[
                        { type: "A", name: "@", value: "76.76.21.21", ttl: "3600" },
                        { type: "CNAME", name: "www", value: "cname.sitecraft.app", ttl: "3600" },
                      ].map((record, i) => (
                        <div key={i} style={{ display: "flex", gap: 0, marginBottom: 8, background: "#1a1810", borderRadius: 8, overflow: "hidden", border: "1px solid #2a2820", fontSize: 12, fontFamily: "monospace" }}>
                          <div style={{ padding: "10px 14px", background: "#c8a96e22", color: "#c8a96e", fontWeight: 700 }}>{record.type}</div>
                          <div style={{ padding: "10px 14px", borderRight: "1px solid #2a2820", color: "#888" }}>{record.name}</div>
                          <div style={{ padding: "10px 14px", flex: 1, color: "#e8e0d0" }}>{record.value}</div>
                          <div style={{ padding: "10px 14px", color: "#888" }}>TTL: {record.ttl}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {settingsTab === "Notifications" && (
                  <div style={s.card}>
                    <div style={{ fontWeight: 700, marginBottom: 20 }}>Email Notifications</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                      {[
                        { label: "New lead captured", desc: "Get an email when a visitor submits your lead form", state: notifLeads, set: setNotifLeads },
                        { label: "Weekly summary", desc: "Traffic and lead recap every Monday morning", state: notifWeekly, set: setNotifWeekly },
                        { label: "Billing receipts", desc: "Invoice emails for every payment processed", state: notifEmail, set: setNotifEmail },
                      ].map((item, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 0", borderBottom: "1px solid #1a1810" }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600 }}>{item.label}</div>
                            <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{item.desc}</div>
                          </div>
                          <div style={s.toggle(item.state)} onClick={() => item.set(!item.state)}>
                            <div style={s.toggleDot(item.state)} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {settingsTab === "Team" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <div style={s.card}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                        <div style={{ fontWeight: 700 }}>Team Members</div>
                        <button style={s.btn}>+ Invite Member</button>
                      </div>
                      {[
                        { name: "Adam Finlay", email: "adamfinlay999@gmail.com", role: "Owner", avatar: "AF" },
                      ].map((member, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderBottom: "1px solid #1a1810" }}>
                          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#c8a96e22", border: "1px solid #c8a96e44", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#c8a96e" }}>{member.avatar}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{member.name}</div>
                            <div style={{ fontSize: 11, color: "#888" }}>{member.email}</div>
                          </div>
                          <span style={{ ...s.badge("Published"), fontSize: 11 }}>{member.role}</span>
                        </div>
                      ))}
                      <div style={{ marginTop: 20, padding: "16px", background: "#1a1810", borderRadius: 8, border: "1px solid #2a2820" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Invite by Email</div>
                        <div style={{ display: "flex", gap: 10 }}>
                          <input style={{ ...s.input, flex: 1 }} placeholder="colleague@company.com" />
                          <select style={{ ...s.input, width: "auto" }}>
                            <option>Editor</option>
                            <option>Viewer</option>
                          </select>
                          <button style={s.btn}>Send Invite</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {settingsTab === "Danger Zone" && (
                  <div style={s.card}>
                    <div style={{ fontWeight: 700, marginBottom: 6, color: "#f87171" }}>⚠️ Danger Zone</div>
                    <div style={{ fontSize: 13, color: "#888", marginBottom: 24 }}>These actions are permanent and cannot be undone.</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      <div style={{ padding: "16px", background: "#7f1d1d11", border: "1px solid #7f1d1d", borderRadius: 8 }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>Export All Data</div>
                        <div style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>Download all your sites, leads, and analytics as a ZIP file.</div>
                        <button style={s.btnGhost}>Export Data</button>
                      </div>
                      <div style={{ padding: "16px", background: "#7f1d1d22", border: "1px solid #991b1b", borderRadius: 8 }}>
                        <div style={{ fontWeight: 600, marginBottom: 4, color: "#f87171" }}>Delete Account</div>
                        <div style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>Permanently delete your account and all associated data. This cannot be reversed.</div>
                        <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>Type <strong style={{ color: "#e8e0d0" }}>DELETE</strong> to confirm:</div>
                        <div style={{ display: "flex", gap: 10 }}>
                          <input style={{ ...s.input, flex: 1 }} placeholder="DELETE" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} />
                          <button style={{ ...s.btnDanger, opacity: deleteConfirm === "DELETE" ? 1 : 0.4 }} disabled={deleteConfirm !== "DELETE"}>Delete Account</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
