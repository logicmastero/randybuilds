import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sitecraft — Premium AI Websites in 60 Seconds",
  description: "Paste your URL. See your new premium website in 60 seconds. AI-powered web design for serious businesses — no agency, no templates, no guesswork.",
  keywords: "AI web design, premium website builder, website for small business, web design Alberta, instant website",
  openGraph: {
    title: "Sitecraft — Premium AI Websites in 60 Seconds",
    description: "Paste your URL. See your new premium website in 60 seconds.",
    type: "website",
    locale: "en_CA",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-CA">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="theme-color" content="#0b0b09" />
      </head>
      <body style={{ margin: 0, padding: 0, background: "#0b0b09" }}>{children}</body>
    </html>
  );
}
