"use client";
import { useState, useEffect, useRef, useCallback } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

interface Snapshot {
  html: string;
  label: string;
}

interface BuildState {
  html: string;
  businessName: string;
  sourceUrl?: string;
  history: Message[];
  isLoading: boolean;
  slug?: string;
}

const SECTION_INSERTS: Array<{ label: string; icon: string; prompt: string }> = [
  { label: "Hero",         icon: "✦", prompt: "Add a full-viewport hero section with a bold headline, subtext, and two CTA buttons." },
  { label: "Services",     icon: "⚡", prompt: "Add a services section with 3 feature cards showing icons, titles, and descriptions." },
  { label: "Testimonials", icon: "★", prompt: "Add a testimonials section with 3 customer reviews, star ratings, name, and company." },
  { label: "Stats",        icon: "📊", prompt: "Add a stats strip with 4 impressive numbers (clients, projects, years, etc.) with labels." },
  { label: "FAQ",          icon: "❓", prompt: "Add an FAQ section with 5 common questions and answers as an accordion." },
  { label: "Gallery",      icon: "🖼", prompt: "Add a portfolio/gallery grid section with 6 image placeholders and captions." },
  { label: "Team",         icon: "👥", prompt: "Add a team section with 3 team member cards with placeholder photos, names, and roles." },
  { label: "Pricing",      icon: "💰", prompt: "Add a 3-tier pricing section with feature lists and CTA buttons." },
  { label: "Contact",      icon: "📬", prompt: "Add a contact section with a form (name, email, phone, message) and contact details." },
  { label: "CTA Band",     icon: "🚀", prompt: "Add a full-width CTA section with a bold headline and two action buttons." },
  { label: "Footer",       icon: "▬",  prompt: "Add a complete footer with logo, nav links, social icons, and copyright." },
];

const QUICK_PROMPTS: Array<{ label: string; prompt: string }> = [
  { label: "Darker hero",      prompt: "Make the hero section darker and more dramatic with a deeper background" },
  { label: "Gold accents",     prompt: "Change the accent color to gold (#c8a96e) throughout the site" },
  { label: "Add reviews",      prompt: "Add a testimonials section with 3 glowing reviews from real-sounding customers" },
  { label: "Bigger CTAs",      prompt: "Make all CTA buttons larger, bolder, and more prominent" },
  { label: "Modern fonts",     prompt: "Update typography to use Instrument Serif for headings and Inter for body text" },
  { label: "Add contact form", prompt: "Add a contact form section with fields for name, email, phone, and message" },
  { label: "Make it light",    prompt: "Switch to a clean white/light color scheme throughout" },
  { label: "Remove clutter",   prompt: "Make the design more minimal — remove decorative elements and simplify layout" },
];

const COLOR_PALETTES: Array<{ label: string; color: string; prompt: string }> = [
  { label: "Gold",    color: "#c8a96e", prompt: "Change the accent color to gold (#c8a96e) — update buttons, highlights, and accents throughout" },
  { label: "Blue",    color: "#3b82f6", prompt: "Change the accent color to electric blue (#3b82f6) throughout the site" },
  { label: "Green",   color: "#4ade80", prompt: "Change the accent color to emerald green (#4ade80) throughout the site" },
  { label: "Red",     color: "#ef4444", prompt: "Change the accent color to bold red (#ef4444) throughout the site" },
  { label: "Purple",  color: "#a855f7", prompt: "Change the accent color to purple (#a855f7) throughout the site" },
  { label: "Teal",    color: "#14b8a6", prompt: "Change the accent color to teal (#14b8a6) throughout the site" },
  { label: "Orange",  color: "#f97316", prompt: "Change the accent color to vibrant orange (#f97316) throughout the site" },
  { label: "White",   color: "#ffffff", prompt: "Switch to a clean white/light color scheme — light background, dark text" },
];

