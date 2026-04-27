"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

type AppState = "landing" | "generating" | "builder";
interface Message { id: string; role: "user"|"assistant"; content: string; ts: number; }

const EXAMPLES = [
  { label: "Rocky Mountain Plumbing", desc: "residential & commercial plumbing in Calgary AB" },
  { label: "Apex Electrical", desc: "licensed electrician serving Edmonton and area" },
  { label: "PrairieAir HVAC", desc: "furnace repair and AC installation across Alberta" },
  { label: "GreenEdge Landscaping", desc: "design, build & maintain — Calgary & Cochrane" },
  { label: "Finlay Construction", desc: "custom builds and basement renovations, Cochrane AB" },
  { label: "Peak Performance Physio", desc: "sports rehab and injury recovery, Calgary" },
];

const QUICK_EDITS = [
  "Make the hero bolder",
  "Add 3 testimonials",
  "Switch to dark navy + gold",
  "Add a contact form",
  "Make it more premium",
  "Add services with icons",
  "Bigger CTA buttons",
  "Add a photo gallery",
  "Change fonts to modern sans",
  "Add a pricing section",
];

const GEN_STEPS = [
  { icon: "🔍", text: "Reading your business" },
  { icon: "🎨", text: "Choosing your palette" },
  { icon: "✍️", text: "Writing your copy" },
  { icon: "🏗️", text: "Building sections" },
  { icon: "📱", text: "Making it mobile-ready" },
  { icon: "✨", text: "Final polish" },
];

