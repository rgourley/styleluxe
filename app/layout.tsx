import type { Metadata } from "next";
import { Instrument_Sans, Atkinson_Hyperlegible, Outfit, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Providers } from '@/components/providers'
import GoogleAnalytics from '@/components/GoogleAnalytics'
import ChunkErrorHandler from '@/components/ChunkErrorHandler'
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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.beautyfinder.io'

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
      <head>
        {/* Inline script to catch chunk errors before React loads */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Prevent infinite reload loops
                if (sessionStorage.getItem('chunk-error-reload')) {
                  sessionStorage.removeItem('chunk-error-reload');
                }
                
                // Listen for script errors immediately
                window.addEventListener('error', function(event) {
                  if (event.filename && event.filename.includes('_next/static/chunks/')) {
                    console.warn('Chunk loading error detected (inline), reloading page...');
                    if (!sessionStorage.getItem('chunk-error-reload')) {
                      sessionStorage.setItem('chunk-error-reload', 'true');
                      setTimeout(function() {
                        window.location.reload();
                      }, 100);
                    }
                  }
                }, true);
                
                // Also catch promise rejections
                window.addEventListener('unhandledrejection', function(event) {
                  var error = event.reason;
                  var errorMessage = error && error.message ? error.message : String(error || '');
                  if (errorMessage.includes('ChunkLoadError') || 
                      errorMessage.includes('Failed to load chunk') ||
                      errorMessage.includes('404')) {
                    console.warn('Chunk loading error detected (promise), reloading page...');
                    event.preventDefault();
                    if (!sessionStorage.getItem('chunk-error-reload')) {
                      sessionStorage.setItem('chunk-error-reload', 'true');
                      setTimeout(function() {
                        window.location.reload();
                      }, 100);
                    }
                  }
                });
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${playfairDisplay.variable} ${instrumentSans.variable} ${outfit.variable} ${atkinsonHyperlegible.variable} antialiased`}
      >
        <ChunkErrorHandler />
        <GoogleAnalytics />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
