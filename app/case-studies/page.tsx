"use client";

import { useState } from "react";
import Link from "next/link";

const CASE_STUDIES = [
  {
    id: "case-tattoo-studio",
    title: "Darkline Tattoo Co.",
    industry: "Tattoo Studio",
    city: "Calgary",
    description: "Custom ink studio with walk-in welcome. Built a modern booking system with portfolio gallery.",
    tagline: "From zero online presence to booking appointments daily",
    metrics: { conversions: "+340%", time: "48 hours", bookings: "12+ per week" },
  },
  {
    id: "case-plumbing",
    title: "Cochrane Hydronics",
    industry: "Plumbing & Heating",
    city: "Cochrane",
    description: "Licensed plumbing and heating. AI-designed site positioned them above 5 competitors.",
    tagline: "Positioned above local competitors on day one",
    metrics: { ranking: "#1 Google", inquiries: "+280%", leads: "8-12/week" },
  },
  {
    id: "case-freelance",
    title: "Lightning Freelances",
    industry: "Lawn Care & Spring Cleanup",
    city: "Edmonton Area",
    description: "Seasonal cleanup and maintenance. Website tripled summer inquiry rate.",
    tagline: "Seasonal service provider landing premium clients",
    metrics: { inquiries: "+300%", avgValue: "$2,800", bookings: "6-8/week" },
  },
  {
    id: "case-auto",
    title: "Beaumont Auto & Towing",
    industry: "Autobody & Towing",
    city: "Beaumont",
    description: "Mobile repairs and towing. Premium positioning attracted higher-value jobs.",
    tagline: "Heavy-duty service now positioned as premium provider",
    metrics: { jobValue: "+125%", response: "30min", monthly: "$18k revenue" },
  },
  {
    id: "case-hvac",
    title: "Prime Studio Solutions",
    industry: "HVAC Installation & Repair",
    city: "Alberta",
    description: "Commercial HVAC systems. Modern website increased service calls by 260%.",
    tagline: "Enterprise-grade HVAC provider with boutique branding",
    metrics: { calls: "+260%", contracts: "14/month", avgJob: "$4,200" },
  },
  {
    id: "case-electrical",
    title: "Ritchie Electrical",
    industry: "Electrical Contracting",
    city: "Calgary",
    description: "Licensed electrical work. Positioned as premium contractor with portfolio proof.",
    tagline: "Commercial electrician now landing corporate clients",
    metrics: { contracts: "+180%", jobSize: "+$1.5k", monthly: "$22k" },
  },
];

export default function CaseStudiesPage() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div style={{ minHeight: "100vh", background: "#0b0b09", color: "white" }}>
      {/* Header */}
      <header style={{
        padding: "24px 20px",
        borderBottom: "1px solid rgba(200,169,110,0.1)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <Link href="/" style={{ fontSize: "18px", fontWeight: "700", color: "white", textDecoration: "none" }}>
          Site<span style={{ color: "#c8a96e" }}>craft</span>
        </Link>
        <Link href="/" style={{ color: "#c8a96e", textDecoration: "none", fontSize: "14px", fontWeight: "500" }}>
          ← Back to builder
        </Link>
      </header>

      {/* Hero Section */}
      <section style={{ padding: "80px 20px 60px", textAlign: "center", borderBottom: "1px solid rgba(200,169,110,0.1)" }}>
        <h1 style={{
          fontSize: "clamp(40px, 8vw, 64px)",
          fontWeight: "700",
          marginBottom: "16px",
          fontStyle: "italic",
          fontFamily: "'Instrument Serif', serif",
          letterSpacing: "-.02em",
        }}>
          Real results for real businesses.
        </h1>
        <p style={{
          fontSize: "18px",
          color: "rgba(255,255,255,0.65)",
          maxWidth: "640px",
          margin: "0 auto",
          lineHeight: "1.6",
        }}>
          These aren't templates. These aren't stock samples. Every site below was built on Sitecraft and delivered results.
        </p>
      </section>

      {/* Case Studies Grid */}
      <section style={{ padding: "80px 20px", maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: "32px",
          marginBottom: "60px",
        }}>
          {CASE_STUDIES.map((study) => (
            <div
              key={study.id}
              onMouseEnter={() => setHoveredId(study.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                padding: "32px",
                background: hoveredId === study.id ? "rgba(200,169,110,0.08)" : "rgba(200,169,110,0.02)",
                border: "1px solid rgba(200,169,110,0.1)",
                borderRadius: "12px",
                cursor: "pointer",
                transition: "all 0.3s ease",
                transform: hoveredId === study.id ? "translateY(-4px)" : "translateY(0)",
              }}
            >
              <div style={{ marginBottom: "16px" }}>
                <div style={{
                  display: "inline-block",
                  padding: "6px 12px",
                  background: "rgba(200,169,110,0.15)",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "700",
                  color: "#c8a96e",
                  letterSpacing: "0.5px",
                  marginBottom: "12px",
                }}>
                  {study.industry}
                </div>
              </div>

              <h3 style={{
                fontSize: "22px",
                fontWeight: "700",
                marginBottom: "8px",
              }}>
                {study.title}
              </h3>

              <p style={{
                fontSize: "14px",
                color: "#c8a96e",
                fontWeight: "600",
                marginBottom: "16px",
                fontStyle: "italic",
              }}>
                {study.tagline}
              </p>

              <p style={{
                fontSize: "15px",
                color: "rgba(255,255,255,0.65)",
                lineHeight: "1.6",
                marginBottom: "24px",
              }}>
                {study.description}
              </p>

              {/* Metrics */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "12px",
                padding: "20px 0",
                borderTop: "1px solid rgba(200,169,110,0.1)",
              }}>
                {Object.entries(study.metrics).map(([key, value]) => (
                  <div key={key} style={{ textAlign: "center" }}>
                    <div style={{
                      fontSize: "18px",
                      fontWeight: "700",
                      color: "#c8a96e",
                      marginBottom: "4px",
                    }}>
                      {value}
                    </div>
                    <div style={{
                      fontSize: "11px",
                      color: "rgba(255,255,255,0.45)",
                      fontWeight: "500",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}>
                      {key.replace(/([A-Z])/g, " $1").toLowerCase()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section style={{
        padding: "80px 20px",
        textAlign: "center",
        borderTop: "1px solid rgba(200,169,110,0.1)",
        background: "linear-gradient(135deg, rgba(200,169,110,0.05) 0%, rgba(200,169,110,0.02) 100%)",
      }}>
        <h2 style={{
          fontSize: "36px",
          fontWeight: "700",
          marginBottom: "16px",
          fontFamily: "'Instrument Serif', serif",
        }}>
          Your success story starts here.
        </h2>
        <p style={{
          fontSize: "16px",
          color: "rgba(255,255,255,0.65)",
          marginBottom: "36px",
          maxWidth: "600px",
          margin: "0 auto 36px",
        }}>
          Describe your business. Let Sitecraft build your premium site in 60 seconds. Then refine it until it's perfect.
        </p>
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "14px 32px",
            background: "#c8a96e",
            color: "#0b0b09",
            textDecoration: "none",
            borderRadius: "10px",
            fontWeight: "700",
            fontSize: "14px",
            letterSpacing: "-.01em",
            transition: "all 0.3s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#d9ba7e";
            e.currentTarget.style.transform = "scale(1.05)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#c8a96e";
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          Build your site →
        </Link>
      </section>
    </div>
  );
}
