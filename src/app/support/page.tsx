import type { Metadata } from 'next';
import Link from 'next/link';
import { HomeNav } from '@/components/home-nav';

export const metadata: Metadata = {
  title: 'Support',
  description: 'Get help with OpsMem. Contact our support team at support@opsmem.com — no account required. We respond within 2 business days.',
  keywords: ['OpsMem support', 'Slack app help', 'OpsMem contact', 'decision log support'],
  alternates: {
    canonical: 'https://opsmem.com/support',
  },
  openGraph: {
    title: 'Support | OpsMem',
    description: 'Reach the OpsMem support team. Email support@opsmem.com — no account needed. 2-business-day response SLA.',
    url: 'https://opsmem.com/support',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export default function SupportPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)', color: 'var(--foreground)', fontFamily: '"Courier New", Courier, monospace' }}>
      
      {/* Nav */}
      <HomeNav />

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-20 text-left">
        <h1 className="text-4xl md:text-5xl font-black tracking-widest uppercase mb-12 border-b-4 th-border-strong pb-4">
          SUPPORT
        </h1>
        
        <div className="space-y-10 leading-relaxed text-sm md:text-base th-text-ghost tracking-wide">
          <section>
            <h2 className="text-xl font-black text-foreground uppercase mb-4 tracking-widest">How to Contact Us</h2>
            <p className="mb-4">
              We are committed to providing accessible and responsive support for your entire team. If you encounter any bugs, have billing questions, or just need guidance setting up your OpsMem decision logs, you can contact us directly via email. You do NOT need an account to request support.
            </p>
            <p className="font-black text-foreground text-lg border border-foreground/20 p-4 inline-block">
              support@opsmem.com
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-foreground uppercase mb-4 tracking-widest">Response Times</h2>
            <p>
              We monitor this inbox actively. You can expect a response to your inquiry within <strong>two (2) business days</strong>. However, for critical downtime issues, we usually respond within hours.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t th-divider px-8 py-5 text-center th-text-ghost text-xs tracking-widest uppercase flex flex-col md:flex-row gap-4 justify-center items-center">
        <span>OPSMEM © {new Date().getFullYear()}</span>
        <span className="hidden md:inline">—</span>
        <Link href="/privacy" className="hover:text-foreground hover:underline transition-all">PRIVACY</Link>
        <span className="hidden md:inline">—</span>
        <Link href="/terms" className="hover:text-foreground hover:underline transition-all">TERMS</Link>
        <span className="hidden md:inline">—</span>
        <Link href="/support" className="hover:text-foreground hover:underline transition-all">SUPPORT</Link>
      </footer>
    </div>
  );
}
