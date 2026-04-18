import type { Metadata } from 'next';
import Link from 'next/link';
import { HomeNav } from '@/components/home-nav';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Read the OpsMem Terms of Service. Understand your rights, subscription terms, acceptable use policy, and liability limits when using OpsMem.',
  keywords: ['OpsMem terms of service', 'Slack app terms', 'subscription policy', 'acceptable use'],
  alternates: {
    canonical: 'https://opsmem.com/terms',
  },
  openGraph: {
    title: 'Terms of Service | OpsMem',
    description: 'OpsMem Terms of Service — covering subscriptions, acceptable use, integrations, and liability.',
    url: 'https://opsmem.com/terms',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)', color: 'var(--foreground)', fontFamily: '"Courier New", Courier, monospace' }}>
      
      {/* Nav */}
      <HomeNav />

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-20 text-left">
        <h1 className="text-4xl md:text-5xl font-black tracking-widest uppercase mb-12 border-b-4 th-border-strong pb-4">
          TERMS OF SERVICE
        </h1>
        
        <div className="space-y-10 leading-relaxed text-sm md:text-base th-text-ghost tracking-wide">
          <section>
            <h2 className="text-xl font-black text-foreground uppercase mb-4 tracking-widest">1. Acceptance of Terms</h2>
            <p>
              By accessing, integrating, or using OpsMem (the &quot;Service&quot;), you agree to comply with and be bound by these Terms of Service. If you do not agree to these terms, you must not use or install the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-foreground uppercase mb-4 tracking-widest">2. Service Description</h2>
            <p>
              OpsMem provides a persistent, semantic decision-logging platform integrated primarily via Slack and executed through a web dashboard. The Service allows teams to securely store, retrieve, and analyze asynchronous human decision-making workflows.
            </p>
          </section>
          
          <section>
            <h2 className="text-xl font-black text-foreground uppercase mb-4 tracking-widest">3. Subscriptions & Billing</h2>
            <p className="mb-3">Our payment plans are processed exclusively, securely, and asynchronously by Stripe.</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Free Tier:</strong> Allowed up to specified usage limits (e.g. 10 decisions/month). OpsMem reserves the right to terminate abusive free tier accounts with excessive bot traffic.</li>
              <li><strong>Pro Tier:</strong> Unlimited usage billed monthly. Subscriptions may be paused or canceled at any time using the dashboard management portal. No retroactive refunds are provided for partial months.</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-xl font-black text-foreground uppercase mb-4 tracking-widest">4. User Content & Acceptable Use</h2>
            <p>
              You retain total ownership over all content, decisions, and logic you upload or log into the Service. You agree not to use the Service strictly for unlawful purposes, to process deeply sensitive unencrypted PII (Personally Identifiable Information) maliciously, or to intentionally degrade, reverse engineer, or harm the OpsMem infrastructure API.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-foreground uppercase mb-4 tracking-widest">5. Integration Boundary</h2>
            <p>
              OpsMem integrates with the Slack platform. OpsMem is not endorsed strictly by Slack Technologies or Salesforce, and your engagement with Slack operates under your team&apos;s Slack Terms of Service. If an upstream Slack API failure prevents OpsMem from functioning, OpsMem cannot be held strictly liable for resulting disruptions. 
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-foreground uppercase mb-4 tracking-widest">6. Limitation of Liability</h2>
            <p>
              THE SERVICE IS PROVIDED &quot;AS IS&quot;. To the maximum extent permitted by applicable law, OpsMem and its suppliers shall not be liable for any indirect, incidental, special, consequential or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from your access to or use of the Service.
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
