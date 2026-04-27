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

export default function Dashboard() {
  const [nav, setNav] = useState("sites");
  const [settingsTab, setSettingsTab] = useState("Profile");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [sites, setSites] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifLeads, setNotifLeads] = useState(true);
  const [notifWeekly, setNotifWeekly] = useState(false);
  const [domainInput, setDomainInput] = useState("");
  const [domainStatus, setDomainStatus] = useState<null | "checking" | "available" | "taken">(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const router = useRouter();

  // Fetch user data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch authenticated user
        const meRes = await fetch("/api/auth/me");
        if (!meRes.ok) {
          router.push("/login");
          return;
        }
        const userData = await meRes.json();
        setUser(userData);

        // Fetch user's saved sites
        const sitesRes = await fetch("/api/crm/sites");
        if (sitesRes.ok) {
          const sitesData = await sitesRes.json();
          setSites(sitesData || []);
        }

        // Fetch leads from forms
        const leadsRes = await fetch("/api/crm/leads");
        if (leadsRes.ok) {
          const leadsData = await leadsRes.json();
          setLeads(leadsData || []);
        }

        // Fetch analytics summary
        const statsRes = await fetch("/api/crm/stats");
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setAnalytics(statsData);
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const checkDomain = () => {
    if (!domainInput.trim()) return;
    setDomainStatus("checking");
    setTimeout(() => setDomainStatus(Math.random() > 0.4 ? "available" : "taken"), 1400);
  };

  const handleSignOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/");
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
  };

  if (loading || !user) {
    return (
      <div style={{ ...s.page, justifyContent: "center", alignItems: "center" }}>
        <div style={{ fontSize: 24, color: "#888" }}>Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      {/* Sidebar */}
      <div style={s.sidebar}>
        <div style={s.logo}>
          <span style={{ fontSize: 20 }}>🎨</span>
          {sidebarOpen && <span style={{ fontWeight: 700, fontSize: 14 }}>Sitecraft</span>}
        </div>
        {NAV.map((item) => (
          <div
            key={item.id}
            onClick={() => setNav(item.id)}
            style={s.navItem(nav === item.id)}
          >
            <span style={{ fontSize: 16 }}>{item.icon}</span>
            {sidebarOpen && <span>{item.label}</span>}
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <div
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            padding: "10px 16px",
            cursor: "pointer",
            color: "#888",
            fontSize: 12,
            textAlign: "center",
            borderTop: "1px solid #2a2820",
          }}
        >
          {sidebarOpen ? "← Collapse" : "→"}
        </div>
      </div>

      {/* Main Content */}
      <div style={s.main}>
        {/* Topbar */}
        <div style={s.topbar}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
            {nav === "sites" && "My Sites"}
            {nav === "leads" && "Leads"}
            {nav === "analytics" && "Analytics"}
            {nav === "settings" && "Settings"}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ fontSize: 12, textAlign: "right" }}>
              <div style={{ fontWeight: 600 }}>{user?.name || "User"}</div>
              <div style={{ color: "#888", fontSize: 11 }}>{user?.plan || "Free"} Plan</div>
            </div>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "#c8a96e",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                color: "#0a0a08",
                fontSize: 12,
              }}
            >
              {user?.name?.split(" ").map((n: string) => n[0]).join("") || "U"}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div style={s.content}>
          {/* SITES TAB */}
          {nav === "sites" && (
            <div>
              <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ margin: 0, color: "#888", fontSize: 14 }}>
                    {sites.length} {sites.length === 1 ? "site" : "sites"}
                  </p>
                </div>
                <button
                  onClick={() => router.push("/")}
                  style={{ ...s.btn }}
                >
                  ✨ New Site
                </button>
              </div>

              {sites.length === 0 ? (
                <div
                  style={{
                    ...s.card,
                    textAlign: "center",
                    padding: "40px",
                    color: "#888",
                  }}
                >
                  <div style={{ fontSize: 24, marginBottom: 12 }}>🌐</div>
                  <div style={{ fontWeight: 500, marginBottom: 8 }}>No sites yet</div>
                  <button onClick={() => router.push("/")} style={{ ...s.btn, marginTop: 16 }}>
                    Create Your First Site
                  </button>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                  {sites.map((site: any) => (
                    <div key={site.id} style={s.card}>
                      <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
                      <h3 style={{ margin: "0 0 8px 0", fontSize: 16, fontWeight: 600 }}>
                        {site.business_name || "Untitled Site"}
                      </h3>
                      <div style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>
                        {site.slug}
                      </div>
                      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                        <div style={s.badge(site.is_published ? "Published" : "Draft")}>
                          {site.is_published ? "Published" : "Draft"}
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>
                        {site.view_count || 0} views
                      </div>
                      <button style={{ ...s.btnGhost, width: "100%" }}>
                        View →
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* LEADS TAB */}
          {nav === "leads" && (
            <div>
              <p style={{ margin: "0 0 20px 0", color: "#888", fontSize: 14 }}>
                {leads.length} {leads.length === 1 ? "lead" : "leads"}
              </p>

              {leads.length === 0 ? (
                <div style={{ ...s.card, textAlign: "center", padding: "40px", color: "#888" }}>
                  <div style={{ fontSize: 24, marginBottom: 12 }}>📬</div>
                  <div>No leads captured yet. Publish a site with a contact form to start.</div>
                </div>
              ) : (
                <div style={{ ...s.card, overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" as const }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #2a2820" }}>
                        <th style={{ textAlign: "left", padding: "12px 0", fontSize: 12, fontWeight: 600, color: "#888" }}>
                          Email
                        </th>
                        <th style={{ textAlign: "left", padding: "12px 0", fontSize: 12, fontWeight: 600, color: "#888" }}>
                          Site
                        </th>
                        <th style={{ textAlign: "left", padding: "12px 0", fontSize: 12, fontWeight: 600, color: "#888" }}>
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {leads.map((lead: any) => (
                        <tr key={lead.id} style={{ borderBottom: "1px solid #1a1810" }}>
                          <td style={{ padding: "12px 0", fontSize: 13 }}>{lead.email || lead.owner_name || "—"}</td>
                          <td style={{ padding: "12px 0", fontSize: 13, color: "#888" }}>
                            {lead.business_name || "—"}
                          </td>
                          <td style={{ padding: "12px 0", fontSize: 13, color: "#888" }}>
                            {new Date(lead.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ANALYTICS TAB */}
          {nav === "analytics" && (
            <div>
              {analytics ? (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
                    <div style={s.card}>
                      <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>Total Visits</div>
                      <div style={{ fontSize: 32, fontWeight: 700 }}>{analytics.total_visits || 0}</div>
                    </div>
                    <div style={s.card}>
                      <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>This Week</div>
                      <div style={{ fontSize: 32, fontWeight: 700 }}>{analytics.this_week || 0}</div>
                    </div>
                    <div style={s.card}>
                      <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>Leads</div>
                      <div style={{ fontSize: 32, fontWeight: 700 }}>{analytics.leads || 0}</div>
                    </div>
                    <div style={s.card}>
                      <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>Conversion</div>
                      <div style={{ fontSize: 32, fontWeight: 700 }}>{analytics.conversion_rate || "0%"}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ ...s.card, textAlign: "center", padding: "40px", color: "#888" }}>
                  <div>No analytics data available yet.</div>
                </div>
              )}
            </div>
          )}

          {/* SETTINGS TAB */}
          {nav === "settings" && (
            <div>
              <div style={{ display: "flex", gap: 8, marginBottom: 24, borderBottom: "1px solid #2a2820", paddingBottom: 16 }}>
                {SETTINGS_TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setSettingsTab(tab)}
                    style={s.settingsTab(settingsTab === tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {settingsTab === "Profile" && (
                <div style={s.card}>
                  <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 600 }}>
                    Account Settings
                  </h3>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 12, color: "#888", marginBottom: 6 }}>
                      Name
                    </label>
                    <input
                      type="text"
                      defaultValue={user?.name || ""}
                      style={s.input}
                    />
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 12, color: "#888", marginBottom: 6 }}>
                      Email
                    </label>
                    <input
                      type="email"
                      defaultValue={user?.email || ""}
                      disabled
                      style={{ ...s.input, opacity: 0.6, cursor: "not-allowed" }}
                    />
                  </div>
                  <button style={s.btn}>Save Changes</button>
                </div>
              )}

              {settingsTab === "Notifications" && (
                <div style={s.card}>
                  <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 600 }}>
                    Email Notifications
                  </h3>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 16,
                      paddingBottom: 16,
                      borderBottom: "1px solid #2a2820",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500, marginBottom: 2 }}>New Leads</div>
                      <div style={{ fontSize: 12, color: "#888" }}>
                        Get notified when someone submits a form
                      </div>
                    </div>
                    <div
                      onClick={() => setNotifLeads(!notifLeads)}
                      style={s.toggle(notifLeads)}
                    >
                      <div style={s.toggleDot(notifLeads)} />
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 16,
                      paddingBottom: 16,
                      borderBottom: "1px solid #2a2820",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500, marginBottom: 2 }}>Weekly Report</div>
                      <div style={{ fontSize: 12, color: "#888" }}>
                        Receive a summary of site performance
                      </div>
                    </div>
                    <div
                      onClick={() => setNotifWeekly(!notifWeekly)}
                      style={s.toggle(notifWeekly)}
                    >
                      <div style={s.toggleDot(notifWeekly)} />
                    </div>
                  </div>
                </div>
              )}

              {settingsTab === "Danger Zone" && (
                <div style={{ ...s.card, borderColor: "#991b1b" }}>
                  <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 600, color: "#f87171" }}>
                    Danger Zone
                  </h3>
                  <button
                    onClick={handleSignOut}
                    style={s.btnDanger}
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
