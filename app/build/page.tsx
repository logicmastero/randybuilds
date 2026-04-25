"use client";
import { useState, useEffect, useRef, useCallback } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface BuildState {
  html: string;
  businessName: string;
  sourceUrl?: string;
  history: Message[];
  isLoading: boolean;
}

export default function BuilderPage() {
  const [state, setState] = useState<BuildState>({
    html: "",
    businessName: "",
    sourceUrl: "",
    history: [],
    isLoading: true,
  });
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [panel, setPanel] = useState<"preview" | "code">("preview");
  const [previewScale, setPreviewScale] = useState(1);
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [showPublish, setShowPublish] = useState(false);
  const [saved, setSaved] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  // Load initial state from sessionStorage (set by homepage after generating preview)
  useEffect(() => {
    const raw = sessionStorage.getItem("rb_build_state");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setState(s => ({
          ...s,
          html: parsed.html || "",
          businessName: parsed.businessName || "Your Business",
          sourceUrl: parsed.sourceUrl || "",
          isLoading: false,
          history: [
            {
              role: "assistant",
              content: `I've generated a premium website for **${parsed.businessName || "your business"}**. This is your starting point — it's fully editable. Try telling me:\n\n- "Make the hero section darker"\n- "Add a contact form section"\n- "Change the font to something more modern"\n- "Add a testimonials section with 3 reviews"\n- "Make the CTA button bigger and gold"\n\nWhat would you like to change first?`,
            },
          ],
        }));
        return;
      } catch {
        // fallthrough
      }
    }

    // No session state — generate a starter template
    setState(s => ({
      ...s,
      isLoading: false,
      html: STARTER_HTML,
      businessName: "Your Business",
      history: [
        {
          role: "assistant",
          content: `Welcome to **RandyBuilds** — your AI website builder.\n\nTell me about your business and I'll build you a custom website right here. Try:\n\n- "Build a website for my plumbing company in Toronto"\n- "I run a coffee shop called Grounds & Glory in Austin"\n- "Create a site for my digital marketing agency"\n\nOr just describe what you do and I'll take it from there.`,
        },
      ],
    }));
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.history, sending]);

  // Update iframe when html changes
  useEffect(() => {
    if (!state.html) return;
    const render = () => {
      if (!iframeRef.current) return;
      const doc = iframeRef.current.contentDocument;
      if (!doc) return;
      doc.open();
      doc.write(state.html);
      doc.close();
    };
    // rAF ensures DOM is painted before we write
    const raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [state.html]);

  // Device preview dimensions
  const deviceDims = {
    desktop: { width: "100%", maxWidth: "none" },
    tablet: { width: "768px", maxWidth: "768px" },
    mobile: { width: "390px", maxWidth: "390px" },
  };

  const sendMessage = useCallback(async () => {
    if (!input.trim() || sending) return;
    const userMessage = input.trim();
    setInput("");
    setSending(true);

    const newHistory: Message[] = [...state.history, { role: "user", content: userMessage }];
    setState(s => ({ ...s, history: newHistory }));

    try {
      const res = await fetch("/api/chat-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          currentHtml: state.html,
          businessName: state.businessName,
          sourceUrl: state.sourceUrl,
          history: state.history.slice(-6), // last 6 messages for context
        }),
      });

      if (!res.ok) throw new Error("Edit failed");
      const data = await res.json();

      setState(s => ({
        ...s,
        html: data.html || s.html,
        businessName: data.businessName || s.businessName,
        history: [
          ...newHistory,
          { role: "assistant", content: data.message || "Done! What else would you like to change?" },
        ],
      }));
    } catch {
      setState(s => ({
        ...s,
        history: [
          ...newHistory,
          { role: "assistant", content: "Something went wrong — try again. If the issue persists, refresh the page." },
        ],
      }));
    } finally {
      setSending(false);
      chatInputRef.current?.focus();
    }
  }, [input, sending, state]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSave = () => {
    const blob = new Blob([state.html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${state.businessName.replace(/\s+/g, "-").toLowerCase()}-website.html`;
    a.click();
    URL.revokeObjectURL(url);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      background: "#0a0a08",
      color: "#e8e0d0",
      fontFamily: "'Inter', -apple-system, sans-serif",
      overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Instrument+Serif:ital@0;1&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #111; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
        textarea { resize: none; outline: none; font-family: inherit; }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:1} }
        .msg-bubble { animation: fadeIn 0.3s ease forwards; }
        .dot-pulse span { display:inline-block; width:6px; height:6px; border-radius:50%; background:#c8a96e; animation:pulse 1.2s ease-in-out infinite; margin:0 2px; }
        .dot-pulse span:nth-child(2) { animation-delay:0.2s; }
        .dot-pulse span:nth-child(3) { animation-delay:0.4s; }
        .device-btn { background:transparent; border:none; cursor:pointer; padding:6px 8px; border-radius:6px; color:rgba(232,224,208,0.4); transition:all 0.15s; font-size:14px; }
        .device-btn.active { background:rgba(200,169,110,0.15); color:#c8a96e; }
        .device-btn:hover { color:rgba(232,224,208,0.8); }
        .tab-btn { background:transparent; border:none; cursor:pointer; padding:6px 14px; border-radius:6px; font-size:12px; font-weight:600; letter-spacing:0.04em; transition:all 0.15s; }
        .tab-btn.active { background:rgba(200,169,110,0.15); color:#c8a96e; }
        .tab-btn:not(.active) { color:rgba(232,224,208,0.4); }
        .send-btn { background:#c8a96e; border:none; cursor:pointer; border-radius:8px; padding:8px 12px; color:#0a0a08; font-weight:700; font-size:13px; transition:all 0.15s; white-space:nowrap; }
        .send-btn:hover { background:#d4b87e; }
        .send-btn:disabled { opacity:0.4; cursor:not-allowed; }
        .action-btn { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); cursor:pointer; border-radius:8px; padding:7px 14px; color:rgba(232,224,208,0.7); font-weight:600; font-size:12px; transition:all 0.15s; }
        .action-btn:hover { border-color:rgba(200,169,110,0.4); color:#c8a96e; }
        .publish-btn { background:linear-gradient(135deg,#c8a96e,#e0c080); border:none; cursor:pointer; border-radius:8px; padding:8px 18px; color:#0a0a08; font-weight:800; font-size:13px; transition:all 0.15s; }
        .publish-btn:hover { transform:translateY(-1px); box-shadow:0 4px 16px rgba(200,169,110,0.3); }
        pre { background:#111; border-radius:8px; padding:12px; overflow:auto; font-size:11px; color:#7ec8a9; border:1px solid #1e1e1e; max-height:100%; }
      `}</style>

      {/* ─── TOP BAR ───────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 16px", height: 52, borderBottom: "1px solid #1a1a14",
        background: "#0d0d0b", flexShrink: 0,
      }}>
        {/* Left — Logo + name */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <a href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 6,
              background: "linear-gradient(135deg,#c8a96e,#a07840)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 900, fontSize: 13, color: "#0a0a08",
            }}>R</div>
            <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(232,224,208,0.9)" }}>
              RandyBuilds
            </span>
          </a>
          <div style={{ width: 1, height: 20, background: "#1e1e18" }} />
          <span style={{ fontSize: 13, color: "rgba(232,224,208,0.4)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {state.businessName || "New Project"}
          </span>
        </div>

        {/* Center — Device switcher + tabs */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", gap: 2, background: "#111", borderRadius: 8, padding: "3px" }}>
            <button className={`device-btn ${device === "desktop" ? "active" : ""}`} onClick={() => setDevice("desktop")} title="Desktop">🖥</button>
            <button className={`device-btn ${device === "tablet" ? "active" : ""}`} onClick={() => setDevice("tablet")} title="Tablet">⬛</button>
            <button className={`device-btn ${device === "mobile" ? "active" : ""}`} onClick={() => setDevice("mobile")} title="Mobile">📱</button>
          </div>
          <div style={{ display: "flex", gap: 2, background: "#111", borderRadius: 8, padding: "3px" }}>
            <button className={`tab-btn ${panel === "preview" ? "active" : ""}`} onClick={() => setPanel("preview")}>Preview</button>
            <button className={`tab-btn ${panel === "code" ? "active" : ""}`} onClick={() => setPanel("code")}>Code</button>
          </div>
        </div>

        {/* Right — Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button className="action-btn" onClick={handleSave}>
            {saved ? "✓ Saved" : "↓ Download"}
          </button>
          <button className="publish-btn" onClick={() => setShowPublish(true)}>
            ✦ Publish Site
          </button>
        </div>
      </div>

      {/* ─── MAIN LAYOUT ───────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ─── CHAT PANEL (LEFT) ─────────────────────────────────────────── */}
        <div style={{
          width: 360, flexShrink: 0,
          display: "flex", flexDirection: "column",
          borderRight: "1px solid #1a1a14",
          background: "#0d0d0b",
        }}>
          {/* Chat header */}
          <div style={{
            padding: "12px 16px", borderBottom: "1px solid #1a1a14",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "linear-gradient(135deg,#c8a96e,#8a6030)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14,
            }}>🤖</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#e8e0d0" }}>Randy — AI Builder</div>
              <div style={{ fontSize: 11, color: "rgba(232,224,208,0.4)" }}>Ask me to edit anything</div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 14 }}>
            {state.history.map((msg, i) => (
              <div key={i} className="msg-bubble" style={{
                display: "flex",
                flexDirection: msg.role === "user" ? "row-reverse" : "row",
                gap: 8, alignItems: "flex-start",
              }}>
                {msg.role === "assistant" && (
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                    background: "linear-gradient(135deg,#c8a96e,#8a6030)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, marginTop: 2,
                  }}>R</div>
                )}
                <div style={{
                  maxWidth: "80%",
                  padding: "10px 14px",
                  borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "4px 16px 16px 16px",
                  background: msg.role === "user" ? "#c8a96e" : "#171712",
                  color: msg.role === "user" ? "#0a0a08" : "#e8e0d0",
                  fontSize: 13, lineHeight: 1.55,
                  border: msg.role === "assistant" ? "1px solid #2a2820" : "none",
                  whiteSpace: "pre-wrap",
                }}>
                  {msg.content.replace(/\*\*(.*?)\*\*/g, "$1")}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {sending && (
              <div className="msg-bubble" style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <div style={{
                  width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                  background: "linear-gradient(135deg,#c8a96e,#8a6030)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, marginTop: 2,
                }}>R</div>
                <div style={{
                  padding: "12px 16px", borderRadius: "4px 16px 16px 16px",
                  background: "#171712", border: "1px solid #2a2820",
                }}>
                  <div className="dot-pulse">
                    <span /><span /><span />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick prompts */}
          {state.history.length <= 2 && (
            <div style={{ padding: "0 14px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(232,224,208,0.3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Try asking</div>
              {[
                "Make the hero section darker and bolder",
                "Add a testimonials section with 3 reviews",
                "Change the color scheme to navy and gold",
                "Add a contact form with phone and email",
                "Make it more modern and minimalist",
              ].map((prompt, i) => (
                <button key={i} onClick={() => { setInput(prompt); chatInputRef.current?.focus(); }} style={{
                  background: "#111", border: "1px solid #1e1e18",
                  borderRadius: 8, padding: "7px 12px", color: "rgba(232,224,208,0.6)",
                  fontSize: 12, cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                  fontFamily: "inherit",
                }}
                  onMouseEnter={e => { (e.target as HTMLButtonElement).style.borderColor = "rgba(200,169,110,0.4)"; (e.target as HTMLButtonElement).style.color = "#c8a96e"; }}
                  onMouseLeave={e => { (e.target as HTMLButtonElement).style.borderColor = "#1e1e18"; (e.target as HTMLButtonElement).style.color = "rgba(232,224,208,0.6)"; }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{
            padding: "12px 14px", borderTop: "1px solid #1a1a14",
            display: "flex", flexDirection: "column", gap: 8,
          }}>
            <div style={{
              display: "flex", gap: 8, alignItems: "flex-end",
              background: "#111", border: "1px solid #2a2820", borderRadius: 10,
              padding: "8px 8px 8px 12px",
            }}>
              <textarea
                ref={chatInputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tell me what to change…"
                rows={1}
                style={{
                  flex: 1, background: "transparent", border: "none",
                  color: "#e8e0d0", fontSize: 13, lineHeight: 1.5,
                  maxHeight: 120, overflowY: "auto",
                  fontFamily: "'Inter', sans-serif",
                }}
                onInput={e => {
                  const t = e.target as HTMLTextAreaElement;
                  t.style.height = "auto";
                  t.style.height = Math.min(t.scrollHeight, 120) + "px";
                }}
              />
              <button className="send-btn" onClick={sendMessage} disabled={!input.trim() || sending}>
                {sending ? "..." : "Send"}
              </button>
            </div>
            <div style={{ fontSize: 10, color: "rgba(232,224,208,0.25)", textAlign: "center" }}>
              Enter to send · Shift+Enter for new line
            </div>
          </div>
        </div>

        {/* ─── PREVIEW PANEL (RIGHT) ─────────────────────────────────────── */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          background: "#111", overflow: "hidden",
        }}>
          {state.isLoading ? (
            <div style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              flexDirection: "column", gap: 16,
            }}>
              <div style={{
                width: 40, height: 40, border: "3px solid #2a2820",
                borderTopColor: "#c8a96e", borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }} />
              <div style={{ color: "rgba(232,224,208,0.5)", fontSize: 14 }}>Generating your site...</div>
            </div>
          ) : panel === "preview" ? (
            <div style={{
              flex: 1, display: "flex", alignItems: device !== "desktop" ? "flex-start" : "stretch",
              justifyContent: "center", padding: device !== "desktop" ? "16px" : "0",
              overflowY: device !== "desktop" ? "auto" : "hidden",
              background: device !== "desktop" ? "#0d0d0b" : "#111",
            }}>
              <div style={{
                width: deviceDims[device].width,
                maxWidth: deviceDims[device].maxWidth,
                height: device !== "desktop" ? "85vh" : "100%",
                borderRadius: device !== "desktop" ? 12 : 0,
                overflow: "hidden",
                boxShadow: device !== "desktop" ? "0 8px 40px rgba(0,0,0,0.6)" : "none",
                transition: "all 0.3s ease",
                position: "relative",
              }}>
                <iframe
                  ref={iframeRef}
                  style={{ width: "100%", height: "100%", border: "none", display: "block" }}
                  title="Site Preview"
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, padding: 16, overflow: "auto" }}>
              <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                {state.html}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* ─── PUBLISH MODAL ─────────────────────────────────────────────────── */}
      {showPublish && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
        }} onClick={() => setShowPublish(false)}>
          <div style={{
            background: "#141210", border: "1px solid #2a2820", borderRadius: 20,
            padding: 40, maxWidth: 480, width: "calc(100% - 32px)",
            animation: "fadeIn 0.3s ease",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#c8a96e", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>✦ Publish Your Site</div>
            <h2 style={{ fontSize: "1.6rem", fontWeight: 900, color: "#e8e0d0", marginBottom: 12, lineHeight: 1.2 }}>
              Your site is ready to go live
            </h2>
            <p style={{ color: "rgba(232,224,208,0.6)", fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>
              Download your site file now for free, or publish to a live subdomain and get your own URL — <strong style={{ color: "#c8a96e" }}>yourbusiness.randybuilds.site</strong>
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
              {/* Free option */}
              <div style={{ background: "#1a1810", border: "1px solid #2a2820", borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontWeight: 700, color: "#e8e0d0", marginBottom: 4 }}>Download HTML</div>
                  <div style={{ fontSize: 12, color: "rgba(232,224,208,0.5)" }}>Free — host it yourself anywhere</div>
                </div>
                <button onClick={handleSave} style={{
                  background: "transparent", border: "1px solid rgba(200,169,110,0.4)",
                  borderRadius: 8, padding: "8px 16px", color: "#c8a96e",
                  fontWeight: 700, fontSize: 13, cursor: "pointer",
                }}>Download</button>
              </div>

              {/* Paid option */}
              <div style={{ background: "linear-gradient(135deg,rgba(200,169,110,0.08),rgba(160,120,60,0.05))", border: "1px solid rgba(200,169,110,0.25)", borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontWeight: 700, color: "#e8e0d0", marginBottom: 4 }}>
                    Live Subdomain
                    <span style={{ marginLeft: 8, background: "#c8a96e", color: "#0a0a08", fontSize: 10, fontWeight: 900, padding: "2px 8px", borderRadius: 100, letterSpacing: "0.06em" }}>$19/mo</span>
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(232,224,208,0.5)" }}>yourbusiness.randybuilds.site + SSL + CDN</div>
                </div>
                <button onClick={async () => {
                  const res = await fetch("/api/stripe/checkout", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ plan: "retainer", businessName: state.businessName }),
                  });
                  const d = await res.json();
                  if (d.url) window.location.href = d.url;
                }} style={{
                  background: "linear-gradient(135deg,#c8a96e,#a07840)",
                  border: "none", borderRadius: 8, padding: "8px 16px",
                  color: "#0a0a08", fontWeight: 800, fontSize: 13, cursor: "pointer",
                }}>Publish →</button>
              </div>

              {/* Custom domain */}
              <div style={{ background: "#1a1810", border: "1px solid #2a2820", borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontWeight: 700, color: "#e8e0d0", marginBottom: 4 }}>
                    Custom Domain
                    <span style={{ marginLeft: 8, background: "#333", color: "#e8e0d0", fontSize: 10, fontWeight: 900, padding: "2px 8px", borderRadius: 100, letterSpacing: "0.06em" }}>$49/mo</span>
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(232,224,208,0.5)" }}>yourname.com + SSL + hosting + support</div>
                </div>
                <button onClick={async () => {
                  const res = await fetch("/api/stripe/checkout", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ plan: "standard", businessName: state.businessName }),
                  });
                  const d = await res.json();
                  if (d.url) window.location.href = d.url;
                }} style={{
                  background: "#1f1f18", border: "1px solid #333",
                  borderRadius: 8, padding: "8px 16px",
                  color: "#e8e0d0", fontWeight: 700, fontSize: 13, cursor: "pointer",
                }}>Get Started →</button>
              </div>
            </div>

            <button onClick={() => setShowPublish(false)} style={{
              background: "transparent", border: "none", color: "rgba(232,224,208,0.4)",
              fontSize: 13, cursor: "pointer", width: "100%", textAlign: "center",
            }}>← Keep editing</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Starter template (used when no session state) ─────────────────────────
const STARTER_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Your Business — Built by RandyBuilds</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: system-ui, -apple-system, sans-serif; background: #0a0a08; color: #e8e0d0; }
  .hero { min-height:100vh; display:flex; align-items:center; justify-content:center; text-align:center; padding:40px 24px; background: linear-gradient(135deg,#0a0a08,#1a1610); }
  h1 { font-size: clamp(2.5rem, 6vw, 5rem); font-weight: 900; letter-spacing:-0.03em; line-height:1.1; margin-bottom:20px; }
  .gold { color: #c8a96e; }
  p { font-size:1.2rem; color:rgba(232,224,208,0.6); max-width:520px; margin:0 auto 36px; line-height:1.6; }
  .cta { display:inline-block; background:#c8a96e; color:#0a0a08; padding:16px 36px; border-radius:12px; font-weight:800; font-size:1rem; text-decoration:none; }
  .notice { position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:rgba(200,169,110,0.1); border:1px solid rgba(200,169,110,0.3); border-radius:12px; padding:14px 24px; font-size:13px; color:#c8a96e; text-align:center; backdrop-filter:blur(10px); }
</style>
</head>
<body>
<div class="hero">
  <div>
    <h1>Tell me about your<br><span class="gold">business</span></h1>
    <p>Describe what you do in the chat on the left and I'll build you a custom website right here — live, in real time.</p>
    <a href="#" class="cta">← Type in the chat to start</a>
  </div>
</div>
<div class="notice">💬 Use the chat on the left to build your site</div>
</body>
</html>`;
