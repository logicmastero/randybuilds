"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const TEMPLATES = [
  {
    id: "plumbing",
    name: "Plumbing",
    icon: "🔧",
    description: "Service calls, testimonials, booking",
  },
  {
    id: "landscaping",
    name: "Landscaping",
    icon: "🌳",
    description: "Before/after gallery, testimonials, booking",
  },
  {
    id: "cleaning",
    name: "Cleaning Services",
    icon: "✨",
    description: "Service packages, pricing, local areas",
  },
  {
    id: "towing",
    name: "Towing & Recovery",
    icon: "🚗",
    description: "24/7 service, fast response, testimonials",
  },
  {
    id: "hvac",
    name: "HVAC Services",
    icon: "❄️",
    description: "Seasonal promotions, maintenance plans, fast booking",
  },
  {
    id: "electrical",
    name: "Electrical",
    icon: "⚡",
    description: "Service areas, safety certifications, emergency line",
  },
  {
    id: "construction",
    name: "Construction",
    icon: "🏗️",
    description: "Project portfolio, team, testimonials, bid requests",
  },
  {
    id: "roofing",
    name: "Roofing",
    icon: "🏠",
    description: "Before/after, warranty info, free quotes",
  },
];

export default function Templates() {
  const router = useRouter();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTemplateSelect = useCallback(async (templateId: string) => {
    setSelectedTemplate(templateId);
    setLoading(true);

    try {
      const template = TEMPLATES.find((t) => t.id === templateId);
      const res = await fetch("/api/redesign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scraped: {
            businessName: template?.name || "Your Business",
            description: `Professional ${template?.name || "service"} website template with proven conversion elements.`,
            url: "https://template.example.com",
            services: ["Contact", "Booking", "Testimonials"],
            colors: [],
            images: [],
            headline: `Professional ${template?.name || "Service"} Website`,
            phone: null,
            email: null,
            address: null,
            logoUrl: null,
          },
        }),
      });

      if (!res.ok) {
        setLoading(false);
        setSelectedTemplate(null);
        alert("Failed to generate site. Please try again.");
        return;
      }

      const data = await res.json();
      if (data.preview) {
        router.push(`/build-from-preview?slug=${data.preview.slug || "template-" + templateId}`);
      } else {
        setLoading(false);
        setSelectedTemplate(null);
        alert("Failed to generate site. Please try again.");
      }
    } catch (error) {
      console.error("Error:", error);
      setLoading(false);
      setSelectedTemplate(null);
      alert("An error occurred. Please try again.");
    }
  }, [router]);

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "#e8e0d0", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ padding: "40px 20px", textAlign: "center", borderBottom: "1px solid rgba(232,224,208,0.1)" }}>
        <h1 style={{ fontSize: 48, fontWeight: 700, margin: "0 0 12px 0", background: "linear-gradient(135deg, #c8a96e, #e8d0a8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Choose Your Industry
        </h1>
        <p style={{ fontSize: 16, color: "rgba(232,224,208,0.6)", margin: 0, maxWidth: 500, marginLeft: "auto", marginRight: "auto" }}>
          Pick your industry. We'll generate a professional website in seconds.
        </p>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "60px 20px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
        {TEMPLATES.map((template) => (
          <button
            key={template.id}
            onClick={() => handleTemplateSelect(template.id)}
            disabled={loading && selectedTemplate !== template.id}
            style={{
              all: "unset",
              cursor: loading && selectedTemplate !== template.id ? "not-allowed" : "pointer",
              padding: 24,
              border: selectedTemplate === template.id ? "2px solid #c8a96e" : "1px solid rgba(232,224,208,0.15)",
              borderRadius: 12,
              background: selectedTemplate === template.id ? "rgba(200,169,110,0.1)" : "rgba(232,224,208,0.03)",
              transition: "all 0.2s",
              textAlign: "left",
              opacity: loading && selectedTemplate !== template.id ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (selectedTemplate !== template.id && !loading) {
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(232,224,208,0.3)";
                (e.currentTarget as HTMLElement).style.background = "rgba(232,224,208,0.08)";
              }
            }}
            onMouseLeave={(e) => {
              if (selectedTemplate !== template.id) {
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(232,224,208,0.15)";
                (e.currentTarget as HTMLElement).style.background = "rgba(232,224,208,0.03)";
              }
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>{template.icon}</div>
            <h3 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 8px 0" }}>{template.name}</h3>
            <p style={{ fontSize: 13, color: "rgba(232,224,208,0.5)", margin: 0, lineHeight: 1.5 }}>{template.description}</p>

            {selectedTemplate === template.id && loading && (
              <div style={{ marginTop: 16, fontSize: 12, color: "#c8a96e", fontWeight: 500 }}>
                Generating your site...
              </div>
            )}
          </button>
        ))}
      </div>

      <div style={{ padding: "40px 20px", textAlign: "center", borderTop: "1px solid rgba(232,224,208,0.1)" }}>
        <p style={{ fontSize: 14, color: "rgba(232,224,208,0.5)", margin: 0 }}>
          or <a href="/" style={{ color: "#c8a96e", textDecoration: "none", fontWeight: 600 }}>generate from URL</a> instead
        </p>
      </div>
    </div>
  );
}
