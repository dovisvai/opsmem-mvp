import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
