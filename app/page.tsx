"use client";
import { useState, useRef, useEffect, useCallback } from "react";

type AppState = "landing" | "building" | "builder";
interface Message { id: string; role: "user"|"assistant"; content: string; }

const EXAMPLES = [
  "Rocky Mountain Plumbing — residential & commercial plumbing in Calgary AB",
  "Apex Electrical — licensed electrician serving Edmonton and area",
  "PrairieAir HVAC — furnace repair and AC installation across Alberta",
  "GreenEdge Landscaping — design, build & maintain — Calgary & Cochrane",
  "Finlay Construction — custom builds and basement renos, Cochrane AB",
  "Peak Performance Physio — sports rehab and injury recovery, Calgary",
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
  "Change to modern fonts",
  "Add a pricing section",
];

const SECTION_LABELS = [
  "Styles & layout",
  "Navigation",
  "Hero section",
  "Services",
  "Testimonials",
  "FAQ",
  "Contact form",
  "Footer",
];

// ─── tiny helpers ────────────────────────────────────────────
const icoS = (name: string) => ({
  desktop: "M4 4h16v10H4zm6 10v2m-2 2h8",
  tablet:  "M8 3h8a2 2 0 012 2v14a2 2 0 01-2 2H8a2 2 0 01-2-2V5a2 2 0 012-2zm4 14v.01",
  mobile:  "M12 18h.01M8 3h8a1 1 0 011 1v16a1 1 0 01-1 1H8a1 1 0 01-1-1V4a1 1 0 011-1z",
})[name as "desktop"|"tablet"|"mobile"] ?? "";