export default function Home() {
  const router = useRouter();
  const [appState, setAppState] = useState<AppState>("landing");
  const [landingInput, setLandingInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [siteHtml, setSiteHtml] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState(0);
  const [genProgress, setGenProgress] = useState(0);
  const [device, setDevice] = useState<"desktop"|"tablet"|"mobile">("desktop");
  const [panelOpen, setPanelOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatTaRef = useRef<HTMLTextAreaElement>(null);
  const landingRef = useRef<HTMLTextAreaElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const historyRef = useRef<{role:"user"|"assistant"; content:string}[]>([]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, generating]);

  useEffect(() => {
    if (!iframeRef.current || !siteHtml) return;
    const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
    if (doc) { doc.open(); doc.write(siteHtml); doc.close(); }
  }, [siteHtml]);

  useEffect(() => {
    if (!generating) { setGenStep(0); setGenProgress(0); return; }
    setGenStep(0); setGenProgress(0);
    const stepInterval = setInterval(() => setGenStep(s => s < GEN_STEPS.length - 1 ? s + 1 : s), 3500);
    const progInterval = setInterval(() => setGenProgress(p => p < 92 ? p + Math.random() * 3 : p), 400);
    return () => { clearInterval(stepInterval); clearInterval(progInterval); };
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
      setGenProgress(100);
      await new Promise(r => setTimeout(r, 300));
      setSiteHtml(data.html);
      if (data.businessName) setBusinessName(data.businessName);
      addMsg("assistant", data.message || "Done! What else would you like to change?");
      setAppState("builder");
    } catch (err) {
      addMsg("assistant", "Something went wrong — try rephrasing and I'll try again.");
      setAppState(siteHtml ? "builder" : "landing");
    } finally {
      setGenerating(false);
    }
  }, [addMsg, siteHtml]);

  const handleLaunch = useCallback(() => {
    const text = landingInput.trim();
    if (!text || generating) return;
    const biz = text.split(/[—\-]/)[0].trim();
    setBusinessName(biz);
    setAppState("generating");
    addMsg("user", text);
    addMsg("assistant", `Building your ${biz} website now — this takes about 20 seconds.`);
    callAPI(`Build a complete, premium, conversion-focused website for this business: ${text}. Make it look like a top agency built it — bold typography, strong CTAs, real copy, mobile-responsive. Include hero, services, social proof, and contact.`, "", biz);
  }, [landingInput, generating, callAPI, addMsg]);

  const handleChatSend = useCallback(() => {
    const text = chatInput.trim();
    if (!text || generating) return;
    setChatInput("");
    if (chatTaRef.current) chatTaRef.current.style.height = "auto";
    addMsg("user", text);
    callAPI(text, siteHtml, businessName);
  }, [chatInput, generating, siteHtml, businessName, callAPI, addMsg]);

  const handleReset = () => {
    setAppState("landing"); setMessages([]); setSiteHtml("");
    setLandingInput(""); historyRef.current = []; setBusinessName("");
  };

  const previewWidth = device === "desktop" ? "100%" : device === "tablet" ? "768px" : "390px";

  // ============================================================
  // LANDING
  // ============================================================
  if (appState === "landing") return (
    <div style={{ minHeight:"100svh", background:"#080807", color:"#e8e0d0", fontFamily:"-apple-system,'Inter',sans-serif", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"40px 20px 60px", position:"relative", overflow:"hidden" }}>

      {/* Ambient background */}
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0 }}>
        <div style={{ position:"absolute", top:"-20%", left:"50%", transform:"translateX(-50%)", width:"700px", height:"500px", background:"radial-gradient(ellipse, rgba(200,169,110,0.06) 0%, transparent 70%)", filter:"blur(40px)" }} />
        <div style={{ position:"absolute", bottom:"10%", right:"-10%", width:"400px", height:"400px", background:"radial-gradient(ellipse, rgba(120,90,30,0.04) 0%, transparent 70%)" }} />
      </div>

      <div style={{ position:"relative", zIndex:1, width:"100%", maxWidth:"680px", display:"flex", flexDirection:"column", alignItems:"center" }}>
        
        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:48, animation:"fadeUp .5s ease .05s both" }}>
          <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,#c8a96e,#a07840)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:16, color:"#0a0a08", boxShadow:"0 4px 20px rgba(200,169,110,.3), inset 0 1px 0 rgba(255,255,255,.15)" }}>S</div>
          <div style={{ fontWeight:800, fontSize:20, letterSpacing:"-.4px" }}>Site<span style={{ color:"#c8a96e" }}>craft</span></div>
        </div>

        {/* Headline */}
        <div style={{ animation:"fadeUp .5s ease .1s both", textAlign:"center", marginBottom:12 }}>
          <h1 style={{ fontSize:"clamp(32px,6vw,52px)", fontWeight:900, letterSpacing:"-2px", lineHeight:1.08, marginBottom:0 }}>
            Describe your business.
          </h1>
          <h1 style={{ fontSize:"clamp(32px,6vw,52px)", fontWeight:900, letterSpacing:"-2px", lineHeight:1.08, color:"#c8a96e" }}>
            Watch your site appear.
          </h1>
        </div>

        {/* Subtext */}
        <p style={{ fontSize:"clamp(14px,2vw,17px)", color:"#4a4540", textAlign:"center", lineHeight:1.7, maxWidth:"440px", marginBottom:36, animation:"fadeUp .5s ease .2s both" }}>
          Tell Sitecraft what you do. It writes the copy, picks the colours, and builds the whole site — in under 30 seconds.
        </p>

        {/* Trust pills */}
        <div style={{ display:"flex", gap:8, marginBottom:28, animation:"fadeUp .5s ease .25s both", flexWrap:"wrap", justifyContent:"center" }}>
          {["No templates", "Real copy", "Mobile-ready", "Edit with chat"].map((t,i) => (
            <div key={i} style={{ background:"#0e0d0b", border:"1px solid #1e1c18", borderRadius:20, padding:"5px 13px", fontSize:12, color:"#4a4540", display:"flex", alignItems:"center", gap:5 }}>
              <span style={{ color:"#c8a96e", fontSize:10 }}>✓</span> {t}
            </div>
          ))}
        </div>

        {/* Main input */}
        <div style={{ width:"100%", position:"relative", animation:"fadeUp .5s ease .3s both" }}>
          <textarea
            ref={landingRef}
            rows={2}
            placeholder="e.g. Rocky Mountain Plumbing — residential and commercial plumbing in Calgary AB"
            value={landingInput}
            onChange={e => { setLandingInput(e.target.value); e.target.style.height="auto"; e.target.style.height=Math.min(e.target.scrollHeight,160)+"px"; }}
            onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); handleLaunch(); } }}
            style={{ width:"100%", background:"#0d0c0a", border:`1px solid ${landingInput ? "rgba(200,169,110,.4)" : "rgba(200,169,110,.15)"}`, borderRadius:18, padding:"20px 70px 20px 22px", color:"#e8e0d0", fontSize:16, fontFamily:"inherit", lineHeight:1.6, resize:"none", outline:"none", boxSizing:"border-box", boxShadow: landingInput ? "0 0 0 4px rgba(200,169,110,.06), 0 8px 32px rgba(0,0,0,.4)" : "0 8px 32px rgba(0,0,0,.3)", transition:"all .2s" }}
          />
          <button
            onClick={handleLaunch}
            disabled={!landingInput.trim()}
            style={{ position:"absolute", right:12, bottom:12, width:46, height:46, borderRadius:14, background: landingInput.trim() ? "linear-gradient(135deg,#c8a96e,#a87030)" : "#1a1810", border:"none", cursor: landingInput.trim() ? "pointer" : "not-allowed", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, color: landingInput.trim() ? "#0a0a08" : "#333", fontWeight:900, transition:"all .15s", boxShadow: landingInput.trim() ? "0 4px 16px rgba(200,169,110,.3)" : "none", transform:"none" }}
            onMouseEnter={e => { if (landingInput.trim()) (e.target as HTMLButtonElement).style.transform="scale(1.05)"; }}
            onMouseLeave={e => { (e.target as HTMLButtonElement).style.transform="scale(1)"; }}
          >→</button>
        </div>

        {/* Example chips */}
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"center", marginTop:16, animation:"fadeUp .5s ease .4s both" }}>
          {EXAMPLES.map((ex, i) => (
            <button key={i} onClick={() => { setLandingInput(`${ex.label} — ${ex.desc}`); landingRef.current?.focus(); }}
              style={{ background:"#0d0c0a", border:"1px solid #1a1810", borderRadius:20, padding:"7px 15px", fontSize:12, color:"#3a3830", cursor:"pointer", fontFamily:"inherit", transition:"all .15s", whiteSpace:"nowrap" }}
              onMouseEnter={e => { const b = e.target as HTMLButtonElement; b.style.borderColor="rgba(200,169,110,.2)"; b.style.color="#c8a96e"; }}
              onMouseLeave={e => { const b = e.target as HTMLButtonElement; b.style.borderColor="#1a1810"; b.style.color="#3a3830"; }}
            >{ex.label}</button>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:.25; transform:scale(.7); } 50% { opacity:1; transform:scale(1); } }
        @keyframes slideIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes progress { from { width:0%; } to { width:100%; } }
        * { box-sizing:border-box; }
      `}</style>
    </div>
  );

  // ============================================================
  // GENERATING SCREEN — Full immersive build experience
  // ============================================================
  if (appState === "generating") return (
    <div style={{ height:"100svh", background:"#080807", color:"#e8e0d0", fontFamily:"-apple-system,'Inter',sans-serif", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:40, position:"relative", overflow:"hidden" }}>
      
      {/* Background glow */}
      <div style={{ position:"fixed", top:"30%", left:"50%", transform:"translate(-50%,-50%)", width:"600px", height:"600px", background:"radial-gradient(ellipse, rgba(200,169,110,0.05) 0%, transparent 70%)", pointerEvents:"none" }} />

      {/* Logo */}
      <div style={{ display:"flex", alignItems:"center", gap:10, animation:"fadeIn .4s ease" }}>
        <div style={{ width:40, height:40, borderRadius:12, background:"linear-gradient(135deg,#c8a96e,#a07840)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:18, color:"#0a0a08", boxShadow:"0 4px 24px rgba(200,169,110,.4)" }}>S</div>
        <div style={{ fontWeight:800, fontSize:20, letterSpacing:"-.4px" }}>Site<span style={{ color:"#c8a96e" }}>craft</span></div>
      </div>

      {/* Main content */}
      <div style={{ textAlign:"center", animation:"fadeIn .5s ease .1s both" }}>
        <div style={{ fontSize:13, color:"#c8a96e", fontWeight:600, letterSpacing:"1.5px", textTransform:"uppercase", marginBottom:12 }}>Building</div>
        <div style={{ fontSize:"clamp(22px,4vw,32px)", fontWeight:900, letterSpacing:"-1px", marginBottom:6 }}>{businessName}</div>
        <div style={{ fontSize:14, color:"#3a3830" }}>Hang tight — about 20 seconds</div>
      </div>

      {/* Steps */}
      <div style={{ display:"flex", flexDirection:"column", gap:8, minWidth:260, animation:"fadeIn .5s ease .2s both" }}>
        {GEN_STEPS.map((step, i) => {
          const isDone = i < genStep;
          const isActive = i === genStep;
          return (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 16px", borderRadius:12, background: isActive ? "rgba(200,169,110,.07)" : "transparent", border: isActive ? "1px solid rgba(200,169,110,.15)" : "1px solid transparent", transition:"all .4s ease", opacity: isDone ? .4 : isActive ? 1 : .2 }}>
              <div style={{ fontSize:18, width:28, textAlign:"center" }}>{isDone ? "✓" : step.icon}</div>
              <div style={{ fontSize:14, color: isActive ? "#e8e0d0" : isDone ? "#4a4540" : "#2a2820", fontWeight: isActive ? 600 : 400, transition:"color .4s" }}>{step.text}</div>
              {isActive && <div style={{ marginLeft:"auto", width:14, height:14, borderRadius:"50%", border:"2px solid #2a2820", borderTopColor:"#c8a96e", animation:"spin 1s linear infinite" }} />}
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div style={{ width:280, animation:"fadeIn .5s ease .3s both" }}>
        <div style={{ height:3, background:"#1a1810", borderRadius:4, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${genProgress}%`, background:"linear-gradient(90deg,#a07840,#c8a96e)", borderRadius:4, transition:"width .4s ease", boxShadow:"0 0 8px rgba(200,169,110,.4)" }} />
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:8, fontSize:11, color:"#2a2820" }}>
          <span>Generating...</span>
          <span>{Math.round(genProgress)}%</span>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes spin { to { transform:rotate(360deg); } }
        * { box-sizing:border-box; }
      `}</style>
    </div>
  );

  // ============================================================
  // BUILDER
  // ============================================================
  return (
    <div style={{ height:"100svh", background:"#080807", color:"#e8e0d0", fontFamily:"-apple-system,'Inter',sans-serif", display:"flex", flexDirection:"column", overflow:"hidden" }}>

      {/* ── TOP BAR ── */}
      <div style={{ height:52, background:"#0a0908", borderBottom:"1px solid #161410", display:"flex", alignItems:"center", padding:"0 14px", gap:10, flexShrink:0, zIndex:30 }}>
        
        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", flexShrink:0 }} onClick={handleReset}>
          <div style={{ width:28, height:28, borderRadius:8, background:"linear-gradient(135deg,#c8a96e,#a07840)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:13, color:"#0a0a08", boxShadow:"0 2px 10px rgba(200,169,110,.25)" }}>S</div>
          <div style={{ fontWeight:800, fontSize:15, letterSpacing:"-.3px" }}>Site<span style={{ color:"#c8a96e" }}>craft</span></div>
        </div>

        <div style={{ width:1, height:20, background:"#1a1810", flexShrink:0 }} />

        {/* Business name */}
        <div style={{ fontSize:13, color:"#3a3830", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1, minWidth:0 }}>
          {businessName || "Untitled site"}
        </div>

        {/* Device toggles */}
        <div style={{ display:"flex", gap:2, flexShrink:0, background:"#0e0d0b", border:"1px solid #1a1810", borderRadius:8, padding:3 }}>
          {(["desktop","tablet","mobile"] as const).map(d => (
            <button key={d} onClick={() => setDevice(d)}
              style={{ width:30, height:26, borderRadius:6, border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, background: device===d ? "rgba(200,169,110,.12)" : "transparent", color: device===d ? "#c8a96e" : "#333", transition:"all .15s" }}>
              {d==="desktop"?"🖥":d==="tablet"?"⬜":"📱"}
            </button>
          ))}
        </div>

        <div style={{ display:"flex", gap:6, flexShrink:0 }}>
          {/* Panel toggle */}
          <button onClick={() => setPanelOpen(p => !p)}
            style={{ height:32, padding:"0 12px", borderRadius:8, border:"1px solid #1a1810", background:"transparent", color:"#444", cursor:"pointer", fontSize:12, fontFamily:"inherit", transition:"all .15s" }}
            onMouseEnter={e => { (e.target as HTMLButtonElement).style.color="#e8e0d0"; }}
            onMouseLeave={e => { (e.target as HTMLButtonElement).style.color="#444"; }}
          >{panelOpen ? "← Hide" : "Chat →"}</button>

          {/* New site */}
          <button onClick={handleReset}
            style={{ height:32, padding:"0 14px", borderRadius:8, border:"1px solid #1a1810", background:"transparent", color:"#555", cursor:"pointer", fontSize:12, fontFamily:"inherit", transition:"all .15s" }}
            onMouseEnter={e => { const b=e.target as HTMLButtonElement; b.style.borderColor="#2a2820"; b.style.color="#e8e0d0"; }}
            onMouseLeave={e => { const b=e.target as HTMLButtonElement; b.style.borderColor="#1a1810"; b.style.color="#555"; }}
          >New site</button>

          {/* Export */}
          <button
            onClick={() => { if (!siteHtml) return; const b=new Blob([siteHtml],{type:"text/html"}); const a=document.createElement("a"); a.href=URL.createObjectURL(b); a.download=`${businessName||"sitecraft"}.html`; a.click(); }}
            style={{ height:32, padding:"0 14px", borderRadius:8, border:"1px solid rgba(200,169,110,.2)", background:"rgba(200,169,110,.06)", color:"#c8a96e", cursor:"pointer", fontSize:12, fontFamily:"inherit", fontWeight:600, transition:"all .15s" }}
            onMouseEnter={e => { const b=e.target as HTMLButtonElement; b.style.background="rgba(200,169,110,.12)"; }}
            onMouseLeave={e => { const b=e.target as HTMLButtonElement; b.style.background="rgba(200,169,110,.06)"; }}
          >↓ Download</button>
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ flex:1, display:"flex", overflow:"hidden", minHeight:0 }}>

        {/* ── CHAT PANEL ── */}
        {panelOpen && (
          <div style={{ width:300, flexShrink:0, display:"flex", flexDirection:"column", background:"#0a0908", borderRight:"1px solid #161410", transition:"width .2s ease" }}>
            
            {/* Messages */}
            <div style={{ flex:1, overflowY:"auto", padding:"16px 12px", display:"flex", flexDirection:"column", gap:10, scrollBehavior:"smooth" }}
              ref={r => { if (r) r.scrollTop = r.scrollHeight; }}>
              {messages.map(m => (
                <div key={m.id} style={{ animation:"slideIn .2s ease", alignSelf: m.role==="user" ? "flex-end" : "flex-start", maxWidth:"88%", padding:"9px 13px", fontSize:13, lineHeight:1.6, borderRadius: m.role==="user" ? "14px 14px 3px 14px" : "14px 14px 14px 3px", background: m.role==="user" ? "linear-gradient(135deg,#c8a96e,#b09050)" : "#111", color: m.role==="user" ? "#0a0a08" : "#b0a898", fontWeight: m.role==="user" ? 500 : 400, border: m.role==="user" ? "none" : "1px solid #1a1810", boxShadow: m.role==="user" ? "0 2px 8px rgba(200,169,110,.2)" : "none" }}>
                  {m.content}
                </div>
              ))}
              {generating && (
                <div style={{ alignSelf:"flex-start", background:"#111", border:"1px solid #1a1810", borderRadius:"14px 14px 14px 3px", padding:"12px 16px", display:"flex", gap:5, animation:"slideIn .2s ease" }}>
                  {[0,1,2].map(i => <div key={i} style={{ width:6, height:6, borderRadius:"50%", background:"#c8a96e", animation:`pulse 1.2s ease ${i*.2}s infinite` }} />)}
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick edit chips */}
            {messages.length >= 2 && !generating && (
              <div style={{ padding:"4px 10px 0", overflowX:"auto", display:"flex", gap:6, scrollbarWidth:"none" }}>
                {QUICK_EDITS.map((q,i) => (
                  <button key={i} onClick={() => { setChatInput(q); chatTaRef.current?.focus(); }}
                    style={{ background:"transparent", border:"1px solid #1a1810", borderRadius:16, padding:"5px 11px", fontSize:11, color:"#333", cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap", flexShrink:0, transition:"all .15s" }}
                    onMouseEnter={e => { const b=e.target as HTMLButtonElement; b.style.borderColor="rgba(200,169,110,.2)"; b.style.color="#c8a96e"; }}
                    onMouseLeave={e => { const b=e.target as HTMLButtonElement; b.style.borderColor="#1a1810"; b.style.color="#333"; }}
                  >{q}</button>
                ))}
              </div>
            )}

            {/* Chat input */}
            <div style={{ padding:"10px 10px 14px", borderTop:"1px solid #161410", flexShrink:0 }}>
              <div style={{ display:"flex", gap:8, alignItems:"flex-end" }}>
                <textarea
                  ref={chatTaRef}
                  rows={1}
                  placeholder={generating ? "Working on it…" : "Change anything…"}
                  value={chatInput}
                  disabled={generating}
                  onChange={e => { setChatInput(e.target.value); e.target.style.height="auto"; e.target.style.height=Math.min(e.target.scrollHeight,100)+"px"; }}
                  onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); handleChatSend(); } }}
                  style={{ flex:1, background:"#0d0c0a", border:"1px solid #1a1810", borderRadius:10, padding:"10px 12px", color:"#e8e0d0", fontSize:14, fontFamily:"inherit", resize:"none", outline:"none", lineHeight:1.5, maxHeight:100, transition:"border-color .15s", opacity: generating ? .5 : 1 }}
                  onFocus={e => { e.target.style.borderColor="rgba(200,169,110,.3)"; }}
                  onBlur={e => { e.target.style.borderColor="#1a1810"; }}
                />
                <button onClick={handleChatSend} disabled={!chatInput.trim()||generating}
                  style={{ width:38, height:38, borderRadius:10, background: chatInput.trim() && !generating ? "linear-gradient(135deg,#c8a96e,#a87030)" : "#1a1810", border:"none", cursor: chatInput.trim() && !generating ? "pointer" : "not-allowed", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:900, color: chatInput.trim() && !generating ? "#0a0a08" : "#333", flexShrink:0, transition:"all .15s", boxShadow: chatInput.trim() && !generating ? "0 2px 10px rgba(200,169,110,.25)" : "none" }}>→</button>
              </div>
            </div>
          </div>
        )}

        {/* ── PREVIEW PANEL ── */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0, position:"relative" }}>
          
          {/* Browser chrome */}
          <div style={{ height:40, background:"#0a0908", borderBottom:"1px solid #161410", display:"flex", alignItems:"center", padding:"0 12px", gap:10, flexShrink:0 }}>
            <div style={{ display:"flex", gap:5, flexShrink:0 }}>
              {["#ff5f57","#febc2e","#28c840"].map(c => <div key={c} style={{ width:11, height:11, borderRadius:"50%", background:c, opacity:.8 }} />)}
            </div>
            <div style={{ flex:1, background:"#0e0d0b", border:"1px solid #1a1810", borderRadius:7, height:26, display:"flex", alignItems:"center", padding:"0 10px", fontSize:11, color:"#2a2820", overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis", minWidth:0, gap:6 }}>
              <span style={{ color:"#1e1c18" }}>🔒</span>
              {businessName ? `${businessName.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"")}.sitecraft.ai` : "sitecraft.ai"}
            </div>
            {/* Refresh indicator */}
            {generating && siteHtml && (
              <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, color:"#4a4540", flexShrink:0 }}>
                <div style={{ width:12, height:12, borderRadius:"50%", border:"2px solid #1a1810", borderTopColor:"#c8a96e", animation:"spin 1s linear infinite" }} />
                Updating
              </div>
            )}
          </div>

          {/* iframe */}
          <div style={{ flex:1, overflow:"auto", display:"flex", justifyContent:"center", alignItems: device !== "desktop" ? "flex-start" : "stretch", background: device !== "desktop" ? "#070706" : "#111", padding: device !== "desktop" ? "20px 20px" : "0", position:"relative" }}>
            
            {/* Empty state */}
            {!siteHtml && !generating && (
              <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12, color:"#2a2820" }}>
                <div style={{ fontSize:40 }}>🏗️</div>
                <div style={{ fontSize:14 }}>Your site will appear here</div>
              </div>
            )}

            <iframe
              ref={iframeRef}
              style={{ width:previewWidth, height: device !== "desktop" ? "calc(100svh - 120px)" : "100%", border:"none", background:"#fff", borderRadius: device !== "desktop" ? "12px" : "0", boxShadow: device !== "desktop" ? "0 8px 60px rgba(0,0,0,.6)" : "none", transition:"width .3s ease", flexShrink:0, opacity: generating && !siteHtml ? 0 : 1, transition:"opacity .3s ease, width .3s ease" }}
              title="preview"
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:.2; transform:scale(.65); } 50% { opacity:1; transform:scale(1); } }
        @keyframes slideIn { from { opacity:0; transform:translateY(5px); } to { opacity:1; transform:translateY(0); } }
        * { box-sizing:border-box; }
        ::-webkit-scrollbar { width:3px; height:3px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:#1a1810; border-radius:3px; }
      `}</style>
    </div>
  );
}
