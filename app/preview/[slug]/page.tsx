import { getPreview, isRedisConfigured } from "../../../lib/preview-store";
import { getPreviewSession } from "../../../lib/db";
import { notFound } from "next/navigation";

export const dynamic   = "force-dynamic";
export const revalidate = 0;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const preview = await getPreview(slug);
  if (!preview) return { title: "Preview Not Found — RandyBuilds" };
  return {
    title: `${preview.businessName} — AI Redesign Preview | RandyBuilds`,
    description: `See what ${preview.businessName}'s website could look like — then start editing it for free with AI.`,
    openGraph: {
      title: `${preview.businessName} — Redesigned by AI | RandyBuilds`,
      description: `AI-powered redesign preview. Start editing for free in 60 seconds.`,
      type: "website",
    },
  };
}

export default async function PreviewPage({ params }: Props) {
  const { slug } = await params;

  // Try Redis first (fast), then Neon (durable fallback)
  let neonPreview = null;
  try {
    neonPreview = await getPreviewSession(slug);
  } catch (_e) {}

  const shareable = process.env.SHAREABLE_LINKS_ENABLED === "true" || isRedisConfigured() || !!neonPreview;

  if (!shareable) {
    return (
      <html lang="en">
        <head>
          <title>Shareable Links Coming Soon — RandyBuilds</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@700;900&display=swap" rel="stylesheet" />
        </head>
        <body style={{
          background: "#080808", color: "#f0f0f0",
          fontFamily: "'Inter', sans-serif",
          display: "flex", alignItems: "center", justifyContent: "center",
          minHeight: "100vh", textAlign: "center", padding: "24px", margin: 0,
        }}>
          <div>
            <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🔗</div>
            <h1 style={{ fontSize: "2rem", fontWeight: 900, marginBottom: "12px" }}>
              Shareable links coming soon
            </h1>
            <p style={{ color: "#555", maxWidth: "400px", margin: "0 auto 32px" }}>
              Persistent preview links are being set up. Generate a fresh preview below.
            </p>
            <a href="/" style={{
              padding: "14px 32px",
              background: "linear-gradient(135deg,#c8a96e,#a07840)",
              color: "#0a0a08", borderRadius: "10px", fontWeight: 800,
              fontSize: ".95rem", textDecoration: "none", display: "inline-block",
            }}>Generate Preview →</a>
          </div>
        </body>
      </html>
    );
  }

  const preview = await getPreview(slug);
  if (!preview) notFound();

  // Encode the preview data to pass to the builder
  const encodedHtml = encodeURIComponent(preview.html);
  const encodedName = encodeURIComponent(preview.businessName);
  const encodedUrl = encodeURIComponent(preview.url);

  // Banner injected into the preview iframe — updated to push into the AI builder
  const bannerScript = `
    <script>
      window.addEventListener('DOMContentLoaded', function() {
        var banner = document.createElement('div');
        banner.id = 'rb-banner';
        banner.innerHTML = \`
          <div style="position:fixed;top:0;left:0;right:0;z-index:99999;background:rgba(10,10,8,0.96);backdrop-filter:blur(16px);border-bottom:1px solid rgba(200,169,110,0.3);display:flex;align-items:center;justify-content:space-between;padding:10px 20px;gap:16px;font-family:system-ui,sans-serif;flex-wrap:wrap;">
            <div>
              <span style="color:#c8a96e;font-weight:800;font-size:13px;letter-spacing:0.04em">✦ AI PREVIEW</span>
              <span style="color:rgba(232,224,208,0.6);font-size:12px;margin-left:10px">This is a live AI redesign of ${preview.businessName}</span>
            </div>
            <div style="display:flex;gap:8px;flex-shrink:0;flex-wrap:wrap">
              <a href="/" style="padding:7px 14px;background:transparent;border:1px solid rgba(232,224,208,0.2);color:rgba(232,224,208,0.7);border-radius:8px;font-weight:600;font-size:12px;text-decoration:none;display:inline-block">
                New Preview
              </a>
              <a href="/build-from-preview?slug=${slug}" style="padding:8px 20px;background:linear-gradient(135deg,#c8a96e,#a07840);color:#0a0a08;border-radius:8px;font-weight:800;font-size:13px;text-decoration:none;display:inline-block">
                ✦ Start Editing This Site →
              </a>
            </div>
          </div>
        \`;
        document.body.appendChild(banner);
        document.body.style.paddingTop = '50px';
      });
    </script>
  `;

  const htmlWithBanner = preview.html.replace("<head>", "<head>" + bannerScript);

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{preview.businessName} — AI Redesign Preview | RandyBuilds</title>
      </head>
      <body
        style={{ margin: 0, padding: 0 }}
        dangerouslySetInnerHTML={{ __html: htmlWithBanner.replace(/^[\s\S]*?<body[^>]*>/, "").replace(/<\/body>[\s\S]*$/, "") }}
      />
    </html>
  );
}
