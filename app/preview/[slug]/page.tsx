import { getPreview, isRedisConfigured } from "../../../lib/preview-store";
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
    title: `${preview.businessName} — Premium Redesign Preview | RandyBuilds`,
    description: `See what ${preview.businessName}'s website could look like with a professional redesign by RandyBuilds.`,
    openGraph: {
      title: `${preview.businessName} — Redesigned by RandyBuilds`,
      description: `AI-powered premium redesign preview. Built in 60 seconds.`,
      type: "website",
    },
  };
}

export default async function PreviewPage({ params }: Props) {
  const { slug } = await params;

  // Feature flag — shareable links gated until Upstash is provisioned
  const shareable = process.env.SHAREABLE_LINKS_ENABLED === "true" || isRedisConfigured();

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
              background: "linear-gradient(135deg,#00f5a0,#00d9f5)",
              color: "#000", borderRadius: "10px", fontWeight: 800,
              fontSize: ".95rem", textDecoration: "none", display: "inline-block",
            }}>Generate Preview →</a>
          </div>
        </body>
      </html>
    );
  }

  const preview = await getPreview(slug);
  if (!preview) notFound();

  // Inject a "Get this site built" banner into the preview HTML
  const bannerScript = `
    <script>
      window.addEventListener('DOMContentLoaded', function() {
        var banner = document.createElement('div');
        banner.id = 'rb-banner';
        banner.innerHTML = \`
          <div style="position:fixed;bottom:0;left:0;right:0;z-index:99999;background:rgba(8,8,8,0.95);backdrop-filter:blur(12px);border-top:1px solid #00f5a0;display:flex;align-items:center;justify-content:space-between;padding:12px 24px;gap:16px;font-family:system-ui,sans-serif">
            <div>
              <span style="color:#00f5a0;font-weight:700;font-size:14px">This is a RandyBuilds preview</span>
              <span style="color:#555;font-size:13px;margin-left:12px">AI-generated redesign — yours from $800 CAD</span>
            </div>
            <div style="display:flex;gap:10px;flex-shrink:0">
              <a href="https://randybuilds.vercel.app#pricing" target="_blank"
                style="padding:8px 20px;background:linear-gradient(135deg,#00f5a0,#00d9f5);color:#000;border-radius:8px;font-weight:700;font-size:13px;text-decoration:none">
                Get This Built →
              </a>
              <a href="https://randybuilds.vercel.app" target="_blank"
                style="padding:8px 16px;background:#1a1a1a;border:1px solid #333;color:#888;border-radius:8px;font-size:13px;text-decoration:none">
                New Preview
              </a>
            </div>
          </div>
        \`;
        document.body.appendChild(banner);
        document.body.style.paddingBottom = '64px';
      });
    </script>
  `;

  // Inject banner before </body>
  const htmlWithBanner = preview.html.replace("</body>", bannerScript + "</body>");

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{preview.businessName} — Redesign Preview | RandyBuilds</title>
      </head>
      <body
        style={{ margin: 0, padding: 0 }}
        dangerouslySetInnerHTML={{ __html: htmlWithBanner.replace(/^[\s\S]*?<body[^>]*>/, "").replace(/<\/body>[\s\S]*$/, "") }}
      />
    </html>
  );
}
