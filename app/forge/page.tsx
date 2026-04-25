"use client";
import { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────
interface AgentConfig {
  name: string;
  tagline: string;
  personality: string;
  tone: string;
  primaryColor: string;
  accentColor: string;
  expertise: string[];
  channels: string[];
  integrations: string[];
  responseStyle: string;
  industry: string;
  avatarEmoji: string;
  businessContext: string;
  capabilities: string[];
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const PERSONALITIES = [
  { id: "warm-expert",    label: "Warm Expert",     desc: "Friendly, knowledgeable, reassuring",      emoji: "🤝" },
  { id: "sharp-advisor",  label: "Sharp Advisor",   desc: "Direct, no-nonsense, results-focused",    emoji: "⚡" },
  { id: "creative-spark", label: "Creative Spark",  desc: "Enthusiastic, inventive, big-picture",    emoji: "✨" },
  { id: "calm-guide",     label: "Calm Guide",      desc: "Patient, thorough, detail-oriented",      emoji: "🧭" },
  { id: "bold-closer",    label: "Bold Closer",     desc: "Confident, persuasive, action-oriented",  emoji: "🎯" },
];

const TONES = [
  { id: "professional", label: "Professional" },
  { id: "casual",       label: "Casual & Friendly" },
  { id: "playful",      label: "Playful" },
  { id: "premium",      label: "Premium / Luxury" },
  { id: "technical",    label: "Technical" },
];

const INDUSTRIES = [
  "Construction & Trades", "Real Estate", "Healthcare", "Legal",
  "Retail & E-commerce", "Hospitality", "Fitness & Wellness",
  "Education", "Technology", "Finance", "Marketing & Creative", "Other",
];

const INTEGRATIONS = [
  { id: "gmail",    label: "Gmail",         icon: "📧" },
  { id: "calendar", label: "Google Calendar", icon: "📅" },
  { id: "slack",    label: "Slack",          icon: "💬" },
  { id: "crm",      label: "CRM / HubSpot",  icon: "🏢" },
  { id: "stripe",   label: "Stripe",         icon: "💳" },
  { id: "sheets",   label: "Google Sheets",  icon: "📊" },
  { id: "notion",   label: "Notion",         icon: "📝" },
  { id: "twilio",   label: "SMS / Twilio",   icon: "📱" },
];

const CHANNELS = [
  { id: "web",      label: "Web Chat",   icon: "🌐" },
  { id: "imessage", label: "iMessage",   icon: "💬" },
  { id: "telegram", label: "Telegram",   icon: "✈️" },
  { id: "slack",    label: "Slack",      icon: "⚡" },
  { id: "whatsapp", label: "WhatsApp",   icon: "📱" },
  { id: "email",    label: "Email",      icon: "📧" },
];

const COLOR_PRESETS = [
  { label: "Gold",    primary: "#c8a96e", bg: "#0b0b09" },
  { label: "Blue",    primary: "#3b82f6", bg: "#080e1a" },
  { label: "Purple",  primary: "#a855f7", bg: "#0d0810" },
  { label: "Green",   primary: "#4ade80", bg: "#080f0b" },
  { label: "Red",     primary: "#ef4444", bg: "#110808" },
  { label: "Teal",    primary: "#14b8a6", bg: "#07100f" },
  { label: "Orange",  primary: "#f97316", bg: "#110a04" },
  { label: "Silver",  primary: "#94a3b8", bg: "#09090d" },
];

const AVATARS = ["🤖","✦","⚡","🧠","🎯","🦾","💎","🌐","🔮","🛸","👾","🦅"];

const STEP_LABELS = ["Identity", "Personality", "Expertise", "Channels", "Preview"];

// ─── Component ───────────────────────────────────────────────────────────────
export default function ForgePage() {
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<AgentConfig>({
    name: "",
    tagline: "",
    personality: "warm-expert",
    tone: "professional",
    primaryColor: "#c8a96e",
    accentColor: "#0b0b09",
    expertise: [],
    channels: ["web"],
    integrations: [],
    responseStyle: "",
    industry: "",
    avatarEmoji: "✦",
    businessContext: "",
    capabilities: [],
  });
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [expertiseInput, setExpertiseInput] = useState("");
  const [capabilityInput, setCapabilityInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [agentCode, setAgentCode] = useState("");
  const [copied, setCopied] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const update = (patch: Partial<AgentConfig>) => setConfig(c => ({ ...c, ...patch }));

  const toggle = (field: "expertise" | "channels" | "integrations" | "capabilities", val: string) => {
    setConfig(c => ({
      ...c,
      [field]: c[field].includes(val) ? c[field].filter(x => x !== val) : [...c[field], val],
    }));
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, chatLoading]);

  // AI chat assistant for the Forge
  const sendChat = useCallback(async () => {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim();
    setChatInput("");
    setChatLoading(true);
    const newHistory = [...chatHistory, { role: "user" as const, content: msg }];
    setChatHistory(newHistory);

    try {
      const res = await fetch("/api/forge-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, config, history: chatHistory.slice(-6) }),
      });
      const data = await res.json();
      if (data.reply) {
        setChatHistory(h => [...h, { role: "assistant", content: data.reply }]);
      }
      if (data.patch) {
        update(data.patch);
      }
    } catch {
      setChatHistory(h => [...h, { role: "assistant", content: "Something went wrong — try again." }]);
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, chatLoading, chatHistory, config]);

  // Generate the agent config/code
  const generateAgent = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/forge-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      const data = await res.json();
      if (data.code) {
        setAgentCode(data.code);
        setGenerated(true);
      }
    } catch {
      alert("Generation failed — try again.");
    } finally {
      setGenerating(false);
    }
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(agentCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const selectedPersonality = PERSONALITIES.find(p => p.id === config.personality);
  const selectedColorPreset = COLOR_PRESETS.find(c => c.primary === config.primaryColor);

  const canAdvance = () => {
    if (step === 0) return config.name.trim().length > 1 && config.industry;
    if (step === 1) return config.personality && config.tone;
    if (step === 2) return config.expertise.length > 0 || config.businessContext.trim().length > 10;
    if (step === 3) return config.channels.length > 0;
    return true;
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#0b0b09", color: "#e8e2d8",
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Instrument+Serif:ital@0;1&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:#111}
        ::-webkit-scrollbar-thumb{background:#2a2820;border-radius:2px}
        textarea,input{outline:none;font-family:inherit}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:0.4}50%{opacity:1}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes glow{0%,100%{box-shadow:0 0 20px rgba(200,169,110,0.2)}50%{box-shadow:0 0 40px rgba(200,169,110,0.45)}}
        .forge-btn{background:transparent;border:1px solid rgba(255,255,255,0.08);cursor:pointer;border-radius:9px;padding:10px 16px;color:rgba(232,226,216,0.6);font-size:13px;font-weight:500;transition:all 0.15s;font-family:inherit;text-align:left}
        .forge-btn:hover{border-color:rgba(200,169,110,0.4);color:#e8e2d8}
        .forge-btn.sel{background:rgba(200,169,110,0.1);border-color:rgba(200,169,110,0.5);color:#c8a96e;font-weight:700}
        .chip{background:#111;border:1px solid #1e1e14;border-radius:20px;padding:6px 13px;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.15s;color:rgba(232,226,216,0.55);font-family:inherit}
        .chip:hover{border-color:rgba(200,169,110,0.35);color:#e8e2d8}
        .chip.sel{background:rgba(200,169,110,0.12);border-color:rgba(200,169,110,0.5);color:#c8a96e}
        .forge-input{background:#111;border:1px solid #252520;border-radius:10px;padding:12px 15px;color:#e8e2d8;font-size:14px;width:100%;font-family:inherit;transition:border 0.15s}
        .forge-input:focus{border-color:rgba(200,169,110,0.5)}
        .forge-input::placeholder{color:rgba(232,226,216,0.25)}
        .step-dot{width:8px;height:8px;border-radius:50%;border:1px solid rgba(255,255,255,0.15);cursor:pointer;transition:all 0.2s;flex-shrink:0}
        .step-dot.done{background:#4ade80;border-color:#4ade80}
        .step-dot.active{background:#c8a96e;border-color:#c8a96e;width:24px;border-radius:4px}
        .step-dot.future{background:transparent}
        .nav-link{color:rgba(232,226,216,0.5);text-decoration:none;font-size:13px;font-weight:500;transition:color 0.15s}
        .nav-link:hover{color:#e8e2d8}
        .primary-btn{background:linear-gradient(135deg,#c8a96e,#e0c080);border:none;border-radius:10px;padding:13px 28px;color:#0b0b09;font-weight:800;font-size:14px;cursor:pointer;font-family:inherit;transition:all 0.15s;display:inline-flex;align-items:center;gap:8px}
        .primary-btn:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(200,169,110,0.35)}
        .primary-btn:disabled{opacity:0.4;cursor:not-allowed;transform:none}
        .ghost-btn{background:transparent;border:1px solid rgba(255,255,255,0.12);border-radius:10px;padding:12px 24px;color:rgba(232,226,216,0.7);font-weight:600;font-size:13px;cursor:pointer;font-family:inherit;transition:all 0.15s}
        .ghost-btn:hover{border-color:rgba(255,255,255,0.3);color:#e8e2d8}
        .chat-bubble{padding:10px 14px;border-radius:12px;font-size:13px;line-height:1.6;max-width:85%;animation:fadeUp 0.2s ease forwards}
        .tag{display:inline-flex;align-items:center;gap:6px;background:rgba(200,169,110,0.08);border:1px solid rgba(200,169,110,0.2);border-radius:6px;padding:4px 10px;font-size:12px;color:#c8a96e;font-weight:600}
        .avatar-opt{width:42px;height:42px;border-radius:10px;border:1px solid rgba(255,255,255,0.08);background:#111;display:flex;align-items:center;justify-content:center;font-size:20px;cursor:pointer;transition:all 0.15s}
        .avatar-opt:hover{border-color:rgba(200,169,110,0.4);background:rgba(200,169,110,0.08)}
        .avatar-opt.sel{border-color:rgba(200,169,110,0.7);background:rgba(200,169,110,0.15)}
        .color-dot{width:26px;height:26px;border-radius:50%;cursor:pointer;border:2px solid rgba(255,255,255,0.08);transition:all 0.15s;flex-shrink:0}
        .color-dot:hover{transform:scale(1.2);border-color:rgba(255,255,255,0.4)}
        .color-dot.sel{transform:scale(1.25);border-color:rgba(255,255,255,0.8)}
      `}</style>

      {/* ─── NAV ──────────────────────────────────────────────────────────── */}
      <nav style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"0 40px", height:60, borderBottom:"1px solid rgba(255,255,255,0.05)",
        background:"rgba(11,11,9,0.95)", backdropFilter:"blur(20px)",
        position:"sticky", top:0, zIndex:100,
      }}>
        <a href="/" style={{ textDecoration:"none", display:"flex", alignItems:"center", gap:10 }}>
          <div style={{
            width:30, height:30, borderRadius:7,
            background:"linear-gradient(135deg,#c8a96e,#a07840)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontWeight:900, fontSize:14, color:"#0b0b09",
          }}>S</div>
          <span style={{ fontSize:15, fontWeight:700, color:"rgba(232,226,216,0.9)" }}>Sitecraft</span>
        </a>
        <div style={{ display:"flex", alignItems:"center", gap:24 }}>
          <a href="/" className="nav-link">Websites</a>
          <a href="/forge" className="nav-link" style={{ color:"#c8a96e" }}>Forge Agent ✦</a>
          <a href="/pricing" className="nav-link">Pricing</a>
          <a href="/dashboard" className="nav-link">Dashboard</a>
        </div>
        <a href="/build" style={{
          background:"rgba(200,169,110,0.1)", border:"1px solid rgba(200,169,110,0.3)",
          borderRadius:8, padding:"7px 16px", color:"#c8a96e", textDecoration:"none",
          fontSize:13, fontWeight:700,
        }}>Build a site →</a>
      </nav>

      {/* ─── HERO ─────────────────────────────────────────────────────────── */}
      <div style={{
        textAlign:"center", padding:"70px 24px 50px",
        background:"radial-gradient(ellipse at 50% 0%,rgba(200,169,110,0.07) 0%,transparent 55%)",
        borderBottom:"1px solid rgba(255,255,255,0.04)",
      }}>
        <div style={{
          display:"inline-flex", alignItems:"center", gap:8,
          background:"rgba(200,169,110,0.08)", border:"1px solid rgba(200,169,110,0.25)",
          borderRadius:100, padding:"6px 16px", fontSize:12, fontWeight:700,
          color:"#c8a96e", letterSpacing:"0.05em", textTransform:"uppercase", marginBottom:24,
        }}>
          ⚡ Forge — AI Agent Builder
        </div>
        <h1 style={{
          fontFamily:"'Instrument Serif', serif", fontSize:"clamp(2.5rem,5vw,4.5rem)",
          fontWeight:400, letterSpacing:"-0.03em", lineHeight:1.05,
          color:"#e8e2d8", marginBottom:18,
        }}>
          Build your own AI agent.<br />
          <span style={{ color:"#c8a96e", fontStyle:"italic" }}>No code. Just intent.</span>
        </h1>
        <p style={{
          fontSize:"1.1rem", color:"rgba(232,226,216,0.5)", maxWidth:520,
          margin:"0 auto 40px", lineHeight:1.7,
        }}>
          Define its personality. Give it knowledge. Connect it to your tools.
          Your agent is live and working in minutes — not months.
        </p>

        {/* Step progress */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginBottom:8 }}>
          {STEP_LABELS.map((label, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div
                className={`step-dot ${i < step ? "done" : i === step ? "active" : "future"}`}
                onClick={() => i < step && setStep(i)}
                title={label}
              />
              {i < STEP_LABELS.length - 1 && (
                <div style={{ width:20, height:1, background:i < step ? "#4ade80" : "#1e1e14" }} />
              )}
            </div>
          ))}
        </div>
        <div style={{ fontSize:11, color:"rgba(232,226,216,0.3)", fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase" }}>
          Step {step + 1} of {STEP_LABELS.length} — {STEP_LABELS[step]}
        </div>
      </div>

      {/* ─── MAIN LAYOUT ─────────────────────────────────────────────────── */}
      <div style={{
        maxWidth:1100, margin:"0 auto", padding:"48px 24px",
        display:"grid", gridTemplateColumns:"1fr 380px", gap:40, alignItems:"start",
      }}>

        {/* ─── LEFT: Config Steps ───────────────────────────────────────── */}
        <div style={{ display:"flex", flexDirection:"column", gap:32 }}>

          {/* ── STEP 0: Identity ─────────────────────────────────────────── */}
          {step === 0 && (
            <div style={{ animation:"fadeUp 0.3s ease forwards" }}>
              <h2 style={{ fontFamily:"'Instrument Serif',serif", fontSize:"1.8rem", fontWeight:400, color:"#e8e2d8", marginBottom:6 }}>
                Name your agent.
              </h2>
              <p style={{ color:"rgba(232,226,216,0.45)", fontSize:14, marginBottom:32, lineHeight:1.6 }}>
                This is the personality that will represent your business 24/7. Give it a name that fits your brand.
              </p>

              <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
                {/* Name + tagline */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                  <div>
                    <label style={{ fontSize:12, fontWeight:700, color:"rgba(232,226,216,0.4)", letterSpacing:"0.06em", textTransform:"uppercase", display:"block", marginBottom:8 }}>Agent Name</label>
                    <input className="forge-input" placeholder="e.g. Max, Nova, Aria, Riley…" value={config.name} onChange={e=>update({name:e.target.value})} />
                  </div>
                  <div>
                    <label style={{ fontSize:12, fontWeight:700, color:"rgba(232,226,216,0.4)", letterSpacing:"0.06em", textTransform:"uppercase", display:"block", marginBottom:8 }}>Tagline</label>
                    <input className="forge-input" placeholder="e.g. Your 24/7 booking assistant" value={config.tagline} onChange={e=>update({tagline:e.target.value})} />
                  </div>
                </div>

                {/* Industry */}
                <div>
                  <label style={{ fontSize:12, fontWeight:700, color:"rgba(232,226,216,0.4)", letterSpacing:"0.06em", textTransform:"uppercase", display:"block", marginBottom:10 }}>Industry</label>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                    {INDUSTRIES.map(ind => (
                      <button key={ind} className={`chip ${config.industry===ind?"sel":""}`} onClick={()=>update({industry:ind})}>{ind}</button>
                    ))}
                  </div>
                </div>

                {/* Avatar */}
                <div>
                  <label style={{ fontSize:12, fontWeight:700, color:"rgba(232,226,216,0.4)", letterSpacing:"0.06em", textTransform:"uppercase", display:"block", marginBottom:10 }}>Avatar</label>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    {AVATARS.map(a => (
                      <div key={a} className={`avatar-opt ${config.avatarEmoji===a?"sel":""}`} onClick={()=>update({avatarEmoji:a})}>{a}</div>
                    ))}
                  </div>
                </div>

                {/* Color */}
                <div>
                  <label style={{ fontSize:12, fontWeight:700, color:"rgba(232,226,216,0.4)", letterSpacing:"0.06em", textTransform:"uppercase", display:"block", marginBottom:10 }}>Agent Color</label>
                  <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                    {COLOR_PRESETS.map(c => (
                      <div key={c.primary} className={`color-dot ${config.primaryColor===c.primary?"sel":""}`} style={{ background:c.primary }} onClick={()=>update({primaryColor:c.primary, accentColor:c.bg})} title={c.label} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 1: Personality ──────────────────────────────────────── */}
          {step === 1 && (
            <div style={{ animation:"fadeUp 0.3s ease forwards" }}>
              <h2 style={{ fontFamily:"'Instrument Serif',serif", fontSize:"1.8rem", fontWeight:400, color:"#e8e2d8", marginBottom:6 }}>
                Define its personality.
              </h2>
              <p style={{ color:"rgba(232,226,216,0.45)", fontSize:14, marginBottom:32, lineHeight:1.6 }}>
                How should your agent talk to customers? Choose a personality archetype and communication tone.
              </p>

              <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
                <div>
                  <label style={{ fontSize:12, fontWeight:700, color:"rgba(232,226,216,0.4)", letterSpacing:"0.06em", textTransform:"uppercase", display:"block", marginBottom:12 }}>Personality Archetype</label>
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {PERSONALITIES.map(p => (
                      <button key={p.id} className={`forge-btn ${config.personality===p.id?"sel":""}`} onClick={()=>update({personality:p.id})}>
                        <span style={{ marginRight:10 }}>{p.emoji}</span>
                        <span style={{ fontWeight:700 }}>{p.label}</span>
                        <span style={{ marginLeft:8, fontWeight:400, opacity:0.6, fontSize:12 }}>{p.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize:12, fontWeight:700, color:"rgba(232,226,216,0.4)", letterSpacing:"0.06em", textTransform:"uppercase", display:"block", marginBottom:12 }}>Communication Tone</label>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                    {TONES.map(t => (
                      <button key={t.id} className={`chip ${config.tone===t.id?"sel":""}`} onClick={()=>update({tone:t.id})}>{t.label}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize:12, fontWeight:700, color:"rgba(232,226,216,0.4)", letterSpacing:"0.06em", textTransform:"uppercase", display:"block", marginBottom:10 }}>Custom Response Style <span style={{ fontWeight:400, opacity:0.5 }}>(optional)</span></label>
                  <textarea className="forge-input" rows={3} style={{ resize:"none" }}
                    placeholder={`e.g. "Always lead with empathy. Never use jargon. End responses with a clear next step."`}
                    value={config.responseStyle}
                    onChange={e=>update({responseStyle:e.target.value})}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: Expertise ────────────────────────────────────────── */}
          {step === 2 && (
            <div style={{ animation:"fadeUp 0.3s ease forwards" }}>
              <h2 style={{ fontFamily:"'Instrument Serif',serif", fontSize:"1.8rem", fontWeight:400, color:"#e8e2d8", marginBottom:6 }}>
                What does it know?
              </h2>
              <p style={{ color:"rgba(232,226,216,0.45)", fontSize:14, marginBottom:32, lineHeight:1.6 }}>
                Give your agent context — its knowledge base. The richer the context, the sharper the answers.
              </p>

              <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
                <div>
                  <label style={{ fontSize:12, fontWeight:700, color:"rgba(232,226,216,0.4)", letterSpacing:"0.06em", textTransform:"uppercase", display:"block", marginBottom:10 }}>Business Context</label>
                  <textarea className="forge-input" rows={5} style={{ resize:"none" }}
                    placeholder="Tell your agent about your business — what you sell, who your customers are, your processes, pricing, FAQs, anything it needs to know to represent you perfectly…"
                    value={config.businessContext}
                    onChange={e=>update({businessContext:e.target.value})}
                  />
                </div>

                <div>
                  <label style={{ fontSize:12, fontWeight:700, color:"rgba(232,226,216,0.4)", letterSpacing:"0.06em", textTransform:"uppercase", display:"block", marginBottom:10 }}>Expertise Tags</label>
                  <div style={{ display:"flex", gap:8, marginBottom:10, flexWrap:"wrap" }}>
                    {config.expertise.map(e => (
                      <div key={e} className="tag" style={{ cursor:"pointer" }} onClick={()=>toggle("expertise",e)}>
                        {e} <span style={{ opacity:0.5, fontSize:10 }}>×</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    <input className="forge-input" style={{ flex:1 }} placeholder="Add expertise area (e.g. 'Booking', 'Pricing', 'Troubleshooting')…"
                      value={expertiseInput}
                      onChange={e=>setExpertiseInput(e.target.value)}
                      onKeyDown={e=>{if(e.key==="Enter"&&expertiseInput.trim()){toggle("expertise",expertiseInput.trim());setExpertiseInput("");}}}
                    />
                    <button onClick={()=>{if(expertiseInput.trim()){toggle("expertise",expertiseInput.trim());setExpertiseInput("");}}} className="ghost-btn" style={{ whiteSpace:"nowrap" }}>+ Add</button>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize:12, fontWeight:700, color:"rgba(232,226,216,0.4)", letterSpacing:"0.06em", textTransform:"uppercase", display:"block", marginBottom:10 }}>Capabilities</label>
                  <div style={{ display:"flex", gap:8, marginBottom:10, flexWrap:"wrap" }}>
                    {config.capabilities.map(c => (
                      <div key={c} className="tag" style={{ cursor:"pointer" }} onClick={()=>toggle("capabilities",c)}>
                        {c} <span style={{ opacity:0.5, fontSize:10 }}>×</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    <input className="forge-input" style={{ flex:1 }} placeholder="What can it do? (e.g. 'Book appointments', 'Answer FAQs', 'Qualify leads')…"
                      value={capabilityInput}
                      onChange={e=>setCapabilityInput(e.target.value)}
                      onKeyDown={e=>{if(e.key==="Enter"&&capabilityInput.trim()){toggle("capabilities",capabilityInput.trim());setCapabilityInput("");}}}
                    />
                    <button onClick={()=>{if(capabilityInput.trim()){toggle("capabilities",capabilityInput.trim());setCapabilityInput("");}}} className="ghost-btn" style={{ whiteSpace:"nowrap" }}>+ Add</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: Channels & Integrations ─────────────────────────── */}
          {step === 3 && (
            <div style={{ animation:"fadeUp 0.3s ease forwards" }}>
              <h2 style={{ fontFamily:"'Instrument Serif',serif", fontSize:"1.8rem", fontWeight:400, color:"#e8e2d8", marginBottom:6 }}>
                Where should it live?
              </h2>
              <p style={{ color:"rgba(232,226,216,0.45)", fontSize:14, marginBottom:32, lineHeight:1.6 }}>
                Your agent can work across multiple channels simultaneously. Pick where it should show up.
              </p>

              <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
                <div>
                  <label style={{ fontSize:12, fontWeight:700, color:"rgba(232,226,216,0.4)", letterSpacing:"0.06em", textTransform:"uppercase", display:"block", marginBottom:12 }}>Channels</label>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
                    {CHANNELS.map(ch => (
                      <button key={ch.id} className={`forge-btn ${config.channels.includes(ch.id)?"sel":""}`} onClick={()=>toggle("channels",ch.id)} style={{ padding:"12px 14px" }}>
                        <div style={{ fontSize:20, marginBottom:4 }}>{ch.icon}</div>
                        <div style={{ fontWeight:700, fontSize:13 }}>{ch.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize:12, fontWeight:700, color:"rgba(232,226,216,0.4)", letterSpacing:"0.06em", textTransform:"uppercase", display:"block", marginBottom:12 }}>Integrations <span style={{ fontWeight:400, opacity:0.5 }}>(optional)</span></label>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                    {INTEGRATIONS.map(int => (
                      <button key={int.id} className={`forge-btn ${config.integrations.includes(int.id)?"sel":""}`} onClick={()=>toggle("integrations",int.id)}>
                        <span style={{ marginRight:8 }}>{int.icon}</span>
                        <span style={{ fontWeight:600, fontSize:13 }}>{int.label}</span>
                        {config.integrations.includes(int.id) && <span style={{ marginLeft:"auto", color:"#4ade80", fontSize:11 }}>✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 4: Preview & Generate ───────────────────────────────── */}
          {step === 4 && (
            <div style={{ animation:"fadeUp 0.3s ease forwards" }}>
              <h2 style={{ fontFamily:"'Instrument Serif',serif", fontSize:"1.8rem", fontWeight:400, color:"#e8e2d8", marginBottom:6 }}>
                {generated ? "Your agent is ready." : "Review & launch."}
              </h2>
              <p style={{ color:"rgba(232,226,216,0.45)", fontSize:14, marginBottom:32, lineHeight:1.6 }}>
                {generated
                  ? "Copy the system prompt below and paste it into Base44, Claude Projects, or any AI platform to deploy your agent instantly."
                  : "Review everything below. When you're ready, forge your agent — we'll generate a complete system prompt, personality config, and deployment guide."}
              </p>

              {/* Config summary */}
              {!generated && (
                <div style={{ background:"#111", border:"1px solid #1e1e14", borderRadius:14, padding:24, marginBottom:28 }}>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                    {[
                      ["Agent", `${config.avatarEmoji} ${config.name || "Unnamed"}`],
                      ["Industry", config.industry || "Not set"],
                      ["Personality", selectedPersonality?.label || "Not set"],
                      ["Tone", TONES.find(t=>t.id===config.tone)?.label || "Not set"],
                      ["Channels", config.channels.join(", ") || "None"],
                      ["Integrations", config.integrations.length ? config.integrations.join(", ") : "None"],
                    ].map(([label, val]) => (
                      <div key={label}>
                        <div style={{ fontSize:10, fontWeight:700, color:"rgba(232,226,216,0.3)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:4 }}>{label}</div>
                        <div style={{ fontSize:13, color:"#e8e2d8", fontWeight:600 }}>{val}</div>
                      </div>
                    ))}
                  </div>
                  {config.expertise.length > 0 && (
                    <div style={{ marginTop:16, borderTop:"1px solid #1e1e14", paddingTop:16 }}>
                      <div style={{ fontSize:10, fontWeight:700, color:"rgba(232,226,216,0.3)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8 }}>Expertise</div>
                      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                        {config.expertise.map(e => <span key={e} className="tag">{e}</span>)}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Generated output */}
              {generated && agentCode && (
                <div style={{ position:"relative" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:"rgba(232,226,216,0.3)", letterSpacing:"0.08em", textTransform:"uppercase" }}>System Prompt + Config</div>
                    <button onClick={copyCode} className="ghost-btn" style={{ padding:"7px 14px", fontSize:12 }}>
                      {copied ? "✓ Copied!" : "⎘ Copy"}
                    </button>
                  </div>
                  <pre style={{
                    background:"#0d0d0b", border:"1px solid #1e1e14", borderRadius:12,
                    padding:20, fontSize:12, color:"#7ec8a9", lineHeight:1.6,
                    overflowY:"auto", maxHeight:360, whiteSpace:"pre-wrap", wordBreak:"break-word",
                  }}>{agentCode}</pre>

                  <div style={{ marginTop:20, display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
                    {[
                      { label: "Base44", icon: "⚡", desc: "Deploy as a Superagent", href: "https://app.base44.com" },
                      { label: "Claude Projects", icon: "🧠", desc: "Paste into system prompt", href: "https://claude.ai" },
                      { label: "Custom API", icon: "🔧", desc: "Use the prompt in your app", href: "#" },
                    ].map(p => (
                      <a key={p.label} href={p.href} target="_blank" rel="noreferrer" style={{
                        background:"#111", border:"1px solid #1e1e14", borderRadius:12,
                        padding:"16px 14px", textDecoration:"none", transition:"all 0.15s", display:"block",
                      }}
                        onMouseEnter={e=>{(e.currentTarget as HTMLAnchorElement).style.borderColor="rgba(200,169,110,0.35)"}}
                        onMouseLeave={e=>{(e.currentTarget as HTMLAnchorElement).style.borderColor="#1e1e14"}}
                      >
                        <div style={{ fontSize:22, marginBottom:6 }}>{p.icon}</div>
                        <div style={{ fontWeight:700, fontSize:13, color:"#e8e2d8", marginBottom:3 }}>{p.label}</div>
                        <div style={{ fontSize:11, color:"rgba(232,226,216,0.4)" }}>{p.desc}</div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {!generated && (
                <button
                  className="primary-btn"
                  onClick={generateAgent}
                  disabled={generating}
                  style={{ width:"100%", justifyContent:"center", fontSize:15, padding:"16px" }}
                >
                  {generating ? (
                    <>
                      <div style={{ width:16, height:16, border:"2px solid rgba(0,0,0,0.2)", borderTopColor:"#0b0b09", borderRadius:"50%", animation:"spin 0.7s linear infinite" }} />
                      Forging your agent…
                    </>
                  ) : (
                    <>⚡ Forge {config.name || "My Agent"}</>
                  )}
                </button>
              )}
            </div>
          )}

          {/* ── Navigation ───────────────────────────────────────────────── */}
          {!generated && (
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", paddingTop:8 }}>
              {step > 0
                ? <button className="ghost-btn" onClick={()=>setStep(s=>s-1)}>← Back</button>
                : <div />
              }
              {step < STEP_LABELS.length - 1 ? (
                <button
                  className="primary-btn"
                  onClick={()=>setStep(s=>s+1)}
                  disabled={!canAdvance()}
                >
                  Continue →
                </button>
              ) : null}
            </div>
          )}
        </div>

        {/* ─── RIGHT: Live Agent Preview + Chat ─────────────────────────── */}
        <div style={{ position:"sticky", top:80 }}>
          {/* Agent card preview */}
          <div style={{
            background:config.accentColor || "#111", border:`1px solid ${config.primaryColor}30`,
            borderRadius:16, padding:24, marginBottom:16,
            boxShadow:`0 0 40px ${config.primaryColor}15`,
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
              <div style={{
                width:48, height:48, borderRadius:12,
                background:`linear-gradient(135deg,${config.primaryColor},${config.primaryColor}88)`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:22,
              }}>{config.avatarEmoji}</div>
              <div>
                <div style={{ fontWeight:800, fontSize:16, color:"#e8e2d8" }}>
                  {config.name || "Your Agent"}
                </div>
                <div style={{ fontSize:12, color:config.primaryColor, fontWeight:600 }}>
                  {config.tagline || "AI-powered assistant"}
                </div>
              </div>
              <div style={{
                marginLeft:"auto", width:8, height:8, borderRadius:"50%",
                background:"#4ade80", boxShadow:"0 0 6px #4ade80",
              }} />
            </div>

            <div style={{ fontSize:11, color:"rgba(232,226,216,0.3)", marginBottom:8, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase" }}>Live in</div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:16 }}>
              {config.channels.map(ch => {
                const chan = CHANNELS.find(c=>c.id===ch);
                return chan ? <span key={ch} className="tag" style={{ fontSize:11 }}>{chan.icon} {chan.label}</span> : null;
              })}
            </div>

            {config.expertise.length > 0 && (
              <>
                <div style={{ fontSize:11, color:"rgba(232,226,216,0.3)", marginBottom:8, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase" }}>Knows about</div>
                <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:16 }}>
                  {config.expertise.slice(0,5).map(e => <span key={e} className="tag" style={{ fontSize:11 }}>{e}</span>)}
                </div>
              </>
            )}

            <div style={{ height:1, background:"rgba(255,255,255,0.05)", margin:"16px 0" }} />
            <div style={{ fontSize:11, color:"rgba(232,226,216,0.3)", fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:10 }}>Personality</div>
            <div style={{ fontSize:13, color:"rgba(232,226,216,0.6)", lineHeight:1.5 }}>
              {selectedPersonality ? `${selectedPersonality.emoji} ${selectedPersonality.label} — ${selectedPersonality.desc}` : "Not configured"}
            </div>
          </div>

          {/* AI Chat assistant */}
          <div style={{
            background:"#0f0f0d", border:"1px solid #1e1e14", borderRadius:16, overflow:"hidden",
          }}>
            <div style={{ padding:"12px 16px", borderBottom:"1px solid #1e1e14", display:"flex", alignItems:"center", gap:8 }}>
              <div style={{
                width:24, height:24, borderRadius:"50%",
                background:`linear-gradient(135deg,${config.primaryColor},${config.primaryColor}66)`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:11, fontWeight:900,
              }}>✦</div>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:"#e8e2d8" }}>Randy — Forge Assistant</div>
                <div style={{ fontSize:10, color:"rgba(232,226,216,0.35)" }}>Ask me to help configure your agent</div>
              </div>
            </div>

            <div style={{ height:200, overflowY:"auto", padding:"14px 14px 0" }}>
              {chatHistory.length === 0 && (
                <div style={{ fontSize:13, color:"rgba(232,226,216,0.35)", lineHeight:1.6 }}>
                  Ask me anything — "What tone should I use for a law firm?" or "Help me write a business context."
                </div>
              )}
              {chatHistory.map((msg, i) => (
                <div key={i} className="chat-bubble" style={{
                  marginBottom:10, padding:"9px 13px",
                  background: msg.role==="user" ? config.primaryColor : "#131310",
                  color: msg.role==="user" ? "#0b0b09" : "#e8e2d8",
                  borderRadius: msg.role==="user" ? "14px 14px 4px 14px" : "4px 14px 14px 14px",
                  border: msg.role==="assistant" ? "1px solid #222218" : "none",
                  marginLeft: msg.role==="user" ? "auto" : "0",
                  whiteSpace:"pre-wrap",
                }}>{msg.content}</div>
              ))}
              {chatLoading && (
                <div className="chat-bubble" style={{ marginBottom:10, padding:"10px 14px", background:"#131310", border:"1px solid #222218", borderRadius:"4px 14px 14px 14px", width:60 }}>
                  <div style={{ display:"flex", gap:3 }}>
                    {[0,1,2].map(i=><div key={i} style={{ width:5, height:5, borderRadius:"50%", background:config.primaryColor, animation:`pulse 1.1s ease-in-out ${i*0.18}s infinite` }} />)}
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div style={{ padding:"10px 14px", borderTop:"1px solid #1a1a14", display:"flex", gap:8 }}>
              <input
                className="forge-input" style={{ flex:1, padding:"9px 12px", fontSize:12 }}
                placeholder="Ask for help…"
                value={chatInput}
                onChange={e=>setChatInput(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter")sendChat();}}
              />
              <button onClick={sendChat} disabled={chatLoading||!chatInput.trim()} style={{
                background:config.primaryColor, border:"none", borderRadius:8,
                padding:"9px 14px", color:"#0b0b09", fontWeight:800, fontSize:13,
                cursor:"pointer", opacity:(chatLoading||!chatInput.trim())?0.4:1,
              }}>↑</button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── BOTTOM CTA ──────────────────────────────────────────────────── */}
      {step < 4 && (
        <div style={{
          background:"#0f0f0d", borderTop:"1px solid rgba(255,255,255,0.04)",
          padding:"60px 24px", textAlign:"center",
        }}>
          <h3 style={{ fontFamily:"'Instrument Serif',serif", fontSize:"clamp(1.6rem,3vw,2.5rem)", fontWeight:400, color:"#e8e2d8", marginBottom:12 }}>
            Not sure where to start?
          </h3>
          <p style={{ color:"rgba(232,226,216,0.45)", fontSize:14, marginBottom:28, maxWidth:400, margin:"0 auto 28px" }}>
            Tell Randy what your business does and he'll configure everything for you.
          </p>
          <button onClick={()=>setStep(4)} className="primary-btn">
            ⚡ Skip to Generate
          </button>
        </div>
      )}
    </div>
  );
}