export default function BuilderPage() {
  const [state, setState] = useState<BuildState>({
    html: "", businessName: "", sourceUrl: "", history: [], isLoading: true,
  });
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [panel, setPanel] = useState<"preview" | "code">("preview");
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [showPublish, setShowPublish] = useState(false);
  const [showSections, setShowSections] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [chatWidth, setChatWidth] = useState(360);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [showShareToast, setShowShareToast] = useState(false);
  const [sectionOrder, setSectionOrder] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [undoStack, setUndoStack] = useState<Snapshot[]>([]);
  const [redoStack, setRedoStack] = useState<Snapshot[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(360);

  // ── Load initial state ─────────────────────────────────────────────────────
  useEffect(() => {
    const raw = sessionStorage.getItem("rb_build_state");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.html) {
          setState(s => ({
            ...s,
            html: parsed.html,
            businessName: parsed.businessName || "Your Business",
            sourceUrl: parsed.sourceUrl || "",
            slug: parsed.slug,
            isLoading: false,
            history: [{
              role: "assistant",
              content: `Your site for **${parsed.businessName || "your business"}** is ready. It's fully editable — chat with me to change anything.\n\nTry: "make the hero darker", "add testimonials", "change to a blue color scheme"`,
            }],
          }));
          return;
        }
      } catch { /* fallthrough */ }
    }
    setState(s => ({
      ...s, isLoading: false, html: STARTER_HTML, businessName: "Your Business",
      history: [{
        role: "assistant",
        content: `Welcome to **Sitecraft** — your AI website builder.\n\nDescribe your business and I'll build you a full custom website live. Try:\n\n"Build a site for my plumbing company in Calgary"\n"I run a coffee shop called Brew & Co in Vancouver"\n"Create a site for my landscaping business"`,
      }],
    }));
  }, []);

  // ── Render iframe ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!state.html) return;
    requestAnimationFrame(() => {
      const iframe = iframeRef.current;
      const doc = iframe?.contentDocument;
      if (!doc) return;
      doc.open(); doc.write(state.html); doc.close();

      // Inject section-click helpers after render
      setTimeout(() => {
        try {
          const iDoc = iframe?.contentDocument;
          if (!iDoc) return;
          const script = iDoc.createElement("script");
          script.textContent = `
            (function() {
              if (window.__rb_injected) return;
              window.__rb_injected = true;
              var hoveredEl = null;
              var tooltip = document.createElement('div');
              tooltip.style.cssText = 'position:fixed;z-index:99999;background:rgba(10,10,8,0.96);border:1px solid rgba(200,169,110,0.5);border-radius:8px;padding:7px 13px;font-size:12px;font-weight:700;color:#c8a96e;font-family:system-ui,sans-serif;pointer-events:none;display:none;white-space:nowrap;backdrop-filter:blur(10px);';
              tooltip.textContent = '✦ Click to edit this section';
              document.body.appendChild(tooltip);

              var TARGETS = 'section, header, footer, main, article, aside, [data-section], .hero, .services, .testimonials, .faq, .pricing, .contact, .gallery, .team, .cta, .about, .stats';
              var draggedEl = null;
              var dragStartY = 0;

              // ─ Add drag handles to all sections
              function addDragHandles() {
                var elements = document.querySelectorAll(TARGETS);
                elements.forEach(function(el, idx) {
                  if (el.__rb_drag_added) return;
                  el.__rb_drag_added = true;
                  el.style.position = 'relative';
                  var handle = document.createElement('div');
                  handle.className = '__rb_drag_handle';
                  handle.style.cssText = 'position:absolute;left:0;top:0;width:24px;height:24px;cursor:grab;display:none;align-items:center;justify-content:center;background:rgba(200,169,110,0.2);border-radius:4px;font-size:12px;color:#c8a96e;z-index:1000;';
                  handle.innerHTML = '⋮⋮';
                  handle.onmousedown = function(e) {
                    e.preventDefault(); e.stopPropagation();
                    draggedEl = el;
                    dragStartY = e.clientY;
                    handle.style.background = 'rgba(200,169,110,0.4)';
                    handle.style.cursor = 'grabbing';
                  };
                  el.appendChild(handle);
                  el.addEventListener('mouseenter', function() {
                    if (draggedEl) return;
                    el.querySelector('.__rb_drag_handle').style.display = 'flex';
                  });
                  el.addEventListener('mouseleave', function() {
                    if (draggedEl) return;
                    el.querySelector('.__rb_drag_handle').style.display = 'none';
                  });
                });
              }
              addDragHandles();

              // ─ Handle section drag
              document.addEventListener('mousemove', function(e) {
                if (!draggedEl) return;
                var deltaY = e.clientY - dragStartY;
                if (Math.abs(deltaY) < 40) return; // minimum drag distance
                var rect = draggedEl.getBoundingClientRect();
                var next = draggedEl.nextElementSibling;
                var prev = draggedEl.previousElementSibling;
                if (deltaY > 0 && next && next.matches(TARGETS)) {
                  draggedEl.parentNode.insertBefore(next, draggedEl);
                  dragStartY = e.clientY;
                  window.parent.postMessage({ type: 'section-reordered' }, '*');
                } else if (deltaY < 0 && prev && prev.matches(TARGETS)) {
                  draggedEl.parentNode.insertBefore(draggedEl, prev);
                  dragStartY = e.clientY;
                  window.parent.postMessage({ type: 'section-reordered' }, '*');
                }
              });

              document.addEventListener('mouseup', function(e) {
                if (draggedEl) {
                  var handle = draggedEl.querySelector('.__rb_drag_handle');
                  handle.style.background = 'rgba(200,169,110,0.2)';
                  handle.style.cursor = 'grab';
                  draggedEl = null;
                }
              });

              document.addEventListener('mouseover', function(e) {
                var el = e.target.closest(TARGETS);
                if (!el || el === document.body || el === document.documentElement) return;
                if (hoveredEl !== el) {
                  if (hoveredEl) hoveredEl.style.outline = '';
                  hoveredEl = el;
                  el.style.outline = '2px solid rgba(200,169,110,0.5)';
                  el.style.outlineOffset = '-2px';
                }
                tooltip.style.display = 'block';
                tooltip.style.top = (e.clientY + 14) + 'px';
                tooltip.style.left = Math.min(e.clientX + 10, window.innerWidth - 220) + 'px';
              });

              document.addEventListener('mouseout', function(e) {
                if (hoveredEl && !hoveredEl.contains(e.relatedTarget)) {
                  hoveredEl.style.outline = '';
                  hoveredEl = null;
                }
                tooltip.style.display = 'none';
              });

              document.addEventListener('click', function(e) {
                var el = e.target.closest(TARGETS);
                if (!el) return;
                e.preventDefault(); e.stopPropagation();
                var tagName = el.tagName.toLowerCase();
                var cls = el.className && typeof el.className === 'string' ? el.className.split(' ').filter(function(c){return c&&c.length<20}).slice(0,2).join(' ') : '';
                var sectionLabel = cls || tagName;
                var text = (el.textContent || '').trim().slice(0, 60);
                window.parent.postMessage({ type: 'section-click', sectionLabel: sectionLabel, sectionText: text }, '*');
                el.style.outline = '2px solid rgba(200,169,110,0.9)';
                setTimeout(function(){ el.style.outline = ''; }, 800);
              }, true);
            })();
          `;
          iDoc.head?.appendChild(script);
        } catch { /* cross-origin or timing issue — ignore */ }
      }, 200);
    });
  }, [state.html]);

  // Listen for section-click messages from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type !== "section-click") return;
      const { sectionLabel, sectionText } = e.data;
      const prompt = sectionText
        ? `Edit the ${sectionLabel} section that contains "${sectionText.slice(0, 40)}" — `
        : `Edit the ${sectionLabel} section — `;
      setInput(prev => prev || prompt);
      chatInputRef.current?.focus();
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // Listen for section reorder from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type !== "section-reordered") return;
      // Read the new HTML order from iframe
      const iframeDoc = iframeRef.current?.contentDocument;
      if (!iframeDoc) return;
      const html = iframeDoc.documentElement.outerHTML;
      setState(s => ({ ...s, html }));
      // Optional: send to AI to acknowledge the reorder
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // ── Auto-scroll chat ───────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.history, sending, streamingText]);

  // ── Textarea auto-height ───────────────────────────────────────────────────
  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  };

  // ── Undo / Redo ────────────────────────────────────────────────────────────
  const pushUndo = useCallback((label: string) => {
    setUndoStack(prev => [...prev.slice(-29), { html: state.html, label }]);
    setRedoStack([]);
  }, [state.html]);

  const handleUndo = useCallback(() => {
    if (!undoStack.length) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack(r => [...r, { html: state.html, label: "redo" }]);
    setUndoStack(u => u.slice(0, -1));
    setState(s => ({ ...s, html: prev.html }));
  }, [undoStack, state.html]);

  const handleRedo = useCallback(() => {
    if (!redoStack.length) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack(u => [...u, { html: state.html, label: "undo" }]);
    setRedoStack(r => r.slice(0, -1));
    setState(s => ({ ...s, html: next.html }));
  }, [redoStack, state.html]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); handleUndo(); }
      if ((e.metaKey || e.ctrlKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); handleRedo(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleUndo, handleRedo]);

  // ── Share link ────────────────────────────────────────────────────────────
  const handleShare = useCallback(async () => {
    // Save to Neon first so the link persists
    const slug = state.slug || `site-${Date.now()}`;
    try {
      const res = await fetch("/api/projects/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: { html: state.html, businessName: state.businessName, sourceUrl: state.sourceUrl, slug } }),
      });
      const d = await res.json();
      const finalSlug = d.slug || slug;
      const url = `${window.location.origin}/preview/${finalSlug}`;
      setShareUrl(url);
      await navigator.clipboard.writeText(url).catch(() => {});
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 3000);
    } catch {
      // Fallback — just share the preview URL with slug
      const url = `${window.location.origin}/preview/${slug}`;
      setShareUrl(url);
      await navigator.clipboard.writeText(url).catch(() => {});
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 3000);
    }
  }, [state]);

  // ── Panel resize drag ──────────────────────────────────────────────────────
  const startDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartX.current = e.clientX;
    dragStartWidth.current = chatWidth;
  }, [chatWidth]);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      const delta = e.clientX - dragStartX.current;
      setChatWidth(Math.max(280, Math.min(600, dragStartWidth.current + delta)));
    };
    const onUp = () => setIsDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [isDragging]);

  // ── Send message with streaming ────────────────────────────────────────────
  const sendMessage = useCallback(async (msg?: string) => {
    const userMessage = (msg || input).trim();
    if (!userMessage || sending) return;
    setInput("");
    setSending(true);
    setStreamingText("");
    setShowSections(false);
    if (chatInputRef.current) { chatInputRef.current.style.height = "auto"; }

    pushUndo(userMessage.slice(0, 40));

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
          slug: state.slug,
          history: state.history.slice(-8),
          stream: true,
        }),
      });

      if (!res.ok || !res.body) throw new Error("Edit request failed");

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let accumulated = "";
      let lastPreviewUpdate = 0;

      const tryLivePreview = (text: string) => {
        // Find the start of the HTML in the accumulated JSON
        const htmlStart = text.indexOf("<!DOCTYPE");
        if (htmlStart === -1) return;
        const partial = text.slice(htmlStart);
        // Only update preview if we have a meaningful amount (avoids flicker)
        if (partial.length < 1500) return;
        // Throttle to every 800ms max
        const now = Date.now();
        if (now - lastPreviewUpdate < 800) return;
        lastPreviewUpdate = now;
        // Close any open tags so it renders decently
        const closedHtml = partial + (partial.includes("</html>") ? "" : "\n</body></html>");
        setState(s => ({ ...s, html: closedHtml }));
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = dec.decode(value, { stream: true });
        const lines = text.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.chunk) {
              accumulated += data.chunk;
              setStreamingText("building…");
              tryLivePreview(accumulated);
            }
            if (data.done) {
              setStreamingText("");
              setState(s => ({
                ...s,
                html: data.html || s.html,
                businessName: data.businessName || s.businessName,
                history: [
                  ...newHistory,
                  { role: "assistant", content: data.message || "Done! What else would you like to change?" },
                ],
              }));
            }
            if (data.error) {
              setStreamingText("");
              setState(s => ({
                ...s,
                history: [...newHistory, { role: "assistant", content: `Something went wrong: ${data.error}` }],
              }));
            }
          } catch { /* skip malformed SSE lines */ }
        }
      }
    } catch (err) {
      setStreamingText("");
      const msg = err instanceof Error ? err.message : "Unknown error";
      setState(s => ({
        ...s,
        history: [...newHistory, { role: "assistant", content: `Error: ${msg}. Try again.` }],
      }));
    } finally {
      setSending(false);
      chatInputRef.current?.focus();
    }
  }, [input, sending, state, pushUndo]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // ── Save to account ────────────────────────────────────────────────────────
  const handleSaveToAccount = async () => {
    setSaveStatus("saving");
    try {
      const res = await fetch("/api/projects/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: {
            html: state.html,
            businessName: state.businessName,
            sourceUrl: state.sourceUrl,
            slug: state.slug || `site-${Date.now()}`,
          },
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else if (data.error === "Unauthorized") {
        // Redirect to login, return to builder after
        sessionStorage.setItem("rb_build_state", JSON.stringify({
          html: state.html, businessName: state.businessName, sourceUrl: state.sourceUrl,
        }));
        window.location.href = "/login?next=/build";
      } else {
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 3000);
      }
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  // ── Download HTML ──────────────────────────────────────────────────────────
  const handleDownload = () => {
    const blob = new Blob([state.html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${state.businessName.replace(/\s+/g, "-").toLowerCase()}-website.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const deviceDims: Record<string, { width: string }> = {
    desktop: { width: "100%" },
    tablet:  { width: "768px" },
    mobile:  { width: "390px" },
  };

  const saveLabel = { idle: "☁ Save", saving: "Saving…", saved: "✓ Saved!", error: "⚠ Error" }[saveStatus];
  const saveBg = saveStatus === "saved" ? "rgba(74,222,128,0.15)" : saveStatus === "error" ? "rgba(255,80,80,0.15)" : undefined;

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100vh",
      background: "#0a0a08", color: "#e8e0d0",
      fontFamily: "'Inter', -apple-system, sans-serif", overflow: "hidden",
      userSelect: isDragging ? "none" : "auto",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Instrument+Serif:ital@0;1&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:#111}
        ::-webkit-scrollbar-thumb{background:#2a2820;border-radius:2px}
        textarea{resize:none;outline:none;font-family:inherit}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:0.35}50%{opacity:1}}
        @keyframes stream-glow{0%,100%{opacity:0.5}50%{opacity:1}}
        .msg-bubble{animation:fadeUp 0.25s ease forwards}
        .dot-pulse span{display:inline-block;width:5px;height:5px;border-radius:50%;background:#c8a96e;animation:pulse 1.1s ease-in-out infinite;margin:0 2px}
        .dot-pulse span:nth-child(2){animation-delay:0.18s}
        .dot-pulse span:nth-child(3){animation-delay:0.36s}
        .device-btn{background:transparent;border:none;cursor:pointer;padding:6px 8px;border-radius:6px;color:rgba(232,224,208,0.35);transition:all 0.15s;font-size:14px;line-height:1}
        .device-btn.active{background:rgba(200,169,110,0.15);color:#c8a96e}
        .device-btn:hover:not(.active){color:rgba(232,224,208,0.7)}
        .tab-btn{background:transparent;border:none;cursor:pointer;padding:5px 12px;border-radius:6px;font-size:12px;font-weight:600;letter-spacing:0.03em;transition:all 0.15s;font-family:inherit}
        .tab-btn.active{background:rgba(200,169,110,0.15);color:#c8a96e}
        .tab-btn:not(.active){color:rgba(232,224,208,0.35)}
        .tab-btn:not(.active):hover{color:rgba(232,224,208,0.7)}
        .icon-btn{background:transparent;border:1px solid rgba(255,255,255,0.07);cursor:pointer;border-radius:7px;padding:6px 11px;color:rgba(232,224,208,0.5);font-weight:600;font-size:12px;transition:all 0.15s;display:flex;align-items:center;gap:5px;white-space:nowrap;font-family:inherit}
        .icon-btn:hover{border-color:rgba(200,169,110,0.4);color:#c8a96e}
        .icon-btn:disabled{opacity:0.35;cursor:not-allowed}
        .icon-btn.active{background:rgba(200,169,110,0.1);border-color:rgba(200,169,110,0.35);color:#c8a96e}
        .publish-btn{background:linear-gradient(135deg,#c8a96e,#e0c080);border:none;cursor:pointer;border-radius:8px;padding:7px 16px;color:#0a0a08;font-weight:800;font-size:12px;transition:all 0.15s;white-space:nowrap;font-family:inherit}
        .publish-btn:hover{transform:translateY(-1px);box-shadow:0 4px 14px rgba(200,169,110,0.35)}
        .send-btn{background:#c8a96e;border:none;cursor:pointer;border-radius:8px;padding:8px 14px;color:#0a0a08;font-weight:800;font-size:13px;transition:all 0.15s;flex-shrink:0;line-height:1}
        .send-btn:hover{background:#d4b87e}
        .send-btn:disabled{opacity:0.4;cursor:not-allowed}
        .quick-chip{background:#111;border:1px solid #1e1e18;border-radius:20px;padding:5px 11px;color:rgba(232,224,208,0.55);font-size:11px;cursor:pointer;transition:all 0.15s;white-space:nowrap;font-family:inherit}
        .quick-chip:hover{border-color:rgba(200,169,110,0.4);color:#c8a96e;background:rgba(200,169,110,0.06)}
        .section-chip{background:#111;border:1px solid #1e1e18;border-radius:8px;padding:8px 12px;color:rgba(232,224,208,0.6);font-size:12px;font-weight:600;cursor:pointer;transition:all 0.15s;display:flex;align-items:center;gap:6px;font-family:inherit}
        .section-chip:hover{border-color:rgba(200,169,110,0.4);color:#e8e0d0;background:rgba(200,169,110,0.05)}
        .drag-handle{width:4px;background:transparent;cursor:col-resize;flex-shrink:0;transition:background 0.15s;position:relative;z-index:10}
        .drag-handle:hover,.drag-handle.dragging{background:rgba(200,169,110,0.35)}
        .overlay-close{position:fixed;inset:0;z-index:40;background:rgba(0,0,0,0.5)}
        .overlay-panel{position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;padding:24px}
        pre{background:#0d0d0b;border-radius:0;padding:20px;overflow:auto;font-size:11px;color:#7ec8a9;border:none;height:100%;margin:0;line-height:1.5;tab-size:2}
      `}</style>

      {/* ─── TOP BAR ─────────────────────────────────────────────────────── */}
      <div style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"0 14px", height:50, borderBottom:"1px solid #1a1a14",
        background:"#0d0d0b", flexShrink:0, gap:12,
      }}>
        {/* Left */}
        <div style={{ display:"flex", alignItems:"center", gap:12, minWidth:0 }}>
          <a href="/" style={{ textDecoration:"none", display:"flex", alignItems:"center", gap:7, flexShrink:0 }}>
            <div style={{
              width:26, height:26, borderRadius:6,
              background:"linear-gradient(135deg,#c8a96e,#a07840)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontWeight:900, fontSize:12, color:"#0a0a08",
            }}>S</div>
            <span style={{ fontSize:13, fontWeight:700, color:"rgba(232,224,208,0.9)" }}>Sitecraft</span>
          </a>
          <div style={{ width:1, height:18, background:"#1e1e18", flexShrink:0 }} />
          <span style={{ fontSize:12, color:"rgba(232,224,208,0.35)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:180 }}>
            {state.businessName || "New Site"}
          </span>
        </div>

        {/* Center */}
        <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
          <div style={{ display:"flex", gap:2, background:"#111", borderRadius:7, padding:"3px" }}>
            <button className={`device-btn ${device==="desktop"?"active":""}`} onClick={()=>setDevice("desktop")} title="Desktop">🖥</button>
            <button className={`device-btn ${device==="tablet"?"active":""}`} onClick={()=>setDevice("tablet")} title="Tablet">⬛</button>
            <button className={`device-btn ${device==="mobile"?"active":""}`} onClick={()=>setDevice("mobile")} title="Mobile">📱</button>
          </div>
          <div style={{ display:"flex", gap:2, background:"#111", borderRadius:7, padding:"3px" }}>
            <button className={`tab-btn ${panel==="preview"?"active":""}`} onClick={()=>setPanel("preview")}>Preview</button>
            <button className={`tab-btn ${panel==="code"?"active":""}`} onClick={()=>setPanel("code")}>Code</button>
          </div>
        </div>

        {/* Right */}
        <div style={{ display:"flex", alignItems:"center", gap:7, flexShrink:0 }}>
          <button className="icon-btn" onClick={handleUndo} disabled={!undoStack.length} title="Undo (Ctrl+Z)">↩ Undo</button>
          <button className="icon-btn" onClick={handleRedo} disabled={!redoStack.length} title="Redo (Ctrl+Y)">↪ Redo</button>
          <button className="icon-btn" onClick={handleShare} title="Copy shareable link">⎘ Share</button>
          <button className="icon-btn" onClick={handleDownload}>↓ HTML</button>
          <button
            className="icon-btn"
            onClick={handleSaveToAccount}
            disabled={saveStatus === "saving"}
            style={saveBg ? { background: saveBg } : undefined}
          >{saveLabel}</button>
          <button className="publish-btn" onClick={()=>setShowPublish(true)}>✦ Publish</button>
        </div>
      </div>

      {/* ─── MAIN LAYOUT ─────────────────────────────────────────────────── */}
      <div style={{ display:"flex", flex:1, overflow:"hidden" }}>

        {/* ─── CHAT PANEL ────────────────────────────────────────────────── */}
        <div style={{
          width: chatWidth, flexShrink:0, display:"flex", flexDirection:"column",
          borderRight:"1px solid #1a1a14", background:"#0d0d0b",
        }}>
          {/* Chat header */}
          <div style={{
            padding:"10px 14px", borderBottom:"1px solid #1a1a14",
            display:"flex", alignItems:"center", justifyContent:"space-between",
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:9 }}>
              <div style={{
                width:30, height:30, borderRadius:"50%",
                background:"linear-gradient(135deg,#c8a96e,#7a4f1a)",
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:13,
              }}>✦</div>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:"#e8e0d0" }}>Randy</div>
                <div style={{ fontSize:10, color:"rgba(232,224,208,0.35)" }}>AI website editor</div>
              </div>
            </div>
            <button
              className={`icon-btn ${showSections?"active":""}`}
              onClick={()=>setShowSections(v=>!v)}
              style={{ fontSize:11 }}
            >+ Section</button>
          </div>

          {/* Section insert panel */}
          {showSections && (
            <div style={{
              padding:"12px 14px", borderBottom:"1px solid #1a1a14",
              background:"#0b0b09", maxHeight:220, overflowY:"auto",
            }}>
              <div style={{ fontSize:10, fontWeight:700, color:"rgba(232,224,208,0.3)", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:8 }}>Insert Section</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                {SECTION_INSERTS.map(s => (
                  <button key={s.label} className="section-chip" onClick={()=>{sendMessage(s.prompt);setShowSections(false);}}>
                    <span>{s.icon}</span><span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div style={{ flex:1, overflowY:"auto", padding:"14px 12px", display:"flex", flexDirection:"column", gap:12 }}>
            {state.history.map((msg, i) => (
              <div key={i} className="msg-bubble" style={{
                display:"flex",
                flexDirection: msg.role==="user" ? "row-reverse" : "row",
                gap:8, alignItems:"flex-start",
              }}>
                {msg.role==="assistant" && (
                  <div style={{
                    width:22, height:22, borderRadius:"50%", flexShrink:0,
                    background:"linear-gradient(135deg,#c8a96e,#7a4f1a)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:10, marginTop:2, color:"#0a0a08", fontWeight:900,
                  }}>✦</div>
                )}
                <div style={{
                  maxWidth:"82%", padding:"9px 13px",
                  borderRadius: msg.role==="user" ? "14px 14px 4px 14px" : "4px 14px 14px 14px",
                  background: msg.role==="user" ? "#c8a96e" : "#131310",
                  color: msg.role==="user" ? "#0a0a08" : "#e8e0d0",
                  fontSize:13, lineHeight:1.55,
                  border: msg.role==="assistant" ? "1px solid #222218" : "none",
                  whiteSpace:"pre-wrap",
                }}>
                  {msg.content.replace(/\*\*(.*?)\*\*/g,"$1")}
                </div>
              </div>
            ))}

            {/* Streaming indicator */}
            {sending && (
              <div className="msg-bubble" style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
                <div style={{
                  width:22, height:22, borderRadius:"50%", flexShrink:0,
                  background:"linear-gradient(135deg,#c8a96e,#7a4f1a)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:10, marginTop:2, color:"#0a0a08", fontWeight:900,
                }}>✦</div>
                <div style={{
                  padding:"10px 14px", borderRadius:"4px 14px 14px 14px",
                  background:"#131310", border:"1px solid #222218",
                  display:"flex", alignItems:"center", gap:8,
                }}>
                  <div className="dot-pulse"><span/><span/><span/></div>
                  {streamingText && (
                    <span style={{ fontSize:11, color:"rgba(200,169,110,0.6)", animation:"stream-glow 1s ease infinite" }}>
                      building…
                    </span>
                  )}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick prompts — show after first assistant msg */}
          {state.history.length <= 1 && !sending && (
            <div style={{ padding:"0 12px 10px", overflowX:"auto" }}>
              <div style={{ fontSize:10, fontWeight:700, color:"rgba(232,224,208,0.25)", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:7 }}>Quick edits</div>
              <div style={{ display:"flex", gap:6, flexWrap: "wrap" }}>
                {QUICK_PROMPTS.map((p,i) => (
                  <button key={i} className="quick-chip" onClick={()=>sendMessage(p.prompt)}>{p.label}</button>
                ))}
              </div>
            </div>
          )}

          {/* Undo hint */}
          {undoStack.length > 0 && !sending && (
            <div style={{ padding:"6px 14px", fontSize:10, color:"rgba(232,224,208,0.2)", borderTop:"1px solid #151510", textAlign:"center" }}>
              {undoStack.length} change{undoStack.length!==1?"s":""} · Ctrl+Z to undo
            </div>
          )}

          {/* Input */}
          <div style={{ padding:"10px 12px", borderTop:"1px solid #1a1a14" }}>
            <div style={{
              display:"flex", gap:8, alignItems:"flex-end",
              background:"#111", border:"1px solid #252520", borderRadius:10,
              padding:"8px 8px 8px 12px",
            }}>
              <textarea
                ref={chatInputRef}
                value={input}
                onChange={e => { setInput(e.target.value); autoResize(e.target); }}
                onKeyDown={handleKeyDown}
                placeholder="Tell me what to change…"
                rows={1}
                style={{
                  flex:1, background:"transparent", border:"none",
                  color:"#e8e0d0", fontSize:13, lineHeight:1.5,
                  maxHeight:160, overflowY:"auto", paddingTop:2,
                }}
              />
              <button className="send-btn" onClick={()=>sendMessage()} disabled={sending||!input.trim()}>
                {sending ? "…" : "↑"}
              </button>
            </div>
            <div style={{ fontSize:10, color:"rgba(232,224,208,0.2)", marginTop:5, textAlign:"center" }}>
              Enter to send · Shift+Enter for newline
            </div>
          </div>
        </div>

        {/* ─── DRAG HANDLE ─────────────────────────────────────────────────── */}
        <div className={`drag-handle ${isDragging?"dragging":""}`} onMouseDown={startDrag} />

        {/* ─── PREVIEW / CODE PANEL ────────────────────────────────────────── */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", background:"#111" }}>
          {state.isLoading ? (
            <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16 }}>
              <div style={{ width:40, height:40, border:"3px solid #1e1e18", borderTopColor:"#c8a96e", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
              <div style={{ color:"rgba(232,224,208,0.4)", fontSize:13 }}>Loading your site…</div>
            </div>
          ) : panel==="code" ? (
            <div style={{ flex:1, overflow:"hidden" }}>
              <pre><code>{state.html}</code></pre>
            </div>
          ) : (
            <div style={{
              flex:1, display:"flex", alignItems:"flex-start", justifyContent:"center",
              overflow:"auto", background:"#0e0e0c", padding: device==="desktop" ? "0" : "20px 20px",
            }}>
              <div style={{
                width: deviceDims[device].width,
                height: device==="desktop" ? "100%" : "auto",
                maxWidth: device==="desktop" ? "none" : deviceDims[device].width,
                flexShrink: 0,
                position:"relative",
              }}>
                {device!=="desktop" && (
                  <div style={{
                    position:"absolute", top:-28, left:"50%", transform:"translateX(-50%)",
                    fontSize:11, color:"rgba(232,224,208,0.3)", whiteSpace:"nowrap", fontWeight:600, letterSpacing:"0.06em",
                  }}>
                    {device === "tablet" ? "768px — Tablet" : "390px — Mobile"}
                  </div>
                )}
                <iframe
                  ref={iframeRef}
                  style={{
                    width:"100%", height: device==="desktop" ? "100%" : "667px",
                    border:"none",
                    borderRadius: device==="desktop" ? 0 : 12,
                    boxShadow: device==="desktop" ? "none" : "0 0 0 1px rgba(255,255,255,0.06)",
                    display:"block",
                  }}
                  title="Site Preview"
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── SHARE TOAST ─────────────────────────────────────────────────────── */}
      {showShareToast && (
        <div style={{
          position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)",
          background:"rgba(10,10,8,0.96)", border:"1px solid rgba(200,169,110,0.4)",
          borderRadius:10, padding:"11px 20px", fontSize:13, fontWeight:600,
          color:"#c8a96e", display:"flex", alignItems:"center", gap:10,
          zIndex:1000, backdropFilter:"blur(16px)", boxShadow:"0 8px 32px rgba(0,0,0,0.5)",
          animation:"fadeUp 0.2s ease forwards",
        }}>
          <span>✓ Link copied to clipboard</span>
          {shareUrl && (
            <a href={shareUrl} target="_blank" rel="noreferrer" style={{ color:"rgba(200,169,110,0.6)", fontSize:11, textDecoration:"none" }}>
              open →
            </a>
          )}
        </div>
      )}

      {/* ─── PUBLISH MODAL ───────────────────────────────────────────────────── */}
      {showPublish && (
        <>
          <div className="overlay-close" onClick={()=>setShowPublish(false)} />
          <div className="overlay-panel">
            <div style={{
              background:"#131310", border:"1px solid rgba(200,169,110,0.2)", borderRadius:16,
              width:"100%", maxWidth:460, padding:28, position:"relative",
            }}>
              <button onClick={()=>setShowPublish(false)} style={{
                position:"absolute", top:16, right:16, background:"transparent",
                border:"none", color:"rgba(232,224,208,0.35)", fontSize:18, cursor:"pointer", lineHeight:1,
              }}>×</button>
              <div style={{ fontSize:11, fontWeight:700, color:"#c8a96e", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:12 }}>Publish {state.businessName}</div>
              <div style={{ fontSize:22, fontWeight:800, fontFamily:"'Instrument Serif', serif", color:"#e8e0d0", marginBottom:6 }}>Take your site live</div>
              <div style={{ fontSize:13, color:"rgba(232,224,208,0.5)", marginBottom:24, lineHeight:1.6 }}>Choose how you want to publish your site.</div>

              <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:20 }}>
                {/* Download free */}
                <div style={{ background:"#1a1a14", border:"1px solid #252520", borderRadius:12, padding:"16px 18px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:13, color:"#e8e0d0", marginBottom:3 }}>Download HTML <span style={{ background:"#2a2820", color:"rgba(232,224,208,0.6)", fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:100 }}>Free</span></div>
                    <div style={{ fontSize:12, color:"rgba(232,224,208,0.4)" }}>Host it yourself on any platform</div>
                  </div>
                  <button onClick={()=>{handleDownload();setShowPublish(false);}} className="icon-btn" style={{ flexShrink:0 }}>↓ Download</button>
                </div>

                {/* Save to account */}
                <div style={{ background:"#1a1a14", border:"1px solid #252520", borderRadius:12, padding:"16px 18px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:13, color:"#e8e0d0", marginBottom:3 }}>Save to Account <span style={{ background:"rgba(74,222,128,0.1)", color:"#4ade80", fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:100, border:"1px solid rgba(74,222,128,0.2)" }}>Free</span></div>
                    <div style={{ fontSize:12, color:"rgba(232,224,208,0.4)" }}>Keep it in your dashboard, edit anytime</div>
                  </div>
                  <button onClick={handleSaveToAccount} className="icon-btn" style={{ flexShrink:0, minWidth:80 }}>
                    {saveStatus==="saving" ? "Saving…" : saveStatus==="saved" ? "✓ Saved" : "☁ Save"}
                  </button>
                </div>

                {/* Live hosting */}
                <div style={{ background:"linear-gradient(135deg,rgba(200,169,110,0.07),rgba(160,120,60,0.04))", border:"1px solid rgba(200,169,110,0.25)", borderRadius:12, padding:"16px 18px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:13, color:"#e8e0d0", marginBottom:3 }}>
                      Live Hosting + Domain
                      <span style={{ marginLeft:8, background:"#c8a96e", color:"#0a0a08", fontSize:10, fontWeight:900, padding:"2px 8px", borderRadius:100 }}>From $19/mo</span>
                    </div>
                    <div style={{ fontSize:12, color:"rgba(232,224,208,0.5)" }}>yourdomain.com + SSL + CDN + support</div>
                  </div>
                  <button onClick={async()=>{
                    const res = await fetch("/api/stripe/checkout",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({plan:"retainer",businessName:state.businessName})});
                    const d = await res.json();
                    if(d.url) window.location.href=d.url;
                  }} className="publish-btn" style={{ flexShrink:0 }}>Publish →</button>
                </div>
              </div>

              <div style={{ fontSize:11, color:"rgba(232,224,208,0.2)", textAlign:"center" }}>
                Free plan — unlimited edits · No credit card required
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Starter template ──────────────────────────────────────────────────────────
const STARTER_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Your Business — Sitecraft</title>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;700;900&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Inter',system-ui,sans-serif;background:#0b0b09;color:#e8e2d8;min-height:100vh}
  .hero{min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:60px 24px;background:radial-gradient(ellipse at 50% 0%,rgba(200,169,110,0.08) 0%,transparent 60%)}
  h1{font-family:'Instrument Serif',serif;font-size:clamp(3rem,7vw,6rem);font-weight:400;letter-spacing:-.03em;line-height:1.05;margin-bottom:24px}
  .gold{color:#c8a96e;font-style:italic}
  .sub{font-size:1.1rem;color:rgba(232,226,216,0.55);max-width:480px;margin:0 auto 40px;line-height:1.65}
  .ctarow{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
  .cta{display:inline-block;background:#c8a96e;color:#0b0b09;padding:15px 32px;border-radius:10px;font-weight:800;font-size:.95rem;text-decoration:none}
  .cta-ghost{display:inline-block;background:transparent;border:1px solid rgba(200,169,110,0.35);color:#e8e2d8;padding:15px 32px;border-radius:10px;font-weight:600;font-size:.95rem;text-decoration:none}
  .notice{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:rgba(11,11,9,0.95);border:1px solid rgba(200,169,110,0.3);border-radius:12px;padding:12px 22px;font-size:12px;color:#c8a96e;text-align:center;backdrop-filter:blur(16px);white-space:nowrap;z-index:100}
</style>
</head>
<body>
<div class="hero">
  <div>
    <h1>Tell me about your<br><span class="gold">business.</span></h1>
    <p class="sub">Describe what you do in the chat and I'll build you a full, custom website right here — in real time.</p>
    <div class="ctarow">
      <a href="#" class="cta">← Type in the chat to start</a>
      <a href="#" class="cta-ghost">Or add sections above ↑</a>
    </div>
  </div>
</div>
<div class="notice">💬 Use the chat panel to build your site</div>
</body>
</html>`;
