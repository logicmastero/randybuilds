import type { Metadata, Viewport } from "next";
import "./globals.css";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://randybuilds.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Sitecraft — Premium AI Websites in 60 Seconds",
    template: "%s | Sitecraft",
  },
  description: "Paste your URL. See your new premium website in 60 seconds. AI-powered web design for serious businesses — no agency, no templates, no guesswork.",
  keywords: [
    "AI web design", "website builder", "premium website", "small business website",
    "AI website builder", "instant website", "vibe coding", "Sitecraft", "build a website fast",
  ],
  authors: [{ name: "Sitecraft" }],
  creator: "Sitecraft",
  publisher: "Sitecraft",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  openGraph: {
    type: "website",
    locale: "en_CA",
    url: APP_URL,
    siteName: "Sitecraft",
    title: "Sitecraft — Premium AI Websites in 60 Seconds",
    description: "Paste your URL or describe your business. Get a stunning, custom-designed website powered by AI — in 60 seconds.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Sitecraft — AI website builder",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sitecraft — Premium AI Websites in 60 Seconds",
    description: "Paste your URL. See your new premium website in 60 seconds. AI-powered.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0b0b09",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-CA">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body style={{ margin: 0, padding: 0, background: "#0b0b09" }}>{children}</body>
    </html>
  );
}
