import type { Metadata } from "next";
import { Instrument_Sans, Atkinson_Hyperlegible, Outfit, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Providers } from '@/components/providers'
import GoogleAnalytics from '@/components/GoogleAnalytics'
// Validate environment variables on app startup
import '@/lib/validate-env'

// Logo font - Playfair Display
const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: 'swap',
  preload: true,
});

// Logo font - Instrument Sans with multiple weights (kept for other uses)
const instrumentSans = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: 'swap',
  preload: true,
});

// Heading font - Outfit
const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: 'swap',
  preload: true,
});

// Body font - Atkinson Hyperlegible
const atkinsonHyperlegible = Atkinson_Hyperlegible({
  variable: "--font-atkinson",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: 'swap',
  preload: true,
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://beautyfinder.io'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl), // Required for absolute image URLs on mobile iOS
  title: "BeautyFinder - Trending Beauty Products",
  description: "Discover the hottest trending beauty products on TikTok, Instagram, Reddit, and Amazon. Real data, honest reviews, no hype.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body
        className={`${playfairDisplay.variable} ${instrumentSans.variable} ${outfit.variable} ${atkinsonHyperlegible.variable} antialiased`}
      >
        <GoogleAnalytics />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
