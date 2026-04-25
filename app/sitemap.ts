import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://randybuilds.vercel.app";
  return [
    { url: base,               lastModified: new Date(), changeFrequency: "weekly",  priority: 1.0 },
    { url: `${base}/pricing`,  lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/gallery`,  lastModified: new Date(), changeFrequency: "daily",   priority: 0.85 },
    { url: `${base}/build`,    lastModified: new Date(), changeFrequency: "weekly",  priority: 0.8 },
    { url: `${base}/login`,    lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  ];
}
