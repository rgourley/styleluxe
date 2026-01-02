'use client'

import Script from 'next/script'

export default function GoogleAnalytics() {
  // Use environment variable or default to provided tracking ID
  const gaId = process.env.NEXT_PUBLIC_GA_ID || 'G-B347YBM27N'

  if (!gaId) {
    return null
  }

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        // Add proper preload attributes to prevent warnings
        onLoad={() => {
          // Script loaded successfully
        }}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gaId}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
    </>
  )
}

