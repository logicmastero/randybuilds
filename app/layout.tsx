import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RandyBuilds — Premium Websites That Convert",
  description: "Paste your URL. See your new website in 60 seconds. Premium web design for Alberta small businesses that are serious about growth.",
  keywords: "web design Alberta, premium websites, website builder, small business websites Alberta, local web design",
  openGraph: {
    title: "RandyBuilds — Premium Websites That Convert",
    description: "Paste your URL. See your new website in 60 seconds.",
    type: "website",
    locale: "en_CA",
  },
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