export default function Home() {
  const [appState, setAppState]       = useState<AppState>("landing");
  const [landingInput, setLandingInput] = useState("");
  const [messages, setMessages]       = useState<Message[]>([]);
  const [chatInput, setChatInput]     = useState("");
  const [siteHtml, setSiteHtml]       = useState("");
  const [streamHtml, setStreamHtml]   = useState("");
  const [businessName, setBusinessName] = useState("");
  const [generating, setGenerating]   = useState(false);
  const [sectionsBuilt, setSectionsBuilt] = useState(0);
  const [device, setDevice]           = useState<"desktop"|"tablet"|"mobile">("desktop");
  const [panelOpen, setPanelOpen]     = useState(true);

  const chatEndRef  = useRef<HTMLDivElement>(null);
  const chatTaRef   = useRef<HTMLTextAreaElement>(null);
  const landingRef  = useRef<HTMLTextAreaElement>(null);
  const iframeRef   = useRef<HTMLIFrameElement>(null);
  const historyRef  = useRef<{role:"user"|"assistant";content:string}[]>([]);
  const streamRef   = useRef("");   // accumulates raw HTML stream

  // ── scroll chat to bottom ──────────────────────────────────
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, generating]);

  // ── write streamHtml into iframe ───────────────────────────
  useEffect(() => {
    const html = streamHtml || siteHtml;
    if (!html || !iframeRef.current) return;
    const doc = iframeRef.current.contentDocument ?? iframeRef.current.contentWindow?.document;
    if (!doc) return;
    doc.open(); doc.write(html); doc.close();
  }, [streamHtml, siteHtml]);

  const addMsg = useCallback((role:"user"|"assistant", content:string) => {
    const m: Message = { id: Math.random().toString(36).slice(2), role, content };
    setMessages(prev => [...prev, m]);
    historyRef.current.push({ role, content });
  }, []);

  // ── streaming fetch ────────────────────────────────────────
  const callAPI = useCallback(async (userMsg: string, currentHtml: string, biz: string) => {
    setGenerating(true);
    setSectionsBuilt(0);
    streamRef.current = "";

    try {
      const res = await fetch("/api/chat-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, currentHtml, businessName: biz, history: historyRef.current.slice(-8) }),
      });

      if (!res.ok || !res.body) throw new Error(`${res.status}`);

      const contentType = res.headers.get("content-type") ?? "";
      const isSSE = contentType.includes("text/event-stream");

      if (isSSE) {
        // ── SSE streaming mode ──────────────────────────────
        const reader = res.body.getReader();
        const dec    = new TextDecoder();
        let   buf    = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });

          const lines = buf.split("\n");
          buf = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (!raw) continue;

            try {
              const evt = JSON.parse(raw);

              if (evt.type === "chunk") {
                // Live HTML streaming — accumulate and write to iframe
                streamRef.current += evt.text;
                // Throttle DOM writes: only update every ~300 chars
                if (streamRef.current.length % 300 < evt.text.length) {
                  const partial = streamRef.current;
                  setStreamHtml(partial + "</body></html>");
                }
              }

              if (evt.type === "section") {
                setSectionsBuilt(evt.count);
              }

              if (evt.type === "complete") {
                // Edit-mode: full HTML in one shot
                setSiteHtml(evt.html);
                setStreamHtml("");
                if (evt.businessName) setBusinessName(evt.businessName);
                addMsg("assistant", evt.message ?? "Done! What else would you like to change?");
                setAppState("builder");
              }

              if (evt.type === "done") {
                // Build-mode: stream finished
                const finalHtml = streamRef.current;
                setSiteHtml(finalHtml);
                setStreamHtml("");
                if (evt.businessName) setBusinessName(evt.businessName);

                // Detect biz name from title if not set
                if (!evt.businessName) {
                  const m = finalHtml.match(/<title>([^<]+)<\/title>/i);
                  if (m) setBusinessName(m[1].split(/[—\-|]/)[0].trim());
                }

                addMsg("assistant", evt.message ?? "Done! What else would you like to change?");
                setAppState("builder");
              }

              if (evt.type === "error") throw new Error(evt.message);

            } catch { /* skip malformed events */ }
          }
        }
      } else {
        // ── Non-SSE fallback (JSON) ─────────────────────────
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setSiteHtml(data.html);
        setStreamHtml("");
        if (data.businessName) setBusinessName(data.businessName);
        addMsg("assistant", data.message ?? "Done! What else would you like to change?");
        setAppState("builder");
      }

    } catch (err) {
      addMsg("assistant", "Something went wrong — try rephrasing and I'll try again.");
      if (!siteHtml) setAppState("landing");
      else setAppState("builder");
    } finally {
      setGenerating(false);
    }
  }, [addMsg, siteHtml]);

  const handleLaunch = useCallback(() => {
    const text = landingInput.trim();
    if (!text || generating) return;
    const biz = text.split(/[—\-]/)[0].trim();
    setBusinessName(biz);
    setAppState("building");
    addMsg("user", text);
    addMsg("assistant", `Building your ${biz} site — watch it appear section by section.`);
    callAPI(`Build a complete premium website for: ${text}`, "", biz);
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
    setAppState("landing"); setMessages([]); setSiteHtml(""); setStreamHtml("");
    setLandingInput(""); historyRef.current = []; setBusinessName(""); setSectionsBuilt(0);
  };

  const previewWidth = device === "desktop" ? "100%" : device === "tablet" ? "768px" : "390px";
  const totalSections = SECTION_LABELS.length;

  // ═══════════════════════════════════════════════════════════
  // LANDING
  // ═══════════════════════════════════════════════════════════
  if (appState === "landing") return (
    <div style={{ minHeight:"100svh", background:"#080807", color:"#e8e0d0", fontFamily:"-apple-system,'Inter',sans-serif", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"40px 20px 60px", position:"relative", overflow:"hidden" }}>
      
      {/* Ambient glow */}
      <div style={{ position:"fixed", top:"-15%", left:"50%", transform:"translateX(-50%)", width:"700px", height:"500px", background:"radial-gradient(ellipse,rgba(200,169,110,.07) 0%,transparent 70%)", filter:"blur(40px)", pointerEvents:"none", zIndex:0 }} />
      
      <div style={{ position:"relative", zIndex:1, width:"100%", maxWidth:660, display:"flex", flexDirection:"column", alignItems:"center" }}>

        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:48, animation:"fadeUp .5s ease .05s both" }}>
          <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,#c8a96e,#a07840)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:16, color:"#0a0a08", boxShadow:"0 4px 20px rgba(200,169,110,.3)" }}>S</div>
          <span style={{ fontWeight:800, fontSize:20, letterSpacing:"-.4px" }}>Site<span style={{ color:"#c8a96e" }}>craft</span></span>
        </div>

        {/* Headline */}
        <div style={{ textAlign:"center", marginBottom:14, animation:"fadeUp .5s ease .1s both" }}>
          <h1 style={{ fontSize:"clamp(32px,6vw,54px)", fontWeight:900, letterSpacing:"-2px", lineHeight:1.08, margin:0, color:"#e8e0d0" }}>
            Describe your business.
          </h1>
          <h1 style={{ fontSize:"clamp(32px,6vw,54px)", fontWeight:900, letterSpacing:"-2px", lineHeight:1.08, margin:0, color:"#c8a96e" }}>
            Watch your site appear.
          </h1>
        </div>

        <p style={{ fontSize:"clamp(14px,2vw,16px)", color:"#3a3830", textAlign:"center", lineHeight:1.75, maxWidth:440, marginBottom:28, animation:"fadeUp .5s ease .18s both" }}>
          Tell Sitecraft what you do. It writes the copy, picks the colours,<br/>and builds the whole site — section by section, live.
        </p>

        {/* Trust badges */}
        <div style={{ display:"flex", gap:8, marginBottom:28, flexWrap:"wrap", justifyContent:"center", animation:"fadeUp .5s ease .24s both" }}>
          {["Real copy","Mobile-ready","Edit with chat","Download HTML"].map((t,i) => (
            <div key={i} style={{ background:"#0e0d0b", border:"1px solid #1e1c18", borderRadius:20, padding:"5px 13px", fontSize:12, color:"#3a3830", display:"flex", alignItems:"center", gap:5 }}>
              <span style={{ color:"#c8a96e", fontSize:9 }}>✦</span>{t}
            </div>
          ))}
        </div>

        {/* Input */}
        <div style={{ width:"100%", position:"relative", animation:"fadeUp .5s ease .3s both" }}>
          <textarea
            ref={landingRef}
            rows={2}
            placeholder="e.g. Rocky Mountain Plumbing — residential and commercial plumbing in Calgary AB"
            value={landingInput}
            onChange={e => { setLandingInput(e.target.value); e.target.style.height="auto"; e.target.style.height=Math.min(e.target.scrollHeight,160)+"px"; }}
            onKeyDown={e => { if (e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleLaunch();} }}
            style={{ width:"100%", background:"#0e0d0b", border:`1px solid ${landingInput?"rgba(200,169,110,.4)":"rgba(200,169,110,.12)"}`, borderRadius:16, padding:"20px 72px 20px 22px", color:"#e8e0d0", fontSize:16, fontFamily:"inherit", lineHeight:1.6, resize:"none", outline:"none", boxSizing:"border-box", boxShadow: landingInput ? "0 0 0 3px rgba(200,169,110,.06),0 8px 32px rgba(0,0,0,.5)" : "0 8px 32px rgba(0,0,0,.3)", transition:"all .2s" }}
          />
          <button onClick={handleLaunch} disabled={!landingInput.trim()}
            style={{ position:"absolute", right:12, bottom:12, width:46, height:46, borderRadius:13, background: landingInput.trim() ? "linear-gradient(135deg,#c8a96e,#a87030)" : "#151310", border:"none", cursor: landingInput.trim() ? "pointer" : "default", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, color: landingInput.trim() ? "#0a0a08" : "#2a2520", fontWeight:700, transition:"all .2s", boxShadow: landingInput.trim() ? "0 4px 16px rgba(200,169,110,.3)" : "none" }}>
            →
          </button>
        </div>

        {/* Example chips */}
        <div style={{ display:"flex", gap:7, flexWrap:"wrap", justifyContent:"center", marginTop:14, animation:"fadeUp .5s ease .38s both" }}>
          {EXAMPLES.map((ex,i) => {
            const label = ex.split(/[—\-]/)[0].trim();
            return (
              <button key={i} onClick={() => { setLandingInput(ex); landingRef.current?.focus(); }}
                style={{ background:"#0d0c0a", border:"1px solid #181612", borderRadius:20, padding:"7px 15px", fontSize:12, color:"#2e2c28", cursor:"pointer", fontFamily:"inherit", transition:"all .15s", whiteSpace:"nowrap" }}
                onMouseEnter={e => { const b=e.currentTarget; b.style.borderColor="rgba(200,169,110,.18)"; b.style.color="#c8a96e"; }}
                onMouseLeave={e => { const b=e.currentTarget; b.style.borderColor="#181612"; b.style.color="#2e2c28"; }}
              >{label}</button>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:.2;transform:scale(.6)}50%{opacity:1;transform:scale(1)}}
        @keyframes slideIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-thumb{background:#1a1810;border-radius:3px}
      `}</style>
    </div>
  );

  // ═══════════════════════════════════════════════════════════
  // BUILDING — section-by-section reveal screen
  // ═══════════════════════════════════════════════════════════
  if (appState === "building") return (
    <div style={{ height:"100svh", background:"#080807", color:"#e8e0d0", fontFamily:"-apple-system,'Inter',sans-serif", display:"flex", overflow:"hidden" }}>

      {/* Left — progress panel */}
      <div style={{ width:300, flexShrink:0, display:"flex", flexDirection:"column", background:"#0a0908", borderRight:"1px solid #161410", padding:"32px 24px", justifyContent:"center", gap:32 }}>
        
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:28 }}>
            <div style={{ width:32, height:32, borderRadius:9, background:"linear-gradient(135deg,#c8a96e,#a07840)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:14, color:"#0a0a08", boxShadow:"0 2px 14px rgba(200,169,110,.35)" }}>S</div>
            <span style={{ fontWeight:800, fontSize:16, letterSpacing:"-.3px" }}>Site<span style={{ color:"#c8a96e" }}>craft</span></span>
          </div>
          <div style={{ fontSize:11, color:"#c8a96e", fontWeight:700, letterSpacing:"1.8px", textTransform:"uppercase", marginBottom:8 }}>Building</div>
          <div style={{ fontSize:22, fontWeight:800, letterSpacing:"-.5px", color:"#e8e0d0", lineHeight:1.2, marginBottom:4 }}>{businessName || "Your site"}</div>
          <div style={{ fontSize:13, color:"#2e2c28" }}>Watch each section appear →</div>
        </div>

        {/* Section steps */}
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {SECTION_LABELS.map((label, i) => {
            const isDone    = i < sectionsBuilt;
            const isActive  = i === sectionsBuilt;
            const isPending = i > sectionsBuilt;
            return (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:11, padding:"9px 12px", borderRadius:10, background: isActive ? "rgba(200,169,110,.07)" : "transparent", border: isActive ? "1px solid rgba(200,169,110,.14)" : "1px solid transparent", transition:"all .35s ease" }}>
                {/* Status dot */}
                <div style={{ width:20, height:20, borderRadius:"50%", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", background: isDone ? "rgba(200,169,110,.15)" : isActive ? "transparent" : "transparent", border: isActive ? "2px solid #1a1810" : "none", transition:"all .35s" }}>
                  {isDone  && <span style={{ fontSize:10, color:"#c8a96e" }}>✓</span>}
                  {isActive && <div style={{ width:14, height:14, borderRadius:"50%", border:"2px solid #1e1c18", borderTopColor:"#c8a96e", animation:"spin 1s linear infinite" }} />}
                  {isPending && <div style={{ width:6, height:6, borderRadius:"50%", background:"#1e1c18" }} />}
                </div>
                <span style={{ fontSize:13, color: isDone ? "#3a3830" : isActive ? "#e8e0d0" : "#1e1c18", fontWeight: isActive ? 600 : 400, transition:"color .35s" }}>{label}</span>
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div>
          <div style={{ height:2, background:"#161410", borderRadius:2, overflow:"hidden", marginBottom:8 }}>
            <div style={{ height:"100%", width:`${(sectionsBuilt/totalSections)*100}%`, background:"linear-gradient(90deg,#8a6030,#c8a96e)", borderRadius:2, transition:"width .5s ease", boxShadow:"0 0 8px rgba(200,169,110,.3)" }} />
          </div>
          <div style={{ fontSize:11, color:"#2e2c28", display:"flex", justifyContent:"space-between" }}>
            <span>{sectionsBuilt} of {totalSections} sections</span>
            <span>{Math.round((sectionsBuilt/totalSections)*100)}%</span>
          </div>
        </div>
      </div>

      {/* Right — live preview */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>
        {/* Browser chrome */}
        <div style={{ height:40, background:"#0a0908", borderBottom:"1px solid #161410", display:"flex", alignItems:"center", padding:"0 14px", gap:10, flexShrink:0 }}>
          <div style={{ display:"flex", gap:5 }}>
            {["#ff5f57","#febc2e","#28c840"].map(c=><div key={c} style={{ width:11,height:11,borderRadius:"50%",background:c,opacity:.6 }}/>)}
          </div>
          <div style={{ flex:1, background:"#0e0d0b", border:"1px solid #161410", borderRadius:7, height:26, display:"flex", alignItems:"center", padding:"0 10px", fontSize:11, color:"#1e1c18", overflow:"hidden", whiteSpace:"nowrap", gap:6 }}>
            <span>🔒</span>
            {businessName ? `${businessName.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"")}.sitecraft.ai` : "sitecraft.ai"}
          </div>
          {/* Live building pulse */}
          <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, color:"#3a3830", flexShrink:0 }}>
            <div style={{ width:7, height:7, borderRadius:"50%", background:"#c8a96e", animation:"pulse 1.4s ease infinite" }} />
            Building live
          </div>
        </div>
        {/* iframe */}
        <div style={{ flex:1, overflow:"hidden", background:"#111" }}>
          <iframe ref={iframeRef} style={{ width:"100%", height:"100%", border:"none", background:"#fff" }} title="preview" sandbox="allow-scripts allow-same-origin allow-forms" />
        </div>
      </div>

      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:.2;transform:scale(.7)}50%{opacity:1;transform:scale(1)}}
        *{box-sizing:border-box}
      `}</style>
    </div>
  );

  // ═══════════════════════════════════════════════════════════
  // BUILDER
  // ═══════════════════════════════════════════════════════════
  return (
    <div style={{ height:"100svh", background:"#080807", color:"#e8e0d0", fontFamily:"-apple-system,'Inter',sans-serif", display:"flex", flexDirection:"column", overflow:"hidden" }}>

      {/* ── TOP BAR ── */}
      <div style={{ height:50, background:"#0a0908", borderBottom:"1px solid #161410", display:"flex", alignItems:"center", padding:"0 14px", gap:10, flexShrink:0, zIndex:30 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", flexShrink:0 }} onClick={handleReset}>
          <div style={{ width:28, height:28, borderRadius:8, background:"linear-gradient(135deg,#c8a96e,#a07840)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:13, color:"#0a0a08", boxShadow:"0 2px 10px rgba(200,169,110,.2)" }}>S</div>
          <span style={{ fontWeight:800, fontSize:15, letterSpacing:"-.3px" }}>Site<span style={{ color:"#c8a96e" }}>craft</span></span>
        </div>
        <div style={{ width:1, height:18, background:"#1a1810", flexShrink:0 }} />
        <div style={{ fontSize:13, color:"#2e2c28", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1, minWidth:0 }}>{businessName}</div>

        {/* Device switcher */}
        <div style={{ display:"flex", gap:2, background:"#0e0d0b", border:"1px solid #1a1810", borderRadius:8, padding:3, flexShrink:0 }}>
          {(["desktop","tablet","mobile"] as const).map(d => (
            <button key={d} onClick={() => setDevice(d)}
              title={d}
              style={{ width:30, height:26, borderRadius:6, border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", background: device===d ? "rgba(200,169,110,.1)" : "transparent", transition:"all .15s" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={device===d?"#c8a96e":"#333"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={icoS(d)}/>
              </svg>
            </button>
          ))}
        </div>

        <div style={{ display:"flex", gap:6, flexShrink:0 }}>
          <button onClick={() => setPanelOpen(p=>!p)}
            style={{ height:32, padding:"0 13px", borderRadius:8, border:"1px solid #1a1810", background:"transparent", color:"#3a3830", cursor:"pointer", fontSize:12, fontFamily:"inherit", transition:"all .15s" }}
            onMouseEnter={e=>{e.currentTarget.style.color="#e8e0d0";}} onMouseLeave={e=>{e.currentTarget.style.color="#3a3830";}}>
            {panelOpen ? "◂ Hide" : "Chat ▸"}
          </button>
          <button onClick={handleReset}
            style={{ height:32, padding:"0 13px", borderRadius:8, border:"1px solid #1a1810", background:"transparent", color:"#3a3830", cursor:"pointer", fontSize:12, fontFamily:"inherit", transition:"all .15s" }}
            onMouseEnter={e=>{e.currentTarget.style.color="#e8e0d0";e.currentTarget.style.borderColor="#2a2820";}} onMouseLeave={e=>{e.currentTarget.style.color="#3a3830";e.currentTarget.style.borderColor="#1a1810";}}>
            New
          </button>
          <button
            onClick={() => { if (!siteHtml) return; const b=new Blob([siteHtml],{type:"text/html"}); const a=document.createElement("a"); a.href=URL.createObjectURL(b); a.download=`${businessName||"sitecraft"}.html`; a.click(); }}
            style={{ height:32, padding:"0 14px", borderRadius:8, border:"1px solid rgba(200,169,110,.18)", background:"rgba(200,169,110,.05)", color:"#c8a96e", cursor:"pointer", fontSize:12, fontFamily:"inherit", fontWeight:600, transition:"all .15s" }}
            onMouseEnter={e=>{e.currentTarget.style.background="rgba(200,169,110,.1)";}} onMouseLeave={e=>{e.currentTarget.style.background="rgba(200,169,110,.05)";}}>
            ↓ Download
          </button>
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ flex:1, display:"flex", overflow:"hidden", minHeight:0 }}>

        {/* ── CHAT PANEL ── */}
        {panelOpen && (
          <div style={{ width:290, flexShrink:0, display:"flex", flexDirection:"column", background:"#0a0908", borderRight:"1px solid #161410" }}>
            <div style={{ flex:1, overflowY:"auto", padding:"14px 12px", display:"flex", flexDirection:"column", gap:9 }}>
              {messages.map(m => (
                <div key={m.id} style={{ animation:"slideIn .2s ease", alignSelf: m.role==="user"?"flex-end":"flex-start", maxWidth:"88%", padding:"9px 13px", fontSize:13, lineHeight:1.65, borderRadius: m.role==="user"?"14px 14px 3px 14px":"14px 14px 14px 3px", background: m.role==="user"?"linear-gradient(135deg,#c8a96e,#b09050)":"#111", color: m.role==="user"?"#0a0a08":"#b0a898", fontWeight: m.role==="user"?500:400, border: m.role==="user"?"none":"1px solid #1a1810", boxShadow: m.role==="user"?"0 2px 8px rgba(200,169,110,.15)":"none" }}>
                  {m.content}
                </div>
              ))}
              {generating && (
                <div style={{ alignSelf:"flex-start", background:"#111", border:"1px solid #1a1810", borderRadius:"14px 14px 14px 3px", padding:"12px 16px", display:"flex", gap:5 }}>
                  {[0,1,2].map(i=><div key={i} style={{ width:6,height:6,borderRadius:"50%",background:"#c8a96e",animation:`pulse 1.2s ease ${i*.2}s infinite` }}/>)}
                </div>
              )}
              <div ref={chatEndRef}/>
            </div>

            {messages.length>=2 && !generating && (
              <div style={{ padding:"6px 10px 0", display:"flex", gap:6, overflowX:"auto", scrollbarWidth:"none" }}>
                {QUICK_EDITS.map((q,i)=>(
                  <button key={i} onClick={()=>{setChatInput(q);chatTaRef.current?.focus();}}
                    style={{ background:"transparent", border:"1px solid #1a1810", borderRadius:16, padding:"5px 11px", fontSize:11, color:"#2e2c28", cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap", flexShrink:0, transition:"all .15s" }}
                    onMouseEnter={e=>{const b=e.currentTarget;b.style.borderColor="rgba(200,169,110,.2)";b.style.color="#c8a96e";}}
                    onMouseLeave={e=>{const b=e.currentTarget;b.style.borderColor="#1a1810";b.style.color="#2e2c28";}}>
                    {q}
                  </button>
                ))}
              </div>
            )}

            <div style={{ padding:"10px 10px 14px", borderTop:"1px solid #161410", flexShrink:0 }}>
              <div style={{ display:"flex", gap:8, alignItems:"flex-end" }}>
                <textarea ref={chatTaRef} rows={1} placeholder={generating?"Updating…":"Change anything…"} value={chatInput} disabled={generating}
                  onChange={e=>{setChatInput(e.target.value);e.target.style.height="auto";e.target.style.height=Math.min(e.target.scrollHeight,100)+"px";}}
                  onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleChatSend();}}}
                  onFocus={e=>{e.target.style.borderColor="rgba(200,169,110,.3)";}}
                  onBlur={e=>{e.target.style.borderColor="#1a1810";}}
                  style={{ flex:1, background:"#0d0c0a", border:"1px solid #1a1810", borderRadius:10, padding:"10px 12px", color:"#e8e0d0", fontSize:14, fontFamily:"inherit", resize:"none", outline:"none", lineHeight:1.5, maxHeight:100, transition:"border-color .15s", opacity:generating?.5:1 }}
                />
                <button onClick={handleChatSend} disabled={!chatInput.trim()||generating}
                  style={{ width:38, height:38, borderRadius:10, background: chatInput.trim()&&!generating?"linear-gradient(135deg,#c8a96e,#a87030)":"#151310", border:"none", cursor: chatInput.trim()&&!generating?"pointer":"default", display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, fontWeight:700, color: chatInput.trim()&&!generating?"#0a0a08":"#252220", flexShrink:0, transition:"all .15s", boxShadow: chatInput.trim()&&!generating?"0 2px 10px rgba(200,169,110,.2)":"none" }}>
                  →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── PREVIEW ── */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0, position:"relative" }}>
          {/* Browser bar */}
          <div style={{ height:38, background:"#0a0908", borderBottom:"1px solid #161410", display:"flex", alignItems:"center", padding:"0 12px", gap:10, flexShrink:0 }}>
            <div style={{ display:"flex", gap:5 }}>
              {["#ff5f57","#febc2e","#28c840"].map(c=><div key={c} style={{ width:11,height:11,borderRadius:"50%",background:c,opacity:.7 }}/>)}
            </div>
            <div style={{ flex:1, background:"#0e0d0b", border:"1px solid #161410", borderRadius:7, height:26, display:"flex", alignItems:"center", padding:"0 10px", fontSize:11, color:"#1e1c18", gap:5, overflow:"hidden", whiteSpace:"nowrap", minWidth:0 }}>
              <span style={{ opacity:.5 }}>🔒</span>
              {businessName?`${businessName.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"")}.sitecraft.ai`:"sitecraft.ai"}
            </div>
            {generating&&siteHtml&&(
              <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, color:"#3a3830", flexShrink:0 }}>
                <div style={{ width:12,height:12,borderRadius:"50%",border:"2px solid #1a1810",borderTopColor:"#c8a96e",animation:"spin 1s linear infinite" }}/>
                Updating
              </div>
            )}
          </div>
          <div style={{ flex:1, overflow:"auto", display:"flex", justifyContent:"center", background: device!=="desktop"?"#070706":"#111", padding:device!=="desktop"?"20px":0 }}>
            {!siteHtml&&!generating&&(
              <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10, color:"#1e1c18", pointerEvents:"none" }}>
                <div style={{ fontSize:36 }}>🏗</div>
                <div style={{ fontSize:13 }}>Your site will appear here</div>
              </div>
            )}
            <iframe ref={iframeRef}
              style={{ width:previewWidth, height:device!=="desktop"?"calc(100svh - 130px)":"100%", border:"none", background:"#fff", borderRadius:device!=="desktop"?10:0, boxShadow:device!=="desktop"?"0 8px 50px rgba(0,0,0,.5)":"none", flexShrink:0, transition:"width .3s ease" }}
              title="preview" sandbox="allow-scripts allow-same-origin allow-forms"
            />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:.2;transform:scale(.6)}50%{opacity:1;transform:scale(1)}}
        @keyframes slideIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-thumb{background:#1a1810;border-radius:3px}
      `}</style>
    </div>
  );
}
