"use client";

import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";

export default function BuildPage() {
  const [messages, setMessages] = useState<Array<{role: string, content: string}>>([
    { role: "system", content: "You are an expert web designer building a professional website." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState("");
  const [step, setStep] = useState<"input" | "generating" | "preview">("input");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = { role: "user", content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setStep("generating");

    try {
      const res = await fetch("/api/generate-site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          includeHamburgerMenu: true,
          mobileResponsive: true
        })
      });

      if (!res.ok) throw new Error("Generation failed");

      const data = await res.json();
      const assistantMsg = { role: "assistant", content: data.html };
      
      setMessages(prev => [...prev, assistantMsg]);
      setPreview(data.html);
      setStep("preview");
    } catch (err) {
      const errorMsg = { role: "assistant", content: `Error: ${err instanceof Error ? err.message : "Unknown error"}` };
      setMessages(prev => [...prev, errorMsg]);
      setStep("input");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-white">
      {/* Chat Panel */}
      <div className="w-1/2 flex flex-col border-r border-gray-200">
        <div className="flex-1 overflow-y-auto p-6">
          {messages.slice(1).map((msg, i) => (
            <div key={i} className={`mb-4 ${msg.role === "user" ? "text-right" : "text-left"}`}>
              <div className={`inline-block max-w-xs p-3 rounded-lg ${
                msg.role === "user" 
                  ? "bg-blue-500 text-white" 
                  : "bg-gray-100 text-gray-900"
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && <div className="text-gray-500 text-sm">Generating...</div>}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="border-t p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={step === "preview" ? "Ask for changes..." : "Describe your business or request..."}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              <Send size={18} />
            </button>
          </div>
        </form>
      </div>

      {/* Preview Panel */}
      <div className="w-1/2 flex flex-col">
        {preview ? (
          <>
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900">Live Preview</h3>
              <a href={`/preview?html=${encodeURIComponent(preview)}`} target="_blank" className="text-blue-500 text-sm hover:underline">
                View Full Screen →
              </a>
            </div>
            <div className="flex-1 overflow-auto">
              <iframe
                srcDoc={preview}
                className="w-full h-full border-none"
                title="Site Preview"
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center text-gray-500">
              <p className="text-lg font-medium mb-2">Preview will appear here</p>
              <p className="text-sm">Describe your business to get started</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
