import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://opsmem.com'),
  title: {
    default: 'OpsMem — Team Decision Memory for Slack',
    template: '%s | OpsMem',
  },
  description: 'OpsMem gives your team a persistent decision memory inside Slack. Log decisions with /decide, find any past context instantly with /find, and analyze trends in the dashboard.',
  keywords: ['team decision log', 'Slack app', 'decision memory', 'team knowledge base', 'AI search Slack', 'OpsMem', 'workplace decisions', 'team collaboration tool'],
  authors: [{ name: 'OpsMem', url: 'https://opsmem.com' }],
  creator: 'OpsMem',
  publisher: 'OpsMem',
  category: 'Productivity',
  applicationName: 'OpsMem',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://opsmem.com',
    siteName: 'OpsMem',
    title: 'OpsMem — Team Decision Memory for Slack',
    description: 'Never lose critical context again. Log decisions via Slack, retrieve any past decision instantly with AI semantic search, and track team trends in the dashboard.',
    images: [
      {
        url: '/opsmem-logo.png',
        width: 400,
        height: 400,
        alt: 'OpsMem — Team Decision Memory',
      },
    ],
  },
  twitter: {
    card: 'summary',
    site: '@opsmem',
    creator: '@opsmem',
    title: 'OpsMem — Team Decision Memory for Slack',
    description: 'Never lose critical context again. Log, find, and analyze every team decision — inside Slack.',
    images: ['/opsmem-logo.png'],
  },
  icons: {
    icon: '/opsmem.png',
    apple: '/opsmem.png',
    shortcut: '/opsmem.png',
  },
  manifest: '/manifest.json',
};

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <head>
        {/* Anti-flash theme script — runs before React hydration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var t = localStorage.getItem('opsmem-theme');
                var isDark = t ? t === 'dark' : true;
                document.documentElement.classList.toggle('dark', isDark);
                document.documentElement.classList.toggle('light', !isDark);
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        {children}

        {/* ── Google Analytics ── */}
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}', { page_path: window.location.pathname });
              `}
            </Script>
          </>
        )}

        {/* ── Meta Pixel ── */}
        {META_PIXEL_ID && (
          <Script id="meta-pixel" strategy="afterInteractive">
            {`
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${META_PIXEL_ID}');
              fbq('track', 'PageView');
            `}
          </Script>
        )}
      </body>
    </html>
  );
}
