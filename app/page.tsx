"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

type AppState = "landing" | "builder";
type Device = "desktop" | "tablet" | "mobile";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts: number;
}

const PREVIEW_SITES = [
  {
    label: "Tattoo Studio",
    bg: "#0d0d0d",
    accent: "#e8335a",
    emoji: "🖤",
    hero: "Darkline Tattoo Co.",
    sub: "Custom Ink · Walk-ins Welcome",
    tags: ["Custom Designs", "Cover-ups", "All Styles"],
    stat: "2,000+ pieces done",
  },
  {
    label: "Music Producer",
    bg: "#0a0a1a",
    accent: "#9d6fff",
    emoji: "🎧",
    hero: "MNRCH Beats",
    sub: "Trap · Hip-Hop · Electronic",
    tags: ["Exclusive Leases", "Full Trackouts", "Mixing & Mastering"],
    stat: "500+ artists worked with",
  },
  {
    label: "Freelance Designer",
    bg: "#0d1520",
    accent: "#00c9ff",
    emoji: "✦",
    hero: "Studio Flux",
    sub: "Brand Identity · Web · Motion",
    tags: ["Branding", "UI/UX", "Figma"],
    stat: "4.9★ across 120+ clients",
  },
  {
    label: "Personal Trainer",
    bg: "#0d0a00",
    accent: "#f5a623",
    emoji: "💪",
    hero: "MVMNT by Jay",
    sub: "Online & In-Person Coaching",
    tags: ["1-on-1 Programs", "Nutrition Plans", "Free Consult"],
    stat: "300+ transformations",
  },
  {
    label: "Coffee Shop",
    bg: "#110a05",
    accent: "#c8845a",
    emoji: "☕",
    hero: "Third Wave Coffee Roasters",
    sub: "Single Origin · Pour Over · Cold Brew",
    tags: ["Ethically Sourced", "Freshly Roasted", "Subscription"],
    stat: "Roasting since 2018",
  },
];

const PROMPT_SUGGESTIONS = [
  { label: "🖤 Tattoo Studio", value: "Darkline Tattoo — custom tattoo studio, walk-ins welcome, all styles" },
  { label: "🎧 Music Producer", value: "MNRCH Beats — trap and hip-hop producer, selling beats online" },
  { label: "✦ Designer", value: "Studio Flux — freelance brand identity and web designer" },
  { label: "📸 Photographer", value: "Lens & Light — wedding and portrait photographer" },
  { label: "💪 Personal Trainer", value: "MVMNT by Jay — online fitness coaching and transformation programs" },
  { label: "☕ Coffee Shop", value: "Third Wave Coffee Roasters — specialty coffee, single origin beans" },
  { label: "🎨 Artist", value: "Maya Osei Art — original paintings and prints available online" },
  { label: "🍕 Restaurant", value: "Pasta & Co. — handmade pasta, wood-fired pizza, dine-in and takeout" },
  { label: "💅 Nail Studio", value: "Luxe Nails — nail art studio, gel and acrylic extensions" },
  { label: "🎤 Podcast", value: "The Grind Daily — weekly podcast about entrepreneurship and mindset" },
];

const QUICK_EDITS = [
  "Make the hero bolder and more impactful",
  "Add a testimonials section with 3 reviews",
  "Change the colour scheme to dark navy and gold",
  "Add a contact form with name, email, phone, message",
  "Make it look more premium and modern",
  "Add a services section with icons",
  "Make the call-to-action button bigger",
  "Add a photo gallery section",
];

const GEN_STEPS = [
  "Reading your business details",
  "Planning the layout",
  "Writing your copy",
  "Designing the sections",
  "Applying mobile styles",
  "Final polish",
];

const CSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; overflow: hidden; }
body { font-family: -apple-system, 'Inter', sans-serif; background: #070706; color: #e8e0d0; }

@keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes pulse { 0%,100% { opacity:.3; transform:scale(.8); } 50% { opacity:1; transform:scale(1); } }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes slideIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
@keyframes glow { 0%,100% { box-shadow:0 0 20px rgba(200,169,110,.06); } 50% { box-shadow:0 0 40px rgba(200,169,110,.18); } }
@keyframes previewFade { from { opacity:0; transform:scale(.97) translateY(6px); } to { opacity:1; transform:scale(1) translateY(0); } }
@keyframes chipSlide { from { opacity:0; transform:translateX(-8px); } to { opacity:1; transform:translateX(0); } }
@keyframes float { 0%,100% { transform:translateY(0px); } 50% { transform:translateY(-6px); } }
@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }

