import { getPreview, isRedisConfigured } from "../../../lib/preview-store";
import { getPreviewSession, getSiteBySlug, getDb } from "../../../lib/db";
import { notFound } from "next/navigation";

export const dynamic   = "force-dynamic";
export const revalidate = 0;

interface Props {
  params: Promise<{ slug: string }>;
}

async function resolvePreview(slug: string) {
  // 1. Redis
  const redis = await getPreview(slug).catch(() => null);
  if (redis) return { html: redis.html, businessName: redis.businessName, url: redis.url, source: "redis" };

  // 2. Neon preview_sessions
  const neon = await getPreviewSession(slug).catch(() => null);
  if (neon) return { html: neon.html, businessName: neon.business_name, url: neon.input_url || "", source: "neon" };

  // 3. Neon saved_sites
  const saved = await getSiteBySlug(slug).catch(() => null);
  if (saved) return { html: saved.html, businessName: saved.business_name, url: saved.url || "", source: "saved" };

  return null;
}

async function incrementViewCount(slug: string) {
  try {
    const db = getDb();
    // Try preview_sessions first, then saved_sites
    const r = await db`
      UPDATE preview_sessions
      SET view_count = view_count + 1
      WHERE slug = ${slug}
      RETURNING slug
    `;
    if (!r.length) {
      await db`
        UPDATE saved_sites
        SET view_count = view_count + 1
        WHERE slug = ${slug}
      `;
    }
  } catch { /* non-critical, don't fail the page */ }
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const preview = await resolvePreview(slug);
  if (!preview) return { title: "Preview Not Found — Sitecraft" };
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://randybuilds.vercel.app";
  return {
    title: `${preview.businessName} — AI Website Preview | Sitecraft`,
    description: `See what ${preview.businessName}'s new AI-generated website looks like. Edit it free in 60 seconds.`,
    openGraph: {
      title: `${preview.businessName} — Redesigned by AI | Sitecraft`,
      description: `AI-powered website preview. Start editing for free.`,
      type: "website",
      url: `${APP_URL}/preview/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${preview.businessName} — AI Website`,
      description: "See this AI-generated website and build your own for free.",
    },
  };
}

export default async function PreviewPage({ params }: Props) {
  const { slug } = await params;

  const preview = await resolvePreview(slug);

  if (!preview) {
    // Graceful "not found" rather than 404 crash — offer to generate fresh
    return (
      <html lang="en">
        <head>
          <title>Preview Expired — Sitecraft</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;700&display=swap" rel="stylesheet" />
        </head>
        <body style={{ background: "#0b0b09", color: "#e8e2d8", fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", textAlign: "center", padding: 24, margin: 0 }}>
          <div>
            <div style={{ fontSize: "3rem", marginBottom: 16 }}>🔗</div>
            <h1 style={{ fontFamily: "Instrument Serif, serif", fontSize: "clamp(24px,4vw,36px)", marginBottom: 12 }}>Preview expired</h1>
            <p style={{ color: "rgba(232,226,216,0.5)", maxWidth: 360, margin: "0 auto 32px", lineHeight: 1.6, fontSize: 15 }}>
              AI previews are stored for 30 days. This one has expired. Generate a fresh site below.
            </p>
            <a href="/" style={{ padding: "14px 32px", background: "#c8a96e", color: "#0a0a08", borderRadius: 10, fontWeight: 800, fontSize: 14, textDecoration: "none", display: "inline-block" }}>
              ✦ Generate new preview →
            </a>
          </div>
        </body>
      </html>
    );
  }

  // Increment view count — non-blocking
  incrementViewCount(slug);

  const bannerScript = `
    <script>
      window.addEventListener('DOMContentLoaded', function() {
        var banner = document.createElement('div');
        banner.innerHTML = \`
          <div style="position:fixed;top:0;left:0;right:0;z-index:99999;background:rgba(10,10,8,0.96);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-bottom:1px solid rgba(200,169,110,0.3);display:flex;align-items:center;justify-content:space-between;padding:10px 20px;gap:12px;font-family:system-ui,sans-serif;flex-wrap:wrap;">
            <div>
              <span style="color:#c8a96e;font-weight:800;font-size:12px;letter-spacing:0.08em;text-transform:uppercase">✦ AI Preview</span>
              <span style="color:rgba(232,224,208,0.5);font-size:12px;margin-left:10px">${preview.businessName}</span>
            </div>
            <div style="display:flex;gap:8px;flex-shrink:0">
              <a href="/" style="padding:6px 13px;background:transparent;border:1px solid rgba(232,224,208,0.15);color:rgba(232,224,208,0.6);border-radius:7px;font-weight:600;font-size:12px;text-decoration:none;display:inline-flex;align-items:center">
                New Site
              </a>
              <a href="/build-from-preview?slug=${slug}" style="padding:7px 18px;background:#c8a96e;color:#0a0a08;border-radius:7px;font-weight:800;font-size:12px;text-decoration:none;display:inline-flex;align-items:center;gap:4px">
                ✦ Edit this site →
              </a>
            </div>
          </div>
        \`;
        document.body.prepend(banner);
        document.body.style.paddingTop = '48px';
      });
    </script>
  `;

  const htmlWithBanner = preview.html.includes("</head>")
    ? preview.html.replace("</head>", bannerScript + "</head>")
    : preview.html.replace("<body", bannerScript + "<body");

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{preview.businessName} — AI Website Preview | Sitecraft</title>
      </head>
      <body
        style={{ margin: 0, padding: 0 }}
        dangerouslySetInnerHTML={{
          __html: htmlWithBanner.replace(/^[\s\S]*?<body[^>]*>/, "").replace(/<\/body>[\s\S]*$/, ""),
        }}
      />
    </html>
  );
}
