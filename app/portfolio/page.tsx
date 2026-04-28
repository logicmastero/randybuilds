"use client";

import { useState } from "react";
import Link from "next/link";

const PORTFOLIO_SITES = [
  {
    id: "portfolio-plumbing",
    title: " Hydronics",
    industry: "Plumbing & Heating",
    city: "",
    description: "Full-service licensed plumbing, heating, and maintenance.",
    slug: "cochrane-hydronics-portfolio",
  },
  {
    id: "portfolio-freelancing",
    title: "Lightning Freelances",
    industry: "Freelancing & Lawn Care",
    city: "",
    description: "Spring cleanup, power raking, hedge trimming, and seasonal services.",
    slug: "lightning-freelances-portfolio",
  },
  {
    id: "portfolio-towing",
    title: "Beaumont Auto & Towing",
    industry: "Autobody & Towing",
    city: "Beaumont",
    description: "Mobile heavy duty repairs, autobody, and towing services.",
    slug: "beaumont-auto-towing-portfolio",
  },
  {
    id: "portfolio-hvac",
    title: "Prime Studio Solutions",
    industry: "Studio Installation & Repair",
    city: "",
    description: "Residential and commercial heating, ventilation, and air conditioning.",
    slug: "prime-hvac-portfolio",
  },
  {
    id: "portfolio-electric",
    title: "Ritchie Electrical",
    industry: "Electrical Contracting",
    city: "",
    description: "Licensed electrical installation, repairs, and maintenance.",
    slug: "ritchie-electrical-portfolio",
  },
  {
    id: "portfolio-cleaning",
    title: "Sparkling Clean Solutions",
    industry: "Cleaning Services",
    city: "",
    description: "Residential and commercial cleaning with eco-friendly products.",
    slug: "sparkling-clean-portfolio",
  },
];

export default function PortfolioPage() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div style={{ minHeight: "100vh", background: "#0b0b09", color: "white" }}>
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

      <section style={{ padding: "60px 20px", textAlign: "center" }}>
        <h1 style={{
          fontSize: "48px",
          fontWeight: "700",
          marginBottom: "16px",
          fontStyle: "italic",
          fontFamily: "'Instrument Serif', serif",
        }}>
          Real sites built for real businesses.
        </h1>
        <p style={{
          fontSize: "18px",
          color: "rgba(255,255,255,0.7)",
          maxWidth: "600px",
          margin: "0 auto",
          lineHeight: "1.6",
        }}>
          Every site below was generated on Sitecraft and customized for the client. Clean, mobile-first, conversion-focused — built in days, not months.
        </p>
      </section>

      <section style={{ padding: "40px 20px", maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
          gap: "32px",
        }}>
          {PORTFOLIO_SITES.map((site) => (
            <Link
              key={site.id}
              href={`/preview/${site.slug}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div
                onMouseEnter={() => setHoveredId(site.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  background: "linear-gradient(135deg, #1a1a17 0%, #2a2a24 100%)",
                  border: "1px solid rgba(200,169,110,0.2)",
                  borderRadius: "12px",
                  overflow: "hidden",
                  cursor: "pointer",
                  transform: hoveredId === site.id ? "translateY(-4px)" : "translateY(0)",
                  transition: "all 0.3s ease",
                }}
              >
                <div style={{
                  width: "100%",
                  height: "240px",
                  background: "linear-gradient(135deg, #1f1f1c 0%, #2d2d26 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "96px",
                  borderBottom: "1px solid rgba(200,169,110,0.1)",
                  position: "relative",
                }}>
                  {hoveredId === site.id && (
                    <div style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(200,169,110,0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#c8a96e",
                    }}>
                      View Full Site →
                    </div>
                  )}
                  🌐
                </div>

                <div style={{ padding: "24px" }}>
                  <div style={{ marginBottom: "12px" }}>
                    <h3 style={{
                      fontSize: "20px",
                      fontWeight: "700",
                      marginBottom: "4px",
                    }}>
                      {site.title}
                    </h3>
                    <p style={{
                      fontSize: "13px",
                      color: "#c8a96e",
                      fontWeight: "600",
                    }}>
                      {site.industry}
                    </p>
                  </div>
                  <p style={{
                    fontSize: "14px",
                    color: "rgba(255,255,255,0.6)",
                    marginBottom: "16px",
                    lineHeight: "1.5",
                  }}>
                    {site.description}
                  </p>
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingTop: "16px",
                    borderTop: "1px solid rgba(200,169,110,0.1)",
                  }}>
                    <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>
                      {site.city}
                    </span>
                    <span style={{
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#c8a96e",
                    }}>
                      View →
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section style={{
        padding: "80px 20px",
        textAlign: "center",
        background: "linear-gradient(135deg, #1a1a17 0%, #2a2a24 100%)",
        marginTop: "60px",
      }}>
        <h2 style={{
          fontSize: "36px",
          fontWeight: "700",
          marginBottom: "16px",
          fontStyle: "italic",
          fontFamily: "'Instrument Serif', serif",
        }}>
          Your site could be next.
        </h2>
        <p style={{
          fontSize: "16px",
          color: "rgba(255,255,255,0.7)",
          marginBottom: "32px",
        }}>
          Built in days. Designed for conversions. Yours to keep.
        </p>
        <Link href="/" style={{ textDecoration: "none" }}>
          <button style={{
            padding: "12px 32px",
            background: "#c8a96e",
            color: "#0b0b09",
            border: "none",
            borderRadius: "8px",
            fontWeight: "700",
            fontSize: "16px",
            cursor: "pointer",
          }}>
            Start Building →
          </button>
        </Link>
      </section>

      <footer style={{
        padding: "40px 20px",
        borderTop: "1px solid rgba(200,169,110,0.1)",
        textAlign: "center",
        color: "rgba(255,255,255,0.5)",
        fontSize: "14px",
      }}>
        <p>© 2026 Sitecraft. Built for small businesses.</p>
      </footer>
    </div>
  );
}
