"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

type AppState = "landing" | "builder";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts: number;
}

const STARTER_PROMPTS = [
  "Rocky Mountain Plumbing — residential & commercial plumbing in Calgary AB",
  "Apex Electrical — licensed electrician serving Edmonton and surrounding areas",
  "PrairieAir HVAC — furnace repair and AC installation across Alberta",
  "GreenEdge Landscaping — design, build & maintain. Calgary & Cochrane",
  "Finlay Construction — custom builds and basement renovations, Cochrane AB",
  "Peak Performance Physiotherapy — sports rehab and injury recovery, Calgary",
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

@keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes pulse { 0%,100% { opacity: .3; transform: scale(.8); } 50% { opacity: 1; transform: scale(1); } }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes slideIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
@keyframes glow { 0%,100% { box-shadow: 0 0 20px rgba(200,169,110,.06); } 50% { box-shadow: 0 0 40px rgba(200,169,110,.18); } }

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
.btn-ghost:active { transform:scale(.97); }

/* ====== LANDING ====== */
.landing-wrap { height:100svh; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:24px 20px 48px; position:relative; overflow:hidden; animation:fadeIn .4s ease; }
.landing-bg { position:absolute; inset:0; background:radial-gradient(ellipse 80% 50% at 50% -10%, rgba(200,169,110,.07) 0%, transparent 70%), radial-gradient(ellipse 40% 30% at 85% 85%, rgba(100,80,30,.05) 0%, transparent 60%); pointer-events:none; }
.landing-headline { font-size:clamp(28px,5.5vw,46px); font-weight:900; text-align:center; line-height:1.12; letter-spacing:-1.5px; max-width:560px; margin-bottom:14px; animation:fadeUp .5s ease .15s both; }
.landing-headline span { color:#c8a96e; }
.landing-sub { font-size:clamp(13px,2vw,16px); color:#555; text-align:center; max-width:420px; line-height:1.65; margin-bottom:32px; animation:fadeUp .5s ease .25s both; }
.main-input-wrap { width:100%; max-width:640px; position:relative; animation:fadeUp .5s ease .35s both; }
.main-input { width:100%; background:#0d0c0a; border:1px solid rgba(200,169,110,.2); border-radius:16px; padding:18px 64px 18px 20px; color:#e8e0d0; font-size:16px; font-family:inherit; line-height:1.5; resize:none; outline:none; transition:border-color .2s, box-shadow .2s; min-height:62px; max-height:160px; overflow-y:auto; display:block; animation:glow 3s ease 1s infinite; }
.main-input:focus { border-color:rgba(200,169,110,.5); box-shadow:0 0 0 3px rgba(200,169,110,.07); animation:none; }
.main-input::placeholder { color:#2a2922; }
.send-btn { position:absolute; right:10px; bottom:10px; width:40px; height:40px; border-radius:10px; background:#c8a96e; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:18px; color:#0a0a08; font-weight:900; transition:all .15s; -webkit-tap-highlight-color:transparent; }
.send-btn:hover { background:#d4b87e; transform:scale(1.04); }
.send-btn:active { transform:scale(.95); }
.send-btn:disabled { opacity:.3; cursor:not-allowed; transform:none; }
.examples-row { display:flex; gap:8px; flex-wrap:wrap; justify-content:center; max-width:640px; margin-top:14px; animation:fadeUp .5s ease .45s both; }
.example-chip { background:#0d0c0a; border:1px solid #1a1810; border-radius:20px; padding:7px 14px; font-size:12px; color:#444; cursor:pointer; font-family:inherit; white-space:nowrap; transition:all .15s; -webkit-tap-highlight-color:transparent; }
.example-chip:hover { border-color:rgba(200,169,110,.25); color:#c8a96e; }

/* ====== BUILDER ====== */
.builder-wrap { height:100svh; display:flex; flex-direction:column; animation:fadeIn .3s ease; }
.builder-topbar { height:50px; background:#0a0a08; border-bottom:1px solid #1a1810; display:flex; align-items:center; padding:0 10px; gap:8px; flex-shrink:0; z-index:20; }
.builder-body { flex:1; display:flex; overflow:hidden; min-height:0; }

/* Chat panel */
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

/* Preview panel */
.preview-panel { flex:1; display:flex; flex-direction:column; min-width:0; background:#0d0c0a; position:relative; }
.preview-bar { height:38px; background:#0a0a08; border-bottom:1px solid #1a1810; display:flex; align-items:center; padding:0 10px; gap:8px; flex-shrink:0; }
.preview-dots { display:flex; gap:5px; flex-shrink:0; }
.url-bar { flex:1; background:#111; border:1px solid #1a1810; border-radius:6px; height:24px; display:flex; align-items:center; padding:0 10px; font-size:11px; color:#444; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; min-width:0; }
.device-btn { width:27px; height:27px; border-radius:6px; background:transparent; border:1px solid transparent; color:#444; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:13px; transition:all .15s; -webkit-tap-highlight-color:transparent; }
.device-btn.active { background:rgba(200,169,110,.1); border-color:rgba(200,169,110,.25); color:#c8a96e; }

/* Gen overlay */
.gen-overlay { position:absolute; inset:0; background:#0a0a08; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:28px; z-index:10; animation:fadeIn .3s ease; }
.gen-step { display:flex; align-items:center; gap:10px; font-size:13px; color:#333; transition:color .4s; }
.gen-step.active { color:#d8d0c0; }
.gen-step.done { color:#4ade80; }
.gen-dot { width:8px; height:8px; border-radius:50%; background:#1a1810; flex-shrink:0; transition:background .4s; }
.gen-step.active .gen-dot { background:#c8a96e; animation:pulse 1.2s ease infinite; }
.gen-step.done .gen-dot { background:#4ade80; }

@media(max-width:767px) {
  .builder-body { flex-direction:column-reverse; }
  .chat-panel { width:100%; height:260px; border-right:none; border-top:1px solid #1a1810; flex-shrink:0; }
  .preview-panel { flex:1; min-height:0; }
}
`;

export default function Home() {
  const router = useRouter();
  const [appState, setAppState] = useState<AppState>("landing");
  const [landingInput, setLandingInput] = useState("");
  const landingRef = useRef<HTMLTextAreaElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [siteHtml, setSiteHtml] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState(0);
  const [device, setDevice] = useState<"desktop"|"tablet"|"mobile">("desktop");

  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatTaRef = useRef<HTMLTextAreaElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const historyRef = useRef<{role:"user"|"assistant"; content:string}[]>([]);

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 130) + "px";
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, generating]);

  useEffect(() => {
    if (!iframeRef.current || !siteHtml) return;
    const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
    if (doc) { doc.open(); doc.write(siteHtml); doc.close(); }
  }, [siteHtml]);

  useEffect(() => {
    if (!generating) { setGenStep(0); return; }
    setGenStep(0);
    const iv = setInterval(() => setGenStep(s => s >= GEN_STEPS.length - 1 ? s : s + 1), 900);
    return () => clearInterval(iv);
  }, [generating]);

  const addMsg = useCallback((role: "user"|"assistant", content: string) => {
    const m: Message = { id: Math.random().toString(36).slice(2), role, content, ts: Date.now() };
    setMessages(prev => [...prev, m]);
    historyRef.current.push({ role, content });
  }, []);

  const callAPI = useCallback(async (userMsg: string, currentHtml: string, biz: string) => {
    setGenerating(true);
    try {
      const res = await fetch("/api/chat-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, currentHtml, businessName: biz, history: historyRef.current.slice(-8) }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSiteHtml(data.html);
      if (data.businessName) setBusinessName(data.businessName);
      addMsg("assistant", data.message || "Done! What else would you like to change?");
    } catch (err) {
      addMsg("assistant", "Something went wrong — try rephrasing and I'll try again.");
    } finally {
      setGenerating(false);
    }
  }, [addMsg]);

  const handleLaunch = useCallback(() => {
    const text = landingInput.trim();
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

  const previewWidth = device === "desktop" ? "100%" : device === "tablet" ? "768px" : "390px";

  // ===== LANDING =====
  if (appState === "landing") return (
    <div className="landing-wrap">
      <style>{CSS}</style>
      <div className="landing-bg" />

      <div className="logo" style={{ marginBottom: 36, animation: "fadeUp .5s ease .05s both" }}>
        <div className="logo-mark">S</div>
        <div className="logo-text">Site<span>craft</span></div>
      </div>

      <h1 className="landing-headline">
        Describe your business.<br />
        Watch your site <span>appear.</span>
      </h1>

      <p className="landing-sub">
        Tell Sitecraft what you do and where. It builds a real, professional website in seconds — then you chat to refine it.
      </p>

      <div className="main-input-wrap">
        <textarea
          ref={landingRef}
          className="main-input"
          rows={2}
          placeholder="e.g. Rocky Mountain Plumbing — residential and commercial plumbing in Calgary AB"
          value={landingInput}
          onChange={e => { setLandingInput(e.target.value); autoResize(e.target); }}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleLaunch(); } }}
        />
        <button className="send-btn" onClick={handleLaunch} disabled={!landingInput.trim()}>↗</button>
      </div>

      <div className="examples-row">
        {STARTER_PROMPTS.map((p, i) => (
          <button key={i} className="example-chip" onClick={() => { setLandingInput(p); setTimeout(() => landingRef.current?.focus(), 50); }}>
            {p.split(/[—\-]/)[0].trim()}
          </button>
        ))}
      </div>
    </div>
  );

  // ===== BUILDER =====
  return (
    <div className="builder-wrap">
      <style>{CSS}</style>

      {/* Topbar */}
      <div className="builder-topbar">
        <div className="logo">
          <div className="logo-mark" style={{ width: 26, height: 26, fontSize: 12 }}>S</div>
          <div className="logo-text" style={{ fontSize: 14 }}>Site<span>craft</span></div>
        </div>
        <div style={{ width:1, height:18, background:"#1a1810", margin:"0 2px" }} />
        <div style={{ fontSize:13, color:"#444", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1, minWidth:0 }}>{businessName}</div>
        <div style={{ display:"flex", gap:3, flexShrink:0 }}>
          {(["desktop","tablet","mobile"] as const).map(d => (
            <button key={d} className={`device-btn${device===d?" active":""}`} onClick={() => setDevice(d)} title={d}>
              {d==="desktop"?"🖥":d==="tablet"?"⬜":"📱"}
            </button>
          ))}
        </div>
        <div style={{ display:"flex", gap:6, flexShrink:0 }}>
          <button className="btn-ghost" style={{ padding:"6px 12px", fontSize:13 }} onClick={() => { setAppState("landing"); setMessages([]); setSiteHtml(""); setLandingInput(""); historyRef.current=[]; }}>New</button>
          <button className="btn-gold" style={{ padding:"7px 14px", fontSize:13 }} onClick={() => router.push("/build")}>Edit & Publish →</button>
        </div>
      </div>

      {/* Body */}
      <div className="builder-body">

        {/* Chat */}
        <div className="chat-panel">
          <div className="chat-messages">
            {messages.map(m => (
              <div key={m.id} className={`msg-bubble ${m.role==="user"?"msg-user":"msg-ai"}`}>{m.content}</div>
            ))}
            {generating && (
              <div className="typing-wrap">
                {[0,1,2].map(i => <div key={i} className="typing-dot" style={{ animation:`pulse 1.2s ease ${i*.2}s infinite` }} />)}
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {messages.length >= 2 && !generating && (
            <div style={{ padding:"4px 10px 0" }}>
              <div className="quick-edits">
                {QUICK_EDITS.map((q,i) => (
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
                style={{ fontSize:"16px" }}
              />
              <button className="chat-send-btn" onClick={handleChatSend} disabled={!chatInput.trim()||generating}>↗</button>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="preview-panel">
          <div className="preview-bar">
            <div className="preview-dots">
              {["#ff5f57","#febc2e","#28c840"].map(c => <div key={c} style={{ width:10,height:10,borderRadius:"50%",background:c }} />)}
            </div>
            <div className="url-bar">
              {businessName ? `${businessName.toLowerCase().replace(/[^a-z0-9]/g,"")}.sitecraft.ai` : "sitecraft.ai"}
            </div>
          </div>

          {/* First-time generating overlay */}
          {generating && !siteHtml && (
            <div className="gen-overlay">
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10, textAlign:"center" }}>
                <div className="logo-mark" style={{ width:48, height:48, fontSize:22, marginBottom:4 }}>S</div>
                <div style={{ fontSize:17, fontWeight:800, color:"#e8e0d0" }}>Building your site</div>
                <div style={{ fontSize:13, color:"#555" }}>~15 seconds</div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10, minWidth:220 }}>
                {GEN_STEPS.map((s,i) => (
                  <div key={i} className={`gen-step${i===genStep?" active":i<genStep?" done":""}`}>
                    <div className="gen-dot" />
                    {s}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Updating toast */}
          {generating && siteHtml && (
            <div style={{ position:"absolute", top:46, right:12, zIndex:10, background:"#0a0a08", border:"1px solid #1a1810", borderRadius:10, padding:"7px 13px", display:"flex", alignItems:"center", gap:8, fontSize:12, color:"#777" }}>
              <div style={{ width:13,height:13,borderRadius:"50%",border:"2px solid #1a1810",borderTopColor:"#c8a96e",animation:"spin 1s linear infinite" }} />
              Updating…
            </div>
          )}

          {/* iframe */}
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
