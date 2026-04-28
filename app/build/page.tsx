"use client";
import { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────
interface Message { role: "user" | "assistant"; content: string; ts?: number; }
interface CSSVar { name: string; value: string; type: "color" | "other"; }
interface Site { html: string; businessName: string; sourceUrl?: string; goal?: string; }

// ─── Constants ────────────────────────────────────────────────────────────
const SECTIONS = [
  { key: "nav", label: "Navigation", icon: "☰" },
  { key: "hero", label: "Hero / Banner", icon: "⬛" },
  { key: "services", label: "Services", icon: "✦" },
  { key: "about", label: "About / Team", icon: "👤" },
  { key: "gallery", label: "Gallery", icon: "🖼" },
  { key: "testimonials", label: "Reviews", icon: "⭐" },
  { key: "pricing", label: "Pricing", icon: "💰" },
  { key: "contact", label: "Contact / CTA", icon: "✉️" },
  { key: "footer", label: "Footer", icon: "▬" },
];

const QUICK_COMPONENTS: Record<string, string> = {
  gallery: `<section style="padding:60px 20px;background:#f8f8f8;text-align:center"><h2 style="font-size:2em;margin-bottom:40px;font-weight:800">Our Work</h2><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;max-width:1100px;margin:0 auto"><img src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&q=80" alt="Work 1" style="width:100%;height:220px;object-fit:cover;border-radius:10px"/><img src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&q=80" alt="Work 2" style="width:100%;height:220px;object-fit:cover;border-radius:10px"/><img src="https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&q=80" alt="Work 3" style="width:100%;height:220px;object-fit:cover;border-radius:10px"/></div></section>`,
  reviews: `<section style="padding:60px 20px;background:white"><h2 style="text-align:center;font-size:2em;font-weight:800;margin-bottom:12px">What Our Clients Say</h2><p style="text-align:center;color:#888;margin-bottom:40px">Trusted by homeowners across </p><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px;max-width:1100px;margin:0 auto"><div style="padding:28px;background:#f9f9f9;border-radius:12px;border-left:4px solid #2563eb"><div style="color:#f59e0b;font-size:14px;margin-bottom:10px">★★★★★</div><p style="color:#444;font-style:italic;margin-bottom:16px;line-height:1.7">"Outstanding work, on time and on budget. Highly recommend."</p><strong style="font-size:13px">Sarah J. — </strong></div><div style="padding:28px;background:#f9f9f9;border-radius:12px;border-left:4px solid #2563eb"><div style="color:#f59e0b;font-size:14px;margin-bottom:10px">★★★★★</div><p style="color:#444;font-style:italic;margin-bottom:16px;line-height:1.7">"Fast, clean, professional. Will definitely use again."</p><strong style="font-size:13px">Mike T. — </strong></div><div style="padding:28px;background:#f9f9f9;border-radius:12px;border-left:4px solid #2563eb"><div style="color:#f59e0b;font-size:14px;margin-bottom:10px">★★★★★</div><p style="color:#444;font-style:italic;margin-bottom:16px;line-height:1.7">"Best experience I've had. Quote was fair and the result was perfect."</p><strong style="font-size:13px">Linda K. — Red Deer</strong></div></div></section>`,
  contact: `<section style="padding:60px 20px;background:#f3f4f6"><h2 style="text-align:center;font-size:2em;font-weight:800;margin-bottom:8px">Get a Free Quote</h2><p style="text-align:center;color:#888;margin-bottom:36px">We'll get back to you within 24 hours</p><form style="max-width:520px;margin:0 auto;display:flex;flex-direction:column;gap:12px;background:white;padding:32px;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.06)"><input type="text" placeholder="Your Name" style="padding:13px 16px;border:1px solid #e5e7eb;border-radius:8px;font-size:15px;outline:none"/><input type="email" placeholder="Email Address" style="padding:13px 16px;border:1px solid #e5e7eb;border-radius:8px;font-size:15px;outline:none"/><input type="tel" placeholder="Phone Number" style="padding:13px 16px;border:1px solid #e5e7eb;border-radius:8px;font-size:15px;outline:none"/><textarea placeholder="Describe your project" rows="4" style="padding:13px 16px;border:1px solid #e5e7eb;border-radius:8px;font-size:15px;outline:none;resize:vertical"></textarea><button type="submit" style="padding:14px;background:#2563eb;color:white;border:none;border-radius:8px;font-size:16px;font-weight:700;cursor:pointer">Send Request →</button></form></section>`,
  pricing: `<section style="padding:60px 20px;background:white"><h2 style="text-align:center;font-size:2em;font-weight:800;margin-bottom:8px">Clear, Simple Pricing</h2><p style="text-align:center;color:#888;margin-bottom:40px">No hidden fees. Free estimates on all jobs.</p><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px;max-width:900px;margin:0 auto"><div style="padding:32px;border:1px solid #e5e7eb;border-radius:16px;text-align:center"><h3 style="font-weight:800;margin-bottom:8px">Basic</h3><div style="font-size:2.4em;font-weight:900;margin:12px 0">$299</div><ul style="list-style:none;padding:0;color:#666;margin-bottom:24px;display:flex;flex-direction:column;gap:8px;font-size:14px"><li>✓ Standard service call</li><li>✓ 1-hour labour</li><li>✓ Parts included</li></ul><a href="#contact" style="display:block;padding:12px;border:2px solid #2563eb;border-radius:8px;color:#2563eb;font-weight:700;text-decoration:none">Get Quote</a></div><div style="padding:32px;border:2px solid #2563eb;border-radius:16px;text-align:center;background:#eff6ff;position:relative"><div style="position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:#2563eb;color:white;padding:3px 14px;border-radius:20px;font-size:12px;font-weight:700">MOST POPULAR</div><h3 style="font-weight:800;margin-bottom:8px">Standard</h3><div style="font-size:2.4em;font-weight:900;margin:12px 0">$599</div><ul style="list-style:none;padding:0;color:#444;margin-bottom:24px;display:flex;flex-direction:column;gap:8px;font-size:14px"><li>✓ Full-day service</li><li>✓ All parts included</li><li>✓ 90-day warranty</li><li>✓ Priority scheduling</li></ul><a href="#contact" style="display:block;padding:12px;background:#2563eb;border-radius:8px;color:white;font-weight:700;text-decoration:none">Get Quote</a></div></div></section>`,
  form: `<section style="padding:60px 20px;background:#f9f9f9"><h2 style="text-align:center;font-size:2em;font-weight:800;margin-bottom:8px">Contact Us</h2><p style="text-align:center;color:#888;margin-bottom:36px">We'll respond within 24 hours</p><form style="max-width:480px;margin:0 auto;display:flex;flex-direction:column;gap:16px;background:white;padding:32px;border-radius:16px;box-shadow:0 4px 16px rgba(0,0,0,0.08)"><div><label style="display:block;font-weight:600;margin-bottom:6px;color:#111">Name *</label><input type="text" placeholder="Your name" style="width:100%;padding:12px 16px;border:1px solid #e5e7eb;border-radius:8px;font-size:15px;outline:none"/></div><div><label style="display:block;font-weight:600;margin-bottom:6px;color:#111">Email *</label><input type="email" placeholder="your@email.com" style="width:100%;padding:12px 16px;border:1px solid #e5e7eb;border-radius:8px;font-size:15px;outline:none"/></div><div><label style="display:block;font-weight:600;margin-bottom:6px;color:#111">Phone</label><input type="tel" placeholder="(123) 456-7890" style="width:100%;padding:12px 16px;border:1px solid #e5e7eb;border-radius:8px;font-size:15px;outline:none"/></div><div><label style="display:block;font-weight:600;margin-bottom:6px;color:#111">Message *</label><textarea placeholder="Tell us about your project" rows="4" style="width:100%;padding:12px 16px;border:1px solid #e5e7eb;border-radius:8px;font-size:15px;outline:none;resize:vertical"></textarea></div><button type="submit" style="padding:14px;background:#2563eb;color:white;border:none;border-radius:8px;font-size:16px;font-weight:700;cursor:pointer">Send Message</button></form></section>`,
  cta: `<section style="padding:80px 20px;background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);color:white;text-align:center"><h2 style="font-size:2.4em;font-weight:900;margin-bottom:12px;letter-spacing:-0.02em">Ready to Get Started?</h2><p style="font-size:1.1em;opacity:0.8;margin-bottom:36px;max-width:440px;margin-left:auto;margin-right:auto;line-height:1.6">Contact us today for a free, no-obligation quote. Fast response guaranteed.</p><div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap"><a href="tel:+1" style="display:inline-block;padding:14px 32px;background:white;color:#1e3a5f;border-radius:10px;font-weight:800;text-decoration:none;font-size:15px">📞 Call Now</a><a href="#contact" style="display:inline-block;padding:14px 32px;background:transparent;color:white;border:2px solid rgba(255,255,255,0.4);border-radius:10px;font-weight:700;text-decoration:none;font-size:15px">Get a Quote</a></div></section>`,
};

const PALETTES = [
  { name: "Ocean", primary: "#2563eb", bg: "#ffffff", text: "#111827", accent: "#eff6ff" },
  { name: "Midnight", primary: "#0f172a", bg: "#f8fafc", text: "#0f172a", accent: "#e2e8f0" },
  { name: "Forest", primary: "#15803d", bg: "#f0fdf4", text: "#14532d", accent: "#dcfce7" },
  { name: "Ember", primary: "#dc2626", bg: "#ffffff", text: "#111827", accent: "#fef2f2" },
  { name: "Gold", primary: "#d97706", bg: "#fffbeb", text: "#451a03", accent: "#fef3c7" },
  { name: "Violet", primary: "#7c3aed", bg: "#faf5ff", text: "#3b0764", accent: "#f3e8ff" },
  { name: "Slate", primary: "#475569", bg: "#f8fafc", text: "#0f172a", accent: "#e2e8f0" },
  { name: "Teal", primary: "#0d9488", bg: "#f0fdfa", text: "#134e4a", accent: "#ccfbf1" },
];

const FONTS = [
  { name: "Inter", url: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap", stack: "'Inter',sans-serif" },
  { name: "Poppins", url: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap", stack: "'Poppins',sans-serif" },
  { name: "Playfair", url: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&display=swap", stack: "'Playfair Display',Georgia,serif" },
  { name: "Nunito", url: "https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap", stack: "'Nunito',sans-serif" },
  { name: "DM Sans", url: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap", stack: "'DM Sans',sans-serif" },
  { name: "Roboto", url: "https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap", stack: "'Roboto',sans-serif" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────
function extractCSSVars(html: string): CSSVar[] {
  const vars: CSSVar[] = [];
  const rootMatch = html.match(/:root\s*{([^}]+)}/);
  if (!rootMatch) return vars;
  const decls = rootMatch[1].match(/--[^:]+:\s*[^;]+/g) || [];
  decls.forEach(d => {
    const [name, value] = d.split(":").map(s => s.trim());
    vars.push({ name, value, type: value.includes("#") || value.includes("rgb") ? "color" : "other" });
  });
  return vars;
}

function updateCSSVar(html: string, name: string, val: string): string {
  return html.replace(new RegExp(`(${name}\\s*:\\s*)[^;]+`, "g"), `$1${val}`);
}

// ─── Completion checklist ─────────────────────────────────────────────────
function useChecklist(html: string, businessName: string) {
  return [
    { key: "generated", label: "Site generated", done: html.length > 500 },
    { key: "phone", label: "Phone number in site", done: /\d{3}[\s.-]\d{3}[\s.-]\d{4}/.test(html) },
    { key: "contact", label: "Contact section", done: /(contact|quote|form)/i.test(html) },
    { key: "services", label: "Services listed", done: /(service|what we do)/i.test(html) },
    { key: "mobile", label: "Mobile preview checked", done: false },
    { key: "published", label: "Published", done: false },
  ];
}

// ─── Main ─────────────────────────────────────────────────────────────────
export default function BuilderPage() {
  const [site, setSite] = useState<Site>({ html: "", businessName: "" });
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  // Panel state
  const [rightTab, setRightTab] = useState<"chat" | "design" | "pages" | "seo">("chat");
  const [designTab, setDesignTab] = useState<"components" | "palette" | "fonts" | "css">("components");
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  // Visual editing
  const [visualMode, setVisualMode] = useState(false);
  const [hoverEl, setHoverEl] = useState<{ rect: DOMRect; text: string; xpath: string } | null>(null);

  // Modals
  const [showPublish, setShowPublish] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [publishSlug, setPublishSlug] = useState("");
  const [shareUrl, setShareUrl] = useState("");

  // Undo/redo
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  const checklist = useChecklist(site.html, site.businessName);
  const doneCount = checklist.filter(c => c.done).length;

  const setHtml = useCallback((newHtml: string) => {
    setSite(s => {
      setUndoStack(u => [...u.slice(-40), s.html]);
      setRedoStack([]);
      return { ...s, html: newHtml };
    });
  }, []);

  const undo = useCallback(() => {
    setUndoStack(u => {
      if (!u.length) return u;
      const prev = u[u.length - 1];
      setRedoStack(r => [site.html, ...r]);
      setSite(s => ({ ...s, html: prev }));
      return u.slice(0, -1);
    });
  }, [site.html]);

  const redo = useCallback(() => {
    setRedoStack(r => {
      if (!r.length) return r;
      const next = r[0];
      setUndoStack(u => [...u, site.html]);
      setSite(s => ({ ...s, html: next }));
      return r.slice(1);
    });
  }, [site.html]);

  // Load from session/local
  useEffect(() => {
    const raw = sessionStorage.getItem("rb_build_state") || localStorage.getItem("buildState");
    if (raw) {
      try {
        const p = JSON.parse(raw);
        setSite({ html: p.html || "", businessName: p.businessName || "", sourceUrl: p.sourceUrl, goal: p.goal });
        setPublishSlug((p.businessName || "my-site").toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-"));
      } catch {}
    }
  }, []);

  // Persist
  useEffect(() => {
    if (site.html) localStorage.setItem("buildState", JSON.stringify({ html: site.html, businessName: site.businessName, sourceUrl: site.sourceUrl }));
  }, [site.html]);

  // Iframe
  useEffect(() => {
    const f = iframeRef.current;
    if (!f || !site.html) return;
    const doc = f.contentDocument;
    if (!doc) return;
    doc.open(); doc.write(site.html); doc.close();

    // Visual edit listeners
    if (visualMode) {
      const over = (e: MouseEvent) => {
        const el = e.target as HTMLElement;
        if (!el || !el.textContent?.trim()) return;
        const rect = el.getBoundingClientRect();
        const iRect = f.getBoundingClientRect();
        setHoverEl({ rect: new DOMRect(iRect.left + rect.left, iRect.top + rect.top, rect.width, rect.height), text: el.textContent, xpath: "" });
      };
      const out = () => setHoverEl(null);
      const click = (e: MouseEvent) => {
        const el = e.target as HTMLElement;
        if (!el || !el.textContent?.trim()) return;
        const newText = prompt(`Edit text:`, el.textContent || "");
        if (newText !== null && newText !== el.textContent) {
          el.textContent = newText;
          const updated = doc.documentElement.outerHTML;
          setHtml(updated);
        }
      };
      doc.addEventListener("mouseover", over);
      doc.addEventListener("mouseout", out);
      doc.addEventListener("click", click);
      return () => { doc.removeEventListener("mouseover", over); doc.removeEventListener("mouseout", out); doc.removeEventListener("click", click); };
    }
  }, [site.html, visualMode]);

  // Chat scroll
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Keyboard shortcuts
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "z") { e.preventDefault(); undo(); }
        if (e.key === "y") { e.preventDefault(); redo(); }
        if (e.key === "s") { e.preventDefault(); handleDownload(); }
        if (e.key === "p") { e.preventDefault(); setShowPublish(true); }
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [undo, redo]);

  const sendMessage = useCallback(async () => {
    const msg = input.trim();
    if (!msg || sending) return;
    setSending(true);
    setInput("");
    const newMsgs: Message[] = [...messages, { role: "user", content: msg, ts: Date.now() }];
    setMessages(newMsgs);
    try {
      const res = await fetch("/api/chat-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, currentHtml: site.html, businessName: site.businessName, sourceUrl: site.sourceUrl, history: messages }),
      });
      const data = await res.json();
      let newHtml = site.html;
      let reply = "Done! Take a look.";
      if (data.html) {
        try { const p = JSON.parse(data.html); newHtml = p.html || data.html; reply = p.message || reply; } catch { newHtml = data.html; }
      }
      if (data.message) reply = data.message;
      setHtml(newHtml);
      setMessages([...newMsgs, { role: "assistant", content: reply, ts: Date.now() }]);
    } catch {
      setMessages([...newMsgs, { role: "assistant", content: "Something went wrong. Try again.", ts: Date.now() }]);
    }
    setSending(false);
  }, [input, messages, site, sending, setHtml]);

  const handleDownload = () => {
    const blob = new Blob([site.html], { type: "text/html" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${site.businessName || "site"}.html`; a.click();
  };

  const addComponent = (key: string) => setHtml(site.html.replace("</body>", QUICK_COMPONENTS[key] + "\n</body>"));

  const applyPalette = (p: typeof PALETTES[0]) => {
    const override = `<style id="sc-palette">:root{--primary:${p.primary};--bg:${p.bg};--text:${p.text};--accent:${p.accent}}body{background:${p.bg};color:${p.text}}h1,h2,h3,h4{color:${p.text}}a{color:${p.primary}}button[type=submit],a.cta,a[class*=btn]{background:${p.primary}!important;color:white!important}</style>`;
    const cleaned = site.html.replace(/<style id="sc-palette">[\s\S]*?<\/style>/, "");
    setHtml(cleaned.replace("</head>", override + "</head>"));
  };

  const applyFont = (f: typeof FONTS[0]) => {
    const override = `<link id="sc-font" rel="stylesheet" href="${f.url}"><style id="sc-font-style">body,h1,h2,h3,h4,h5,h6,p,a,button,input,textarea{font-family:${f.stack}!important}</style>`;
    const cleaned = site.html.replace(/<link id="sc-font"[^>]*>[\s\S]*?<\/style>/, "");
    setHtml(cleaned.replace("</head>", override + "</head>"));
  };

  const DEVICE_W = { desktop: "100%", tablet: "768px", mobile: "390px" };
  const isMobileScreen = typeof window !== "undefined" && window.innerWidth < 641;
  const DEVICE_H = { desktop: "100%", tablet: "1024px", mobile: "844px" };

  const cssVars = extractCSSVars(site.html);

  const S = {
    root: { display: "flex", flexDirection: "column" as const, height: "100svh", background: "#070706", color: "#e8e0d0", fontFamily: "'Inter',-apple-system,sans-serif", overflow: "hidden" },
    topbar: { height: 48, flexShrink: 0, background: "#0a0a08", borderBottom: "1px solid #111", display: "flex", alignItems: "center", gap: 8, padding: "0 12px" },
    body: { flex: 1, display: "flex", overflow: "hidden" },
    sidebar: (open: boolean) => ({ width: open ? 220 : 0, flexShrink: 0, background: "#0a0a08", borderRight: "1px solid #111", overflow: "hidden", transition: "width 0.2s", display: "flex", flexDirection: "column" as const, position: "relative" as const }),
    center: { flex: 1, display: "flex", flexDirection: "column" as const, overflow: "hidden", background: "#070706" },
    right: (open: boolean) => ({ width: open ? 340 : 0, flexShrink: 0, background: "#0a0a08", borderLeft: "1px solid #111", display: "flex", flexDirection: "column" as const, overflow: "hidden", transition: "width 0.2s" }),
    tabBar: { display: "flex", gap: 0, borderBottom: "1px solid #111", flexShrink: 0 },
    tab: (active: boolean) => ({ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: active ? "#c8a96e" : "#555", background: "transparent", border: "none", cursor: "pointer" as const, borderBottom: active ? "2px solid #c8a96e" : "2px solid transparent", transition: "all 0.15s", whiteSpace: "nowrap" as const }),
    iconBtn: (active?: boolean) => ({ width: 30, height: 30, borderRadius: 6, background: active ? "#c8a96e22" : "transparent", border: `1px solid ${active ? "#c8a96e44" : "#111"}`, color: active ? "#c8a96e" : "#555", cursor: "pointer" as const, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, transition: "all 0.15s", flexShrink: 0 }),
    goldBtn: { background: "#c8a96e", color: "#0a0a08", border: "none", borderRadius: 7, padding: "8px 16px", fontWeight: 800, fontSize: 12, cursor: "pointer" as const, whiteSpace: "nowrap" as const },
    ghostBtn: { background: "transparent", color: "#666", border: "1px solid #111", borderRadius: 7, padding: "7px 12px", fontWeight: 600, fontSize: 12, cursor: "pointer" as const, whiteSpace: "nowrap" as const },
    sectionLabel: { fontSize: 10, fontWeight: 700, color: "#444", textTransform: "uppercase" as const, letterSpacing: "0.08em", padding: "12px 14px 4px" },
    compRow: { display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", cursor: "pointer" as const, borderRadius: 6, margin: "1px 6px", fontSize: 12, color: "#888", transition: "all 0.15s" },
    chatBubble: (role: string) => ({ maxWidth: "88%", padding: "10px 13px", borderRadius: role === "user" ? "12px 12px 3px 12px" : "12px 12px 12px 3px", background: role === "user" ? "#c8a96e" : "#111", color: role === "user" ? "#0a0a08" : "#e8e0d0", fontSize: 13, lineHeight: 1.55 }),
  };

  const SUGGESTIONS = ["Make the hero section darker and more dramatic", "Add a 'Free Quote' button in the navigation", "Change all headings to a bolder font", "Add a reviews section after services", "Make the footer more professional with contact details", "Increase the font size on mobile"];

  return (
    <div style={S.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:#070706}::-webkit-scrollbar-thumb{background:#1a1810;border-radius:2px}
        .sc-comp:hover{background:#111!important;color:#c8a96e!important}
        .sc-section:hover{background:#111!important}
        .sc-palette:hover{transform:scale(1.05);border-color:#c8a96e44!important}
        .sc-font:hover{border-color:#c8a96e44!important;color:#c8a96e!important}
        .chat-ta{background:#0d0c0a;border:1px solid #111;color:#e8e0d0;padding:10px 12px;border-radius:8px;font-size:13px;width:100%;outline:none;font-family:inherit;resize:none;line-height:1.5}
        .chat-ta:focus{border-color:#c8a96e33}
        .chat-ta::placeholder{color:#333}
        .ghostb:hover{border-color:#222!important;color:#e8e0d0!important}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:.5}50%{opacity:1}}
        @keyframes slideIn{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:translateY(0)}}
        /* Mobile — comprehensive Android/iOS support */
        @media(max-width:640px){
          /* Hide desktop panels */
          .sc-left-panel{display:none!important}
          .sc-right-panel{display:none!important}
          .sc-desktop-only{display:none!important}
          /* Show mobile FABs and sheets */
          .sc-mobile-fab{display:flex!important}
          /* Topbar: tighter spacing */
          .sc-topbar-title{display:none!important}
          /* Preview: full viewport height */
          .sc-preview-center{height:calc(100svh - 48px)!important;width:100vw!important}
          /* Iframe: full width, no device chrome constraints */
          .sc-preview-iframe{width:100%!important;height:100%!important;max-width:100%!important}
          /* Body layout: preview takes full screen */
          .sc-body{overflow:hidden!important}
        }
        @media(min-width:641px){
          .sc-mobile-only{display:none!important}
          .sc-mobile-fab{display:none!important}
        }
        /* FAB buttons */
        .sc-mobile-fab{display:none;position:fixed;bottom:24px;right:16px;flex-direction:column;gap:10px;z-index:80;align-items:flex-end}
        /* Bottom sheet */
        .sc-sheet-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:90;backdrop-filter:blur(6px)}
        .sc-bottom-sheet{position:fixed;bottom:0;left:0;right:0;background:#0a0a08;border-top:1px solid #1a1810;border-radius:20px 20px 0 0;z-index:100;animation:slideUp .25s ease;max-height:88svh;display:flex;flex-direction:column;overflow:hidden}
        .sc-sheet-handle{width:40px;height:4px;background:#222;border-radius:2px;margin:12px auto 6px;flex-shrink:0}
        /* Prevent zoom on input focus (Android critical) */
        .chat-ta{font-size:16px!important;-webkit-text-size-adjust:100%}
        input,select,textarea{font-size:16px!important;-webkit-text-size-adjust:100%}
        /* Touch targets: min 44px */
        button{min-height:36px}
        /* Safe area for notched phones */
        .sc-bottom-sheet{padding-bottom:env(safe-area-inset-bottom,0px)}
        /* Smooth momentum scrolling */
        .sc-sheet-messages{-webkit-overflow-scrolling:touch;overscroll-behavior:contain}
      `}</style>

      {/* ── TOPBAR ── */}
      <div style={S.topbar}>
        {/* Logo */}
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 6, textDecoration: "none", marginRight: 4 }}>
          <div style={{ width: 22, height: 22, borderRadius: 5, background: "linear-gradient(135deg,#c8a96e,#a07840)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 10, color: "#0a0a08" }}>S</div>
          <span style={{ fontWeight: 800, fontSize: 13, letterSpacing: -0.3, color: "#e8e0d0" }}>Site<span style={{ color: "#c8a96e" }}>craft</span></span>
        </a>
        <div style={{ width: 1, height: 18, background: "#111", margin: "0 4px" }} />
        {/* Left panel toggle */}
        <button style={S.iconBtn(leftOpen)} onClick={() => setLeftOpen(!leftOpen)} title="Toggle sidebar">☰</button>
        {/* Undo/redo */}
        <button style={S.iconBtn()} onClick={undo} title="Undo (Ctrl+Z)" disabled={!undoStack.length}>↩</button>
        <button style={S.iconBtn()} onClick={redo} title="Redo (Ctrl+Y)" disabled={!redoStack.length}>↪</button>
        <div style={{ width: 1, height: 18, background: "#111", margin: "0 4px" }} />
        {/* Device */}
        {(["desktop", "tablet", "mobile"] as const).map(d => (
          <button key={d} style={S.iconBtn(device === d)} onClick={() => setDevice(d)} title={d}>
            {d === "desktop" ? "🖥" : d === "tablet" ? "📱" : "📲"}
          </button>
        ))}
        <div style={{ width: 1, height: 18, background: "#111", margin: "0 4px" }} />
        {/* Visual edit */}
        <button style={{ ...S.iconBtn(visualMode), gap: 4, padding: "0 8px", width: "auto" }} onClick={() => setVisualMode(!visualMode)} title="Click-to-edit mode">
          <span>✏️</span><span style={{ fontSize: 10 }}>{visualMode ? "Editing" : "Edit"}</span>
        </button>
        {/* Business name */}
        <span style={{ fontSize: 12, color: "#444", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160, marginLeft: 4 }}>{site.businessName || "Untitled site"}</span>

        {/* Checklist pill */}
        <div style={{ marginLeft: 8, background: "#111", border: "1px solid #1a1810", borderRadius: 40, padding: "3px 10px", fontSize: 11, color: doneCount === checklist.length ? "#4ade80" : "#888", display: "flex", alignItems: "center", gap: 5 }}>
          <span>{doneCount}/{checklist.length}</span>
          <span>{doneCount === checklist.length ? "✓" : "⚡"}</span>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button style={S.iconBtn()} onClick={() => setShowShortcuts(true)} title="Keyboard shortcuts">⌨</button>
          <button className="ghostb" style={S.ghostBtn} onClick={handleDownload}>⬇ Download</button>
          <button style={S.goldBtn} onClick={() => setShowPublish(true)}>Publish ↗</button>
          <button style={S.iconBtn(rightOpen)} onClick={() => setRightOpen(!rightOpen)} title="Toggle right panel">⊟</button>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="sc-body" style={S.body}>

        {/* ── LEFT SIDEBAR ── */}
        <div className="sc-left-panel" style={S.sidebar(leftOpen)}>
          {leftOpen && (
            <>
              <div style={S.sectionLabel}>Site Structure</div>
              {SECTIONS.map(s => (
                <div key={s.key} className="sc-section" style={{ ...S.compRow }} onClick={() => {
                  // Scroll iframe to section
                  const iframe = iframeRef.current;
                  if (!iframe?.contentDocument) return;
                  const el = iframe.contentDocument.querySelector(`section, [class*="${s.key}"], [id*="${s.key}"]`);
                  el?.scrollIntoView({ behavior: "smooth" });
                }}>
                  <span style={{ fontSize: 14, width: 20, textAlign: "center" as const }}>{s.icon}</span>
                  <span style={{ fontSize: 12 }}>{s.label}</span>
                </div>
              ))}

              <div style={{ marginTop: "auto", borderTop: "1px solid #111", padding: "12px" }}>
                <div style={S.sectionLabel}>Completion</div>
                {checklist.map(c => (
                  <div key={c.key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 6px", fontSize: 11 }}>
                    <span style={{ color: c.done ? "#4ade80" : "#333", fontSize: 12 }}>{c.done ? "✓" : "○"}</span>
                    <span style={{ color: c.done ? "#888" : "#555", textDecoration: c.done ? "line-through" : "none" }}>{c.label}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── CENTER: PREVIEW ── */}
        <div className="sc-preview-center" style={S.center}>
          {/* Device frame */}
          <div style={{ flex: 1, overflow: "auto", display: "flex", alignItems: device === "desktop" ? "stretch" : "flex-start", justifyContent: "center", padding: device === "desktop" ? 0 : "24px", background: device === "desktop" ? "#070706" : "#050504" }}>
            <div style={{ width: DEVICE_W[device], maxWidth: device === "desktop" ? "100%" : DEVICE_W[device], height: device === "desktop" ? "100%" : DEVICE_H[device], boxShadow: device !== "desktop" ? "0 24px 64px rgba(0,0,0,0.7)" : "none", borderRadius: device !== "desktop" ? 18 : 0, overflow: "hidden", border: device !== "desktop" ? "1px solid #1a1810" : "none", background: "#fff", position: "relative" }}>
              {visualMode && (
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "6px 12px", background: "rgba(200,169,110,0.9)", color: "#0a0a08", fontSize: 11, fontWeight: 700, zIndex: 10, textAlign: "center" }}>
                  ✏️ Click any text to edit it directly
                </div>
              )}
              <iframe
                ref={iframeRef} className="sc-preview-iframe"
                style={{ width: "100%", height: "100%", border: "none", display: "block", cursor: visualMode ? "text" : "default" }}
                title="preview"
                sandbox="allow-scripts allow-same-origin allow-forms"
              />
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="sc-right-panel" style={S.right(rightOpen)}>
          {rightOpen && (
            <>
              {/* Tab bar */}
              <div style={S.tabBar}>
                {([["chat", "💬 Chat"], ["design", "🎨 Design"], ["seo", "🔍 SEO"]] as const).map(([id, label]) => (
                  <button key={id} style={S.tab(rightTab === id)} onClick={() => setRightTab(id as any)}>{label}</button>
                ))}
              </div>

              {/* ── CHAT TAB ── */}
              {rightTab === "chat" && (
                <>
                  <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: 10 }}>
                    {messages.length === 0 && (
                      <div style={{ padding: "16px 0" }}>
                        <div style={{ fontSize: 12, color: "#444", marginBottom: 12, textAlign: "center" }}>Describe any change. I'll update your site live.</div>
                        {SUGGESTIONS.map(s => (
                          <div key={s} className="sc-comp" style={{ ...S.compRow, margin: "2px 0", borderRadius: 6, border: "1px solid #111", justifyContent: "flex-start" }} onClick={() => { setInput(s); chatInputRef.current?.focus(); }}>
                            <span style={{ color: "#333", fontSize: 11 }}>↗</span>
                            <span style={{ fontSize: 11, color: "#666" }}>{s}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {messages.map((m, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", animation: "fadeIn 0.3s ease" }}>
                        <div style={S.chatBubble(m.role)}>{m.content}</div>
                      </div>
                    ))}
                    {sending && (
                      <div style={{ display: "flex", justifyContent: "flex-start" }}>
                        <div style={{ ...S.chatBubble("assistant"), color: "#444" }}>
                          <span style={{ animation: "pulse 1s ease-in-out infinite" }}>Updating your site…</span>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  <div style={{ padding: "10px", borderTop: "1px solid #111", flexShrink: 0 }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
                      <textarea
                        ref={chatInputRef}
                        className="chat-ta"
                        rows={2}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                        placeholder="Change anything… Enter to send"
                      />
                      <button onClick={sendMessage} disabled={sending} style={{ ...S.goldBtn, padding: "10px 13px", opacity: sending ? 0.4 : 1 }}>→</button>
                    </div>
                  </div>
                </>
              )}

              {/* ── DESIGN TAB ── */}
              {rightTab === "design" && (
                <>
                  <div style={S.tabBar}>
                    {([["components", "Sections"], ["palette", "Colours"], ["fonts", "Fonts"], ["css", "CSS Vars"]] as const).map(([id, label]) => (
                      <button key={id} style={{ ...S.tab(designTab === id), fontSize: 11, padding: "8px 10px" }} onClick={() => setDesignTab(id as any)}>{label}</button>
                    ))}
                  </div>

                  <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
                    {designTab === "components" && (
                      <>
                        <div style={S.sectionLabel}>Quick-add sections</div>
                        {[["gallery", "🖼", "Photo Gallery"], ["reviews", "⭐", "Reviews"], ["contact", "✉️", "Contact Form"], ["pricing", "💰", "Pricing Table"], ["form", "📋", "Custom Form"], ["cta", "🚀", "CTA Banner"]].map(([k, icon, label]) => (
                          <div key={k} className="sc-comp" style={{ ...S.compRow, border: "1px solid #111", borderRadius: 8, margin: "4px 0", padding: "10px 12px" }} onClick={() => addComponent(k)}>
                            <span>{icon}</span>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 12, color: "#e8e0d0" }}>{label}</div>
                              <div style={{ fontSize: 10, color: "#444" }}>Click to insert below current content</div>
                            </div>
                          </div>
                        ))}
                      </>
                    )}

                    {designTab === "palette" && (
                      <>
                        <div style={S.sectionLabel}>Colour palettes</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "4px" }}>
                          {PALETTES.map(p => (
                            <div key={p.name} className="sc-palette" style={{ borderRadius: 10, overflow: "hidden", cursor: "pointer", border: "1px solid #111", transition: "all 0.15s" }} onClick={() => applyPalette(p)}>
                              <div style={{ height: 40, background: p.primary }} />
                              <div style={{ height: 20, background: p.bg, borderTop: `2px solid ${p.accent}` }} />
                              <div style={{ padding: "5px 8px", background: "#0a0a08", fontSize: 10, fontWeight: 600, color: "#666" }}>{p.name}</div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {designTab === "fonts" && (
                      <>
                        <div style={S.sectionLabel}>Font stacks</div>
                        {FONTS.map(f => (
                          <div key={f.name} className="sc-font" style={{ padding: "12px 12px", border: "1px solid #111", borderRadius: 8, marginBottom: 6, cursor: "pointer", transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "space-between" }} onClick={() => applyFont(f)}>
                            <div style={{ fontFamily: f.stack, fontSize: 16, color: "#e8e0d0" }}>Aa — {f.name}</div>
                            <span style={{ fontSize: 10, color: "#444" }}>Apply</span>
                          </div>
                        ))}
                      </>
                    )}

                    {designTab === "css" && (
                      <>
                        <div style={S.sectionLabel}>CSS Custom Properties</div>
                        {cssVars.length === 0 && <div style={{ fontSize: 12, color: "#444", padding: "12px", textAlign: "center" as const }}>No CSS variables detected in this site. Ask the AI to add :root variables to enable this.</div>}
                        {cssVars.filter(v => v.type === "color").map(v => (
                          <div key={v.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", border: "1px solid #111", borderRadius: 8, marginBottom: 6 }}>
                            <input type="color" value={v.value.startsWith("#") ? v.value : "#3b82f6"} onChange={e => setHtml(updateCSSVar(site.html, v.name, e.target.value))} style={{ width: 26, height: 26, borderRadius: 4, border: "none", cursor: "pointer", background: "none" }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 11, fontFamily: "monospace", color: "#c8a96e", overflow: "hidden", textOverflow: "ellipsis" }}>{v.name}</div>
                              <div style={{ fontSize: 10, color: "#444" }}>{v.value}</div>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </>
              )}

              {/* ── SEO TAB ── */}
              {rightTab === "seo" && (
                <div style={{ flex: 1, overflowY: "auto", padding: "14px" }}>
                  <div style={S.sectionLabel}>SEO Settings</div>
                  {[
                    { label: "Page Title", placeholder: `${site.businessName} — Professional Services`, tag: "title" },
                    { label: "Meta Description", placeholder: "We provide professional services in ", tag: "description" },
                    { label: "OG Title (Social)", placeholder: site.businessName, tag: "og-title" },
                    { label: "Phone Number", placeholder: "(403) 555-0100", tag: "phone" },
                    { label: "Address", placeholder: ", ", tag: "address" },
                  ].map(f => (
                    <div key={f.tag} style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#555", marginBottom: 4 }}>{f.label}</div>
                      <input placeholder={f.placeholder} style={{ width: "100%", background: "#0d0c0a", border: "1px solid #111", borderRadius: 6, padding: "8px 10px", color: "#e8e0d0", fontSize: 12, outline: "none", fontFamily: "inherit" }} onFocus={e => e.target.style.borderColor = "#c8a96e33"} onBlur={e => e.target.style.borderColor = "#111"} />
                    </div>
                  ))}
                  <button style={{ ...S.goldBtn, width: "100%", justifyContent: "center", marginTop: 8 }}>Apply SEO Tags</button>
                  <div style={{ marginTop: 16, padding: "10px", background: "#111", borderRadius: 8, fontSize: 11, color: "#555", lineHeight: 1.7 }}>
                    💡 After publishing, submit your sitemap to Google Search Console to get indexed faster.
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>


      {/* ── MOBILE FABs ── */}
      <div className="sc-mobile-fab">
        <button
          onClick={() => { setMobileChatOpen(true); setMobilePanelOpen(false); }}
          style={{ width: 48, height: 48, borderRadius: "50%", background: "#c8a96e", border: "none", color: "#0a0a08", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(200,169,110,0.4)" }}
        >💬</button>
        <button
          onClick={() => { setMobilePanelOpen(true); setMobileChatOpen(false); }}
          style={{ width: 48, height: 48, borderRadius: "50%", background: "#111", border: "1px solid #1a1810", color: "#e8e0d0", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.4)" }}
        >🎨</button>
      </div>

      {/* ── MOBILE CHAT SHEET ── */}
      {mobileChatOpen && (
        <div className="sc-sheet-overlay" onClick={() => setMobileChatOpen(false)}>
          <div className="sc-bottom-sheet" onClick={e => e.stopPropagation()}>
            <div className="sc-sheet-handle" />
            <div style={{ padding: "0 16px 8px", fontWeight: 700, fontSize: 14, color: "#e8e0d0", borderBottom: "1px solid #111", paddingBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>💬 Chat with Sitecraft</span>
              <button onClick={() => setMobileChatOpen(false)} style={{ background: "none", border: "none", color: "#555", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
              {messages.map((m, i) => (
                <div key={i} className={m.role === "user" ? "msg-user" : "msg-ai"} style={{ padding: "10px 14px", fontSize: 13, lineHeight: 1.6 }}>
                  {m.content}
                </div>
              ))}
              {sending && <div className="msg-ai" style={{ padding: "10px 14px", fontSize: 13 }}>✦ Thinking…</div>}
            </div>
            <div style={{ padding: "10px 16px 20px", borderTop: "1px solid #111", background: "#0a0a08" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <textarea
                  className="chat-ta"
                  rows={2}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); setMobileChatOpen(false); } }}
                  placeholder="Change anything… Enter to send"
                  style={{ flex: 1 }}
                />
                <button onClick={() => { sendMessage(); setMobileChatOpen(false); }} disabled={sending} style={{ background: "#c8a96e", border: "none", color: "#0a0a08", fontWeight: 700, fontSize: 15, borderRadius: 8, padding: "10px 14px", cursor: "pointer", opacity: sending ? 0.4 : 1 }}>→</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MOBILE DESIGN SHEET ── */}
      {mobilePanelOpen && (
        <div className="sc-sheet-overlay" onClick={() => setMobilePanelOpen(false)}>
          <div className="sc-bottom-sheet" onClick={e => e.stopPropagation()}>
            <div className="sc-sheet-handle" />
            <div style={{ padding: "0 16px 10px", fontWeight: 700, fontSize: 14, color: "#e8e0d0", borderBottom: "1px solid #111", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>🎨 Design</span>
              <button onClick={() => setMobilePanelOpen(false)} style={{ background: "none", border: "none", color: "#555", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
              <div style={{ marginBottom: 14, fontSize: 11, fontWeight: 700, color: "#555", letterSpacing: 1, textTransform: "uppercase" }}>Color Palettes</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
                {PALETTES.map(p => (
                  <button key={p.name} className="sc-palette" onClick={() => { applyPalette(p); setMobilePanelOpen(false); }} style={{ padding: "10px 12px", border: "1px solid #1a1810", borderRadius: 8, cursor: "pointer", background: "#111", display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", background: p.primary, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: "#e8e0d0", fontWeight: 600 }}>{p.name}</span>
                  </button>
                ))}
              </div>
              <div style={{ marginBottom: 14, fontSize: 11, fontWeight: 700, color: "#555", letterSpacing: 1, textTransform: "uppercase" }}>Fonts</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {FONTS.slice(0, 6).map(f => (
                  <button key={f.name} onClick={() => { applyFont(f); setMobilePanelOpen(false); }} style={{ padding: "10px 14px", background: "#111", border: "1px solid #1a1810", borderRadius: 8, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontFamily: f.stack, fontSize: 14, color: "#e8e0d0" }}>Aa — {f.name}</span>
                    <span style={{ fontSize: 10, color: "#444" }}>Apply</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PUBLISH MODAL ── */}
      {showPublish && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9000, backdropFilter: "blur(10px)" }} onClick={() => setShowPublish(false)}>
          <div style={{ background: "#0d0c0a", border: "1px solid #1a1810", borderRadius: 16, padding: "32px", width: 460, maxWidth: "95vw", animation: "slideIn 0.25s ease" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>Publish Your Site</div>
            <div style={{ fontSize: 13, color: "#555", marginBottom: 24 }}>Choose how to put {site.businessName || "your site"} live.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { icon: "🔗", title: "Free Subdomain", desc: "sitecraft.app/" + publishSlug, action: () => { setShareUrl(`https://sitecraft.app/${publishSlug}`); } },
                { icon: "🌐", title: "Custom Domain", desc: "Connect yourdomain.com from the dashboard", action: () => window.location.href = "/dashboard?tab=domain" },
                { icon: "💾", title: "Download HTML", desc: "Self-host on any platform", action: handleDownload },
              ].map((opt, i) => (
                <button key={i} onClick={opt.action} style={{ padding: "14px 16px", background: "#111", border: "1px solid #1a1810", borderRadius: 10, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 14, transition: "border-color 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "#c8a96e44")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "#1a1810")}
                >
                  <span style={{ fontSize: 22 }}>{opt.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#e8e0d0" }}>{opt.title}</div>
                    <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{opt.desc}</div>
                  </div>
                </button>
              ))}
            </div>
            {shareUrl && (
              <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center", background: "#111", border: "1px solid #1a1810", borderRadius: 8, padding: "8px 12px" }}>
                <span style={{ flex: 1, fontSize: 12, fontFamily: "monospace", color: "#c8a96e", overflow: "hidden", textOverflow: "ellipsis" }}>{shareUrl}</span>
                <button style={S.goldBtn} onClick={() => navigator.clipboard.writeText(shareUrl)}>Copy</button>
              </div>
            )}
            <button className="ghostb" style={{ ...S.ghostBtn, width: "100%", marginTop: 14, justifyContent: "center" }} onClick={() => setShowPublish(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── SHORTCUTS MODAL ── */}
      {showShortcuts && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9000, backdropFilter: "blur(10px)" }} onClick={() => setShowShortcuts(false)}>
          <div style={{ background: "#0d0c0a", border: "1px solid #1a1810", borderRadius: 16, padding: "28px 32px", width: 360, animation: "slideIn 0.25s ease" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 20 }}>⌨ Keyboard Shortcuts</div>
            {[["Ctrl+Z", "Undo"], ["Ctrl+Y", "Redo"], ["Ctrl+S", "Download HTML"], ["Ctrl+P", "Open publish"], ["Enter", "Send chat message"]].map(([k, a]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #111", fontSize: 13 }}>
                <span style={{ color: "#888" }}>{a}</span>
                <kbd style={{ background: "#111", border: "1px solid #1a1810", borderRadius: 4, padding: "2px 8px", fontFamily: "monospace", fontSize: 12, color: "#c8a96e" }}>{k}</kbd>
              </div>
            ))}
            <button className="ghostb" style={{ ...S.ghostBtn, width: "100%", marginTop: 16 }} onClick={() => setShowShortcuts(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
