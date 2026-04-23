import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RandyBuilds — Premium Websites That Convert",
  description: "Paste your URL. See your new website in 60 seconds. Premium web design for businesses that are serious about growth.",
  keywords: "web design, premium websites, website builder, small business websites",
  openGraph: {
    title: "RandyBuilds — Premium Websites That Convert",
    description: "Paste your URL. See your new website in 60 seconds.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
