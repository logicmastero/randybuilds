/**
 * seo-injector.ts
 * Injects SEO meta tags into generated sites.
 */

export interface SEOOptions {
  title?: string;
  description?: string;
  ogImage?: string;
  ogTitle?: string;
  ogDescription?: string;
  businessType?: string;
  businessName?: string;
  address?: string;
  phone?: string;
  email?: string;
  canonical?: string;
}

export function injectSEOMeta(html: string, options: SEOOptions): string {
  if (!html || !html.includes("</head>")) return html;

  const {
    title = "Local Business",
    description = "Welcome to our website.",
    ogImage,
    ogTitle,
    ogDescription,
    businessName,
    canonical,
  } = options;

  const seoTags = `
  <!-- Sitecraft SEO -->
  <meta name="description" content="${escapeAttr(description)}">
  <meta property="og:title" content="${escapeAttr(ogTitle || title)}">
  <meta property="og:description" content="${escapeAttr(ogDescription || description)}">
  <meta property="og:type" content="website">
  ${ogImage ? `<meta property="og:image" content="${escapeAttr(ogImage)}">` : ""}
  ${canonical ? `<link rel="canonical" href="${escapeAttr(canonical)}">` : ""}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeAttr(ogTitle || title)}">
  <meta name="twitter:description" content="${escapeAttr(ogDescription || description)}">`;

  return html.replace("</head>", seoTags + "\n</head>");
}

function escapeAttr(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
