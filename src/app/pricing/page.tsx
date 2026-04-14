"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import { createCheckoutSession } from '@/app/actions/stripe';
import { useTransition, Suspense } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';
import { useScrolled } from '@/lib/hooks/use-scrolled';

export default function PricingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center font-mono tracking-widest" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
        LOADING...
      </div>
    }>
      <PricingContent />
    </Suspense>
  );
}

function PricingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const workspaceId = searchParams.get('workspace') || '';
  const [isPending, startTransition] = useTransition();
  const scrolled = useScrolled();

  const handleUpgrade = () => {
    if (!workspaceId) {
      alert('Please add your Slack workspace ID to the URL to upgrade.\n\nExample: /pricing?workspace=YOUR_TEAM_ID');
      return;
    }
    startTransition(async () => {
      const result = await createCheckoutSession(workspaceId);
      if (result?.url) {
        window.location.href = result.url;
      } else {
        alert('Failed to start checkout: ' + result?.error);
      }
    });
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)', color: 'var(--foreground)', fontFamily: '"Courier New", Courier, monospace' }}>

      {/* Nav */}
      <nav className={`nav-header px-8 py-4 flex items-center justify-between ${scrolled ? 'nav-scrolled' : ''}`}>
        <Link href="/" className="flex items-center gap-4 hover:opacity-80 transition-opacity">
          <Image src="/opsmem-logo.png" alt="OpsMem" width={32} height={32} className="th-logo" priority />
          <span className="font-black text-base tracking-widest uppercase hidden sm:inline">OPSMEM</span>
        </Link>
        <div className="flex items-center gap-4 text-xs tracking-widest">
          {workspaceId && (
            <button onClick={() => router.push(`/dashboard?workspace=${workspaceId}`)} className="th-nav-link transition-colors uppercase">
              Dashboard
            </button>
          )}
          <div className="hidden sm:flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <a href="https://slack.com/oauth/v2/authorize?client_id=10826535322675.10861212633408&scope=commands,chat:write&user_scope="><img alt="Add to Slack" height="40" width="139" src="https://platform.slack-edge.com/img/add_to_slack.png" srcSet="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x" /></a>
          </div>
          <Link href="/" className="th-nav-link transition-colors uppercase">Home</Link>
          <ThemeToggle />
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 px-6 py-16 max-w-4xl mx-auto w-full">

        <div className="text-center mb-14">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight uppercase mb-4">
            CHOOSE YOUR PLAN
          </h1>
          {workspaceId ? (
            <p className="th-text-muted text-sm tracking-wide">
              Upgrading workspace: <span className="font-bold border th-border-medium px-2 py-0.5" style={{ color: 'var(--foreground)' }}>{workspaceId}</span>
            </p>
          ) : (
            <p className="text-red-400/80 text-xs border border-red-400/30 bg-red-400/5 px-4 py-2 inline-block mt-2 tracking-wide">
              ⚠ ADD ?workspace=YOUR_TEAM_ID TO THE URL TO UPGRADE
            </p>
          )}
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-2 max-w-3xl mx-auto gap-0 border-2 th-border-strong">

          {/* Free Plan */}
          <div className="p-8 border-r th-border-medium flex flex-col">
            <div className="mb-8">
              <div className="text-xs tracking-widest th-text-dimmer uppercase mb-3">STARTER</div>
              <div className="text-6xl font-black mb-1">$0</div>
              <div className="th-text-dimmer text-xs tracking-widest">/ MONTH — FOREVER FREE</div>
            </div>

            <ul className="space-y-3 flex-1 mb-8">
              {[
                '25 decisions / month',
                'OpenAI semantic retrieval',
                '/decide + /find Slack commands',
                'Web dashboard access',
              ].map(f => (
                <li key={f} className="flex items-start gap-3 text-sm th-text-muted">
                  <span className="th-text-dimmer mt-0.5 shrink-0">▸</span>
                  {f}
                </li>
              ))}
            </ul>

            <button
              disabled
              className="w-full py-3 border-2 th-border-soft th-text-dimmer text-xs font-black tracking-widest uppercase cursor-not-allowed"
            >
              [ CURRENT PLAN ]
            </button>
          </div>

          {/* Pro Plan */}
          <div className="p-8 flex flex-col relative" style={{ background: 'var(--foreground)', color: 'var(--background)' }}>
            <div className="absolute top-0 right-0 text-xs font-black tracking-widest px-3 py-1 uppercase" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
              RECOMMENDED
            </div>

            <div className="mb-8">
              <div className="text-xs tracking-widest uppercase mb-3 opacity-50">PRO UNLIMITED</div>
              <div className="text-6xl font-black mb-1">$19<span className="text-3xl">.99</span></div>
              <div className="text-xs tracking-widest opacity-50">/ MONTH — CANCEL ANYTIME</div>
            </div>

            <ul className="space-y-3 flex-1 mb-8">
              {[
                'Unlimited decisions / month',
                'Team invites allowed',
                'Advanced analytics & exports (CSV/PDF)',
                'Priority OpenAI semantic models',
                'Priority Slack Support SLA',
              ].map(f => (
                <li key={f} className="flex items-start gap-3 text-sm" style={{ opacity: 0.85 }}>
                  <span className="mt-0.5 shrink-0 opacity-50">▸</span>
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleUpgrade()}
              disabled={isPending}
              className="w-full py-3 text-xs font-black tracking-widest uppercase border-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: 'var(--background)',
                color: 'var(--foreground)',
                borderColor: 'var(--background)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--background)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--background)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--foreground)';
              }}
            >
              {isPending ? '[ CONNECTING... ]' : '[ UPGRADE NOW ]'}
            </button>
          </div>



        </div>

        {/* Bottom note */}
        <p className="text-center th-text-ghost text-xs mt-8 tracking-wide">
          All payments processed securely via Stripe. Subscription renews monthly.
        </p>
      </main>

      {/* Footer */}
      <footer className="border-t th-divider px-8 py-5 text-center th-text-ghost text-xs tracking-widest uppercase">
        OPSMEM © {new Date().getFullYear()} — BUILT ON NEXT.JS · SUPABASE · OPENAI
      </footer>
    </div>
  );
}
