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
  title: 'OpsMem — Team Decision Log',
  description: 'Never lose critical context again. OpsMem is your persistent team decision memory, powered by OpenAI semantic search.',
  icons: {
    icon: '/opsmem.png',
    apple: '/opsmem.png',
  },
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
