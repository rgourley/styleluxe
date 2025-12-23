import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap", // Optimize font loading
  preload: true,
});

export const metadata: Metadata = {
  title: "Trending Beauty Products - What's Going Viral on TikTok, Instagram, Reddit & Amazon",
  description: "Discover the hottest trending beauty products right now. We track what's going viral on TikTok, Instagram, Reddit, and Amazon. Real data, honest reviews, no hype. Find trending skincare, makeup, and beauty products before they sell out.",
  keywords: [
    "trending beauty products",
    "viral beauty products",
    "trending skincare",
    "trending makeup",
    "beauty products going viral",
    "trending on TikTok",
    "trending on Instagram",
    "trending on Reddit",
    "Amazon trending beauty",
    "what beauty products are trending",
    "hot beauty products",
    "trending beauty items",
  ].join(", "),
  openGraph: {
    title: "Trending Beauty Products - What's Going Viral",
    description: "Discover the hottest trending beauty products on TikTok, Instagram, Reddit, and Amazon. Real data, honest reviews.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Trending Beauty Products",
    description: "Discover what's going viral on TikTok, Instagram, Reddit, and Amazon",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