.logo { display:flex; align-items:center; gap:8px; }
.logo-mark { width:32px; height:32px; border-radius:8px; background:linear-gradient(135deg,#c8a96e,#a07840); display:flex; align-items:center; justify-content:center; font-weight:900; font-size:15px; color:#0a0a08; box-shadow:0 4px 16px rgba(200,169,110,.25); flex-shrink:0; }
.logo-text { font-weight:800; font-size:18px; letter-spacing:-.3px; }
.logo-text span { color:#c8a96e; }

.btn-gold { background:#c8a96e; color:#0a0a08; border:none; border-radius:8px; font-weight:800; cursor:pointer; font-family:inherit; transition:all .15s; display:inline-flex; align-items:center; gap:5px; white-space:nowrap; -webkit-tap-highlight-color:transparent; }
.btn-gold:hover { background:#d4b87e; }
.btn-gold:active { transform:scale(.97); }
.btn-gold:disabled { opacity:.4; cursor:not-allowed; transform:none; }
.btn-ghost { background:transparent; color:#555; border:1px solid #1a1810; border-radius:8px; font-weight:600; cursor:pointer; font-family:inherit; transition:all .15s; -webkit-tap-highlight-color:transparent; }
.btn-ghost:hover { border-color:#222; color:#e8e0d0; }

/* ====== LANDING ====== */
.landing-root { height:100svh; display:flex; flex-direction:column; overflow:hidden; background:#070706; }

/* Nav */
.landing-nav { height:52px; display:flex; align-items:center; justify-content:space-between; padding:0 24px; border-bottom:1px solid rgba(255,255,255,.04); flex-shrink:0; animation:fadeIn .4s ease; }
.nav-links { display:flex; align-items:center; gap:20px; }
.nav-link { color:#444; font-size:13px; font-weight:500; text-decoration:none; cursor:pointer; transition:color .15s; background:none; border:none; font-family:inherit; }
.nav-link:hover { color:#888; }

/* Hero area */
.landing-hero { flex:1; display:grid; grid-template-columns:1fr 1fr; gap:0; overflow:hidden; }
@media(max-width:768px) { .landing-hero { grid-template-columns:1fr; } .landing-preview-col { display:none; } }

.landing-left { display:flex; flex-direction:column; justify-content:center; padding:40px 40px 40px 48px; overflow-y:auto; }
@media(max-width:900px) { .landing-left { padding:28px 24px; } }

.hero-badge { display:inline-flex; align-items:center; gap:6px; background:rgba(200,169,110,.08); border:1px solid rgba(200,169,110,.15); border-radius:20px; padding:5px 12px; font-size:11.5px; color:#c8a96e; font-weight:600; letter-spacing:.3px; margin-bottom:20px; animation:fadeUp .5s ease .1s both; width:fit-content; }
.hero-dot { width:6px; height:6px; border-radius:50%; background:#c8a96e; animation:pulse 2s ease infinite; }

.hero-headline { font-size:clamp(30px,4.5vw,52px); font-weight:900; line-height:1.1; letter-spacing:-2px; margin-bottom:16px; animation:fadeUp .5s ease .2s both; }
.hero-headline span { color:#c8a96e; }
.hero-sub { font-size:clamp(14px,1.8vw,17px); color:#555; line-height:1.7; margin-bottom:32px; animation:fadeUp .5s ease .3s both; max-width:420px; }

/* Input */
.main-input-wrap { width:100%; max-width:560px; position:relative; animation:fadeUp .5s ease .4s both; }
.main-input { width:100%; background:#0d0c0a; border:1.5px solid rgba(200,169,110,.18); border-radius:14px; padding:16px 56px 16px 18px; color:#e8e0d0; font-size:15px; font-family:inherit; line-height:1.5; resize:none; outline:none; transition:border-color .2s, box-shadow .2s; min-height:58px; max-height:140px; overflow-y:auto; display:block; }
.main-input:focus { border-color:rgba(200,169,110,.45); box-shadow:0 0 0 3px rgba(200,169,110,.06); }
.main-input::placeholder { color:#222; }
.send-btn { position:absolute; right:10px; bottom:10px; width:38px; height:38px; border-radius:10px; background:#c8a96e; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:17px; color:#0a0a08; font-weight:900; transition:all .15s; -webkit-tap-highlight-color:transparent; }
.send-btn:hover { background:#d4b87e; transform:scale(1.05); }
.send-btn:active { transform:scale(.95); }
.send-btn:disabled { opacity:.3; cursor:not-allowed; transform:none; }

/* Suggestion chips */
.suggestions-label { font-size:11px; color:#333; font-weight:600; letter-spacing:.5px; text-transform:uppercase; margin-top:14px; margin-bottom:8px; animation:fadeUp .5s ease .5s both; }
.suggestions-row { display:flex; flex-wrap:wrap; gap:7px; max-width:560px; animation:fadeUp .5s ease .55s both; }
.sug-chip { background:#0d0c0a; border:1px solid #181610; border-radius:20px; padding:7px 14px; font-size:12px; color:#555; cursor:pointer; font-family:inherit; white-space:nowrap; transition:all .18s; -webkit-tap-highlight-color:transparent; }
.sug-chip:hover { border-color:rgba(200,169,110,.3); color:#c8a96e; background:rgba(200,169,110,.04); transform:translateY(-1px); }
.sug-chip:active { transform:translateY(0); }

/* Social proof */
.social-proof { display:flex; align-items:center; gap:14px; margin-top:28px; animation:fadeUp .5s ease .65s both; }
.proof-avatars { display:flex; }
.proof-avatar { width:26px; height:26px; border-radius:50%; border:2px solid #070706; background:linear-gradient(135deg,#c8a96e,#a07840); display:flex; align-items:center; justify-content:center; font-size:10px; margin-left:-6px; font-weight:700; color:#0a0a08; flex-shrink:0; }
.proof-avatar:first-child { margin-left:0; }
.proof-text { font-size:12px; color:#444; line-height:1.5; }
.proof-text strong { color:#888; }

/* ── RIGHT SIDE: Preview carousel ── */
.landing-preview-col { display:flex; flex-direction:column; justify-content:center; align-items:center; padding:32px 48px 32px 24px; position:relative; overflow:hidden; }

.preview-frame-wrap { width:100%; max-width:360px; position:relative; animation:fadeUp .6s ease .25s both; }

/* Floating label */
.preview-floating-label { position:absolute; top:-14px; left:16px; background:#c8a96e; color:#0a0a08; font-size:10.5px; font-weight:800; padding:3px 10px; border-radius:10px; letter-spacing:.3px; z-index:10; }

/* Browser chrome */
.preview-chrome { background:#111; border:1px solid #1a1810; border-radius:12px; overflow:hidden; box-shadow:0 24px 80px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.03); }
.preview-chrome-bar { height:30px; background:#0d0c0a; border-bottom:1px solid #1a1810; display:flex; align-items:center; padding:0 10px; gap:6px; }
.chrome-dots { display:flex; gap:4px; }
.chrome-url { flex:1; background:#111; border-radius:4px; height:16px; display:flex; align-items:center; padding:0 8px; font-size:9px; color:#333; overflow:hidden; }

/* Mini site preview */
.preview-site { background:var(--site-bg); min-height:280px; padding:0; overflow:hidden; transition:all .4s ease; animation:previewFade .4s ease; }
.preview-site-hero { background:var(--site-bg); padding:20px 18px 16px; border-bottom:1px solid rgba(255,255,255,.05); }
.preview-site-emoji { font-size:22px; margin-bottom:8px; animation:float 3s ease infinite; display:inline-block; }
.preview-site-title { font-size:14px; font-weight:900; color:#fff; margin-bottom:3px; letter-spacing:-.3px; }
.preview-site-sub { font-size:9.5px; color:rgba(255,255,255,.4); margin-bottom:12px; }
.preview-site-tags { display:flex; flex-wrap:wrap; gap:4px; margin-bottom:12px; }
.preview-site-tag { background:rgba(255,255,255,.07); border-radius:4px; padding:2px 6px; font-size:8.5px; color:rgba(255,255,255,.5); }
.preview-site-cta { border:none; border-radius:6px; padding:7px 14px; font-size:10px; font-weight:800; color:#0a0a08; cursor:pointer; font-family:inherit; }

/* Nav dots */
.preview-nav { display:flex; gap:6px; justify-content:center; margin-top:14px; }
.preview-nav-dot { width:24px; height:4px; border-radius:2px; cursor:pointer; transition:all .25s; }
.preview-nav-dot.active { background:#c8a96e; }
.preview-nav-dot:not(.active) { background:#1a1810; }
.preview-nav-dot:hover:not(.active) { background:#2a2820; }

/* Side thumbnails */
.preview-thumbs { display:flex; flex-direction:column; gap:8px; position:absolute; right:12px; top:50%; transform:translateY(-50%); }
.preview-thumb { width:40px; height:32px; border-radius:6px; border:1.5px solid transparent; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:14px; transition:all .2s; overflow:hidden; }
.preview-thumb.active { border-color:rgba(200,169,110,.5); }
.preview-thumb:not(.active) { opacity:.4; }
.preview-thumb:not(.active):hover { opacity:.7; }

/* Stats ribbon */
.stats-ribbon { display:flex; gap:24px; padding:14px 48px; border-top:1px solid rgba(255,255,255,.04); flex-shrink:0; animation:fadeIn .5s ease 1s both; }
.stat-item { text-align:center; flex:1; }
.stat-num { font-size:17px; font-weight:900; color:#c8a96e; }
.stat-label { font-size:10px; color:#333; margin-top:1px; letter-spacing:.3px; text-transform:uppercase; }

/* ====== BUILDER ====== */
.builder-wrap { height:100svh; display:flex; flex-direction:column; animation:fadeIn .3s ease; }
.builder-topbar { height:50px; background:#0a0a08; border-bottom:1px solid #1a1810; display:flex; align-items:center; padding:0 10px; gap:8px; flex-shrink:0; z-index:20; }
.builder-body { flex:1; display:flex; overflow:hidden; min-height:0; }

.chat-panel { width:320px; flex-shrink:0; display:flex; flex-direction:column; background:#0a0a08; border-right:1px solid #1a1810; }
.chat-messages { flex:1; overflow-y:auto; padding:14px 12px; display:flex; flex-direction:column; gap:10px; scroll-behavior:smooth; }
.chat-messages::-webkit-scrollbar { width:3px; }
.chat-messages::-webkit-scrollbar-thumb { background:#1a1810; border-radius:2px; }
.msg-bubble { padding:10px 13px; font-size:13.5px; line-height:1.6; animation:slideIn .2s ease; border-radius:12px; }
.msg-user { align-self:flex-end; max-width:90%; background:#c8a96e; color:#0a0a08; font-weight:500; border-radius:14px 14px 3px 14px; }
.msg-ai { align-self:flex-start; max-width:92%; background:#111; color:#c8c0b0; border:1px solid #1a1810; border-radius:14px 14px 14px 3px; }
.typing-wrap { align-self:flex-start; background:#111; border:1px solid #1a1810; border-radius:14px 14px 14px 3px; padding:12px 16px; display:flex; gap:5px; animation:slideIn .2s ease; }
.typing-dot { width:6px; height:6px; border-radius:50%; background:#c8a96e; }
.chat-input-area { padding:8px 10px 12px; border-top:1px solid #1a1810; flex-shrink:0; }
.quick-edits { display:flex; gap:6px; overflow-x:auto; padding-bottom:7px; scrollbar-width:none; }
.quick-edits::-webkit-scrollbar { display:none; }
.quick-chip { background:transparent; border:1px solid #1a1810; border-radius:16px; padding:5px 11px; font-size:11.5px; color:#444; cursor:pointer; font-family:inherit; white-space:nowrap; transition:all .15s; flex-shrink:0; -webkit-tap-highlight-color:transparent; }
.quick-chip:hover { border-color:rgba(200,169,110,.25); color:#c8a96e; }
.chat-input-row { display:flex; gap:7px; align-items:flex-end; }
.chat-ta { flex:1; background:#0d0c0a; border:1px solid #1a1810; border-radius:10px; padding:10px 12px; color:#e8e0d0; font-size:14px; font-family:inherit; resize:none; outline:none; line-height:1.5; max-height:100px; transition:border-color .15s; }
.chat-ta:focus { border-color:rgba(200,169,110,.3); }
.chat-ta::placeholder { color:#2a2922; }
.chat-ta:disabled { opacity:.5; }
.chat-send-btn { width:36px; height:36px; border-radius:9px; background:#c8a96e; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:16px; font-weight:900; color:#0a0a08; transition:all .15s; flex-shrink:0; -webkit-tap-highlight-color:transparent; }
.chat-send-btn:hover { background:#d4b87e; }
.chat-send-btn:active { transform:scale(.94); }
.chat-send-btn:disabled { opacity:.35; cursor:not-allowed; transform:none; }

.preview-panel { flex:1; display:flex; flex-direction:column; min-width:0; background:#0d0c0a; position:relative; }
.preview-bar { height:38px; background:#0a0a08; border-bottom:1px solid #1a1810; display:flex; align-items:center; padding:0 10px; gap:8px; flex-shrink:0; }
.preview-dots { display:flex; gap:5px; flex-shrink:0; }
.url-bar { flex:1; background:#111; border:1px solid #1a1810; border-radius:6px; height:24px; display:flex; align-items:center; padding:0 10px; font-size:11px; color:#444; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; min-width:0; }
.device-btn { width:27px; height:27px; border-radius:6px; background:transparent; border:1px solid transparent; color:#444; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:13px; transition:all .15s; -webkit-tap-highlight-color:transparent; }
.device-btn.active { background:rgba(200,169,110,.1); border-color:rgba(200,169,110,.25); color:#c8a96e; }

.gen-overlay { position:absolute; inset:0; background:#0a0a08; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:28px; z-index:10; animation:fadeIn .3s ease; }
.gen-step { display:flex; align-items:center; gap:10px; font-size:13px; color:#333; transition:color .3s; }
.gen-step.active { color:#c8a96e; }
.gen-step.done { color:#3a3228; }
.gen-dot { width:8px; height:8px; border-radius:50%; background:currentColor; flex-shrink:0; }
.gen-step.active .gen-dot { animation:pulse 1s ease infinite; }
`;

export default function Home() {
  const router = useRouter();
  const [appState, setAppState] = useState<AppState>("landing");
  const [landingInput, setLandingInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [siteHtml, setSiteHtml] = useState("");
  const [generating, setGenerating] = useState(false);
  const [device, setDevice] = useState<Device>("desktop");
  const [businessName, setBusinessName] = useState("");
  const [genStep, setGenStep] = useState(0);
  const [activePreview, setActivePreview] = useState(0);

  const landingRef = useRef<HTMLTextAreaElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const chatTaRef = useRef<HTMLTextAreaElement>(null);
  const historyRef = useRef<{ role: string; content: string }[]>([]);

  // Auto-cycle previews
  useEffect(() => {
    if (appState !== "landing") return;
    const t = setInterval(() => setActivePreview(p => (p + 1) % PREVIEW_SITES.length), 3200);
    return () => clearInterval(t);
  }, [appState]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (siteHtml && iframeRef.current) {
      const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
      if (doc) { doc.open(); doc.write(siteHtml); doc.close(); }
    }
  }, [siteHtml]);

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  };

  // Gen step animation
  useEffect(() => {
    if (!generating) { setGenStep(0); return; }
    setGenStep(0);
    const timings = [800, 1600, 2800, 4200, 5800, 7200];
    const timers = timings.map((t, i) => setTimeout(() => setGenStep(i), t));
    return () => timers.forEach(clearTimeout);
  }, [generating]);

  const addMsg = useCallback((role: "user" | "assistant", content: string) => {
    const msg = { id: Math.random().toString(36).slice(2), role, content, ts: Date.now() };
    setMessages(prev => [...prev, msg]);
    historyRef.current.push({ role, content });
    if (historyRef.current.length > 20) historyRef.current = historyRef.current.slice(-20);
  }, []);

  const callAPI = useCallback(async (userMsg: string, currentHtml: string, bizName: string) => {
    setGenerating(true);
    try {
      const res = await fetch("/api/chat-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          currentHtml,
          businessName: bizName,
          conversationHistory: historyRef.current.slice(-10),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSiteHtml(data.html);
      if (data.businessName) setBusinessName(data.businessName);
      addMsg("assistant", data.message || "Done! What else would you like to change?");
    } catch {
      addMsg("assistant", "Something went wrong — try rephrasing and I'll try again.");
    } finally {
      setGenerating(false);
    }
  }, [addMsg]);

  const handleLaunch = useCallback((inputOverride?: string) => {
    const text = (inputOverride || landingInput).trim();
    if (!text || generating) return;
    const biz = text.split(/[—\-]/)[0].trim();
    setBusinessName(biz);
    setAppState("builder");
    addMsg("user", text);
    addMsg("assistant", `On it — building your site for ${biz}. Give me about 15 seconds.`);
    callAPI(`Build a complete, premium, conversion-focused website for this business: ${text}. Make it look like it was designed by a professional agency — bold typography, strong CTAs, real-looking copy, mobile-responsive. Include hero, services, social proof, and contact sections.`, "", biz);
  }, [landingInput, generating, callAPI, addMsg]);

  const handleChatSend = useCallback(() => {
    const text = chatInput.trim();
    if (!text || generating) return;
    setChatInput("");
    if (chatTaRef.current) chatTaRef.current.style.height = "auto";
    addMsg("user", text);
    callAPI(text, siteHtml, businessName);
  }, [chatInput, generating, siteHtml, businessName, callAPI, addMsg]);

  const site = PREVIEW_SITES[activePreview];
  const previewWidth = device === "desktop" ? "100%" : device === "tablet" ? "768px" : "390px";

  // ========================
  // LANDING
  // ========================
  if (appState === "landing") return (
    <div className="landing-root">
      <style>{CSS}

/* ===== MOBILE OPTIMIZATIONS (Android / all small screens) ===== */
@media(max-width:480px) {
  /* Nav: hide text links, keep logo + CTA */
  .nav-links .nav-link { display:none; }
  .landing-nav { padding:0 16px; }
  
  /* Hero: allow scrolling, reduce padding */
  html, body { overflow:auto; }
  .landing-root { height:auto; min-height:100svh; overflow-y:auto; }
  .landing-left { padding:20px 16px 28px; justify-content:flex-start; overflow-y:visible; }
  
  /* Typography: tighter letter spacing fix */
  .hero-headline { font-size:clamp(26px,8vw,40px); letter-spacing:-1px; }
  .hero-sub { font-size:14px; margin-bottom:24px; max-width:100%; }
  
  /* Input: force 16px to prevent zoom, full width */
  .main-input { font-size:16px !important; padding:14px 52px 14px 14px; }
  .main-input-wrap { max-width:100%; }
  
  /* Suggestions: smaller chips, more wrap */
  .sug-chip { font-size:11px; padding:6px 11px; }
  .suggestions-row { gap:5px; }
  
  /* Stats ribbon: tighten */
  .stats-ribbon { padding:12px 16px; gap:0; }
  .stat-num { font-size:15px; }
  .stat-label { font-size:9px; }
  
  /* Social proof: stack on very small */
  .social-proof { gap:10px; margin-top:20px; }
  .proof-text { font-size:11px; }
}

@media(max-width:360px) {
  .hero-headline { font-size:24px; }
  .landing-left { padding:16px 14px 24px; }
  .sug-chip { font-size:10.5px; padding:5px 9px; }
}

/* ===== BUILD PAGE MOBILE ===== */
@media(max-width:640px) {
  /* Builder body: full height for preview */
  .builder-body { flex-direction:column; }
  .chat-panel { display:none; }
  .preview-panel { flex:1; min-height:0; }
  
  /* Topbar: tighter on mobile */
  .builder-topbar { padding:0 8px; gap:5px; }
  
  /* Preview bar: hide device buttons */
  .preview-bar .device-btn:not(.active) { display:none; }
  
  /* Input fields: prevent zoom */
  input, textarea, select { font-size:16px !important; }
}
`</style>

      {/* Nav */}
      <nav className="landing-nav">
        <div className="logo">
          <div className="logo-mark">S</div>
          <div className="logo-text">Site<span>craft</span></div>
        </div>
        <div className="nav-links">
          <button className="nav-link" onClick={() => router.push("/how-it-works")}>How it works</button>
          <button className="nav-link" onClick={() => router.push("/pricing")}>Pricing</button>
          <button className="nav-link" onClick={() => router.push("/case-studies")}>Examples</button>
          <button className="btn-gold" style={{ padding: "7px 16px", fontSize: 13 }} onClick={() => router.push("/dashboard")}>Dashboard →</button>
        </div>
      </nav>

      {/* Hero */}
      <div className="landing-hero">

        {/* LEFT — headline + input */}
        <div className="landing-left">
          <div className="hero-badge">
            <span className="hero-dot" />
            The fastest way to build a website
          </div>

          <h1 className="hero-headline">
            Describe your<br />
            business.<br />
            <span>Watch your site appear.</span>
          </h1>

          <p className="hero-sub">
            Tell Sitecraft what you do and where you are. A complete, professional website is ready in 15 seconds — then chat to refine it until it's perfect.
          </p>

          <div className="main-input-wrap">
            <textarea
              ref={landingRef}
              className="main-input"
              rows={2}
              placeholder="e.g. Darkline Tattoo — custom tattoo studio, walk-ins welcome"
              value={landingInput}
              onChange={e => { setLandingInput(e.target.value); autoResize(e.target); }}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleLaunch(); } }}
            />
            <button className="send-btn" onClick={() => handleLaunch()} disabled={!landingInput.trim()}>↗</button>
          </div>

          <div className="suggestions-label">Try one of these</div>
          <div className="suggestions-row">
            {PROMPT_SUGGESTIONS.map((p, i) => (
              <button
                key={i}
                className="sug-chip"
                onClick={() => {
                  setLandingInput(p.value);
                  setTimeout(() => landingRef.current?.focus(), 50);
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="social-proof">
            <div className="proof-avatars">
              {["A","B","C","D"].map((l, i) => (
                <div key={i} className="proof-avatar" style={{ background: `hsl(${30 + i * 40}, 60%, 45%)` }}>{l}</div>
              ))}
            </div>
            <div className="proof-text">
              <strong>500+ creators &amp; businesses</strong> launched their site with Sitecraft
            </div>
          </div>
        </div>

        {/* RIGHT — live preview carousel */}
        <div className="landing-preview-col">
          <div className="preview-frame-wrap">
            <div className="preview-floating-label">
              {site.label}
            </div>

            <div className="preview-chrome">
              <div className="preview-chrome-bar">
                <div className="chrome-dots">
                  {["#ff5f57","#febc2e","#28c840"].map(c => (
                    <div key={c} style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />
                  ))}
                </div>
                <div className="chrome-url">
                  {site.hero.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20)}.sitecraft.ai
                </div>
              </div>

              <div
                key={activePreview}
                className="preview-site"
                style={{ ["--site-bg" as string]: site.bg }}
              >
                {/* Hero section */}
                <div className="preview-site-hero" style={{ ["--site-bg" as string]: site.bg }}>
                  <div className="preview-site-emoji">{site.emoji}</div>
                  <div className="preview-site-title">{site.hero}</div>
                  <div className="preview-site-sub">{site.sub}</div>
                  <div className="preview-site-tags">
                    {site.tags.map((t, i) => <span key={i} className="preview-site-tag">{t}</span>)}
                  </div>
                  <button
                    className="preview-site-cta"
                    style={{ background: site.accent }}
                  >
                    Get a Free Quote →
                  </button>
                </div>

                {/* Fake content blocks */}
                <div style={{ padding: "12px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
                  {/* Services row */}
                  <div style={{ display: "flex", gap: 6 }}>
                    {[0,1,2].map(i => (
                      <div key={i} style={{ flex: 1, background: "rgba(255,255,255,.04)", borderRadius: 6, height: 36, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <div style={{ width: "60%", height: 7, background: "rgba(255,255,255,.08)", borderRadius: 3 }} />
                      </div>
                    ))}
                  </div>
                  {/* Stat pill */}
                  <div style={{ background: `${site.accent}18`, border: `1px solid ${site.accent}30`, borderRadius: 6, padding: "6px 10px", fontSize: 9, color: site.accent, fontWeight: 700, textAlign: "center" }}>
                    {site.stat}
                  </div>
                  {/* Testimonial */}
                  <div style={{ background: "rgba(255,255,255,.03)", borderRadius: 6, padding: "8px 10px" }}>
                    <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                      {"★★★★★".split("").map((s, i) => <span key={i} style={{ color: "#f59e0b", fontSize: 9 }}>{s}</span>)}
                    </div>
                    <div style={{ height: 6, background: "rgba(255,255,255,.07)", borderRadius: 3, marginBottom: 3, width: "90%" }} />
                    <div style={{ height: 6, background: "rgba(255,255,255,.05)", borderRadius: 3, width: "65%" }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Dot nav */}
            <div className="preview-nav">
              {PREVIEW_SITES.map((_, i) => (
                <div
                  key={i}
                  className={`preview-nav-dot${i === activePreview ? " active" : ""}`}
                  onClick={() => setActivePreview(i)}
                />
              ))}
            </div>
          </div>

          {/* Side thumbnails */}
          <div className="preview-thumbs">
            {PREVIEW_SITES.map((s, i) => (
              <div
                key={i}
                className={`preview-thumb${i === activePreview ? " active" : ""}`}
                style={{ background: s.bg }}
                onClick={() => setActivePreview(i)}
              >
                <span style={{ fontSize: 14 }}>{s.emoji}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats ribbon */}
      <div className="stats-ribbon">
        {[
          { num: "15s", label: "avg build time" },
          { num: "200+", label: "sites launched" },
          { num: "100%", label: "mobile ready" },
          { num: "∞", label: "revisions" },
        ].map((s, i) => (
          <div key={i} className="stat-item">
            <div className="stat-num">{s.num}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );

  // ========================
  // BUILDER
  // ========================
  return (
    <div className="builder-wrap">
      <style>{CSS}</style>

      <div className="builder-topbar">
        <div className="logo">
          <div className="logo-mark" style={{ width: 26, height: 26, fontSize: 12 }}>S</div>
          <div className="logo-text" style={{ fontSize: 14 }}>Site<span>craft</span></div>
        </div>
        <div style={{ width: 1, height: 18, background: "#1a1810", margin: "0 2px" }} />
        <div style={{ fontSize: 13, color: "#444", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>{businessName}</div>
        <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
          {(["desktop","tablet","mobile"] as const).map(d => (
            <button key={d} className={`device-btn${device===d?" active":""}`} onClick={() => setDevice(d)} title={d}>
              {d==="desktop"?"🖥":d==="tablet"?"⬜":"📱"}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <button className="btn-ghost" style={{ padding: "6px 12px", fontSize: 13 }} onClick={() => { setAppState("landing"); setMessages([]); setSiteHtml(""); setLandingInput(""); historyRef.current = []; }}>New</button>
          <button className="btn-gold" style={{ padding: "7px 14px", fontSize: 13 }} onClick={() => router.push("/build")}>Edit & Publish →</button>
        </div>
      </div>

      <div className="builder-body">
        <div className="chat-panel">
          <div className="chat-messages">
            {messages.map(m => (
              <div key={m.id} className={`msg-bubble ${m.role==="user"?"msg-user":"msg-ai"}`}>{m.content}</div>
            ))}
            {generating && (
              <div className="typing-wrap">
                {[0,1,2].map(i => <div key={i} className="typing-dot" style={{ animation: `pulse 1.2s ease ${i*.2}s infinite` }} />)}
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {messages.length >= 2 && !generating && (
            <div style={{ padding: "4px 10px 0" }}>
              <div className="quick-edits">
                {QUICK_EDITS.map((q, i) => (
                  <button key={i} className="quick-chip" onClick={() => { setChatInput(q); chatTaRef.current?.focus(); }}>{q}</button>
                ))}
              </div>
            </div>
          )}

          <div className="chat-input-area">
            <div className="chat-input-row">
              <textarea
                ref={chatTaRef}
                className="chat-ta"
                rows={1}
                placeholder={generating ? "Working on it…" : "Ask me to change anything…"}
                value={chatInput}
                disabled={generating}
                onChange={e => { setChatInput(e.target.value); autoResize(e.target); }}
                onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); handleChatSend(); } }}
                style={{ fontSize: "16px" }}
              />
              <button className="chat-send-btn" onClick={handleChatSend} disabled={!chatInput.trim()||generating}>↗</button>
            </div>
          </div>
        </div>

        <div className="preview-panel">
          <div className="preview-bar">
            <div className="preview-dots">
              {["#ff5f57","#febc2e","#28c840"].map(c => <div key={c} style={{ width:10,height:10,borderRadius:"50%",background:c }} />)}
            </div>
            <div className="url-bar">
              {businessName ? `${businessName.toLowerCase().replace(/[^a-z0-9]/g,"")}.sitecraft.ai` : "sitecraft.ai"}
            </div>
          </div>

          {generating && !siteHtml && (
            <div className="gen-overlay">
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10, textAlign:"center" }}>
                <div className="logo-mark" style={{ width:48, height:48, fontSize:22, marginBottom:4 }}>S</div>
                <div style={{ fontSize:17, fontWeight:800, color:"#e8e0d0" }}>Building your site</div>
                <div style={{ fontSize:13, color:"#555" }}>~15 seconds</div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10, minWidth:220 }}>
                {GEN_STEPS.map((s, i) => (
                  <div key={i} className={`gen-step${i===genStep?" active":i<genStep?" done":""}`}>
                    <div className="gen-dot" />
                    {s}
                  </div>
                ))}
              </div>
            </div>
          )}

          {generating && siteHtml && (
            <div style={{ position:"absolute", top:46, right:12, zIndex:10, background:"#0a0a08", border:"1px solid #1a1810", borderRadius:10, padding:"7px 13px", display:"flex", alignItems:"center", gap:8, fontSize:12, color:"#777" }}>
              <div style={{ width:13,height:13,borderRadius:"50%",border:"2px solid #1a1810",borderTopColor:"#c8a96e",animation:"spin 1s linear infinite" }} />
              Updating…
            </div>
          )}

          <div style={{ flex:1, overflow:"auto", display:"flex", justifyContent:"center", background:device!=="desktop"?"#1a1810":"#111", padding:device!=="desktop"?"16px":"0" }}>
            <iframe
              ref={iframeRef}
              style={{ width:previewWidth, height:device!=="desktop"?"calc(100svh - 130px)":"100%", border:"none", background:"#fff", borderRadius:device!=="desktop"?"8px":"0", boxShadow:device!=="desktop"?"0 4px 40px rgba(0,0,0,.5)":"none", transition:"width .3s ease", flexShrink:0 }}
              title="preview"
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
