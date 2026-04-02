"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import { createCheckoutSession } from '@/app/actions/stripe';
import { useTransition, Suspense } from 'react';

export default function PricingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black text-white flex items-center justify-center font-mono tracking-widest">
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
    <div className="min-h-screen bg-black text-white flex flex-col" style={{ fontFamily: '"Courier New", Courier, monospace' }}>

      {/* Nav */}
      <nav className="border-b border-white/20 px-8 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/opsmem-logo.png" alt="OpsMem" width={28} height={28} style={{ imageRendering: 'pixelated', filter: 'invert(1)' }} />
          <span className="font-black text-sm tracking-widest uppercase">[ OPSMEM ]</span>
        </Link>
        <div className="flex gap-6 text-xs tracking-widest text-white/60">
          {workspaceId && (
            <button onClick={() => router.push(`/dashboard?workspace=${workspaceId}`)} className="hover:text-white transition-colors uppercase">
              Dashboard
            </button>
          )}
          <Link href="/" className="hover:text-white transition-colors uppercase">Home</Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 px-6 py-16 max-w-4xl mx-auto w-full">

        <div className="text-center mb-14">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight uppercase mb-4">
            CHOOSE YOUR PLAN
          </h1>
          {workspaceId ? (
            <p className="text-white/50 text-sm tracking-wide">
              Upgrading workspace: <span className="text-white font-bold border border-white/30 px-2 py-0.5">{workspaceId}</span>
            </p>
          ) : (
            <p className="text-red-400/80 text-xs border border-red-400/30 bg-red-400/5 px-4 py-2 inline-block mt-2 tracking-wide">
              ⚠ ADD ?workspace=YOUR_TEAM_ID TO THE URL TO UPGRADE
            </p>
          )}
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-2 gap-0 border-2 border-white/40">

          {/* Free Plan */}
          <div className="p-8 border-r border-white/20 flex flex-col">
            <div className="mb-8">
              <div className="text-xs tracking-widest text-white/40 uppercase mb-3">STARTER</div>
              <div className="text-6xl font-black mb-1">$0</div>
              <div className="text-white/40 text-xs tracking-widest">/ MONTH — FOREVER FREE</div>
            </div>

            <ul className="space-y-3 flex-1 mb-8">
              {[
                '25 decisions / month',
                'OpenAI semantic retrieval',
                '/decide + /find Slack commands',
                'Web dashboard access',
              ].map(f => (
                <li key={f} className="flex items-start gap-3 text-sm text-white/70">
                  <span className="text-white/30 mt-0.5 shrink-0">▸</span>
                  {f}
                </li>
              ))}
            </ul>

            <button
              disabled
              className="w-full py-3 border-2 border-white/20 text-white/30 text-xs font-black tracking-widest uppercase cursor-not-allowed"
            >
              [ CURRENT PLAN ]
            </button>
          </div>

          {/* Pro Plan */}
          <div className="p-8 bg-white text-black flex flex-col relative">
            <div className="absolute top-0 right-0 bg-black text-white text-xs font-black tracking-widest px-3 py-1 uppercase">
              RECOMMENDED
            </div>

            <div className="mb-8">
              <div className="text-xs tracking-widest text-black/50 uppercase mb-3">PRO UNLIMITED</div>
              <div className="text-6xl font-black mb-1">$19</div>
              <div className="text-black/50 text-xs tracking-widest">/ MONTH — CANCEL ANYTIME</div>
            </div>

            <ul className="space-y-3 flex-1 mb-8">
              {[
                'Unlimited decisions / month',
                'Priority OpenAI embeddings',
                'Full Slack integration',
                'Premium support SLA',
              ].map(f => (
                <li key={f} className="flex items-start gap-3 text-sm text-black/80">
                  <span className="text-black/40 mt-0.5 shrink-0">▸</span>
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={handleUpgrade}
              disabled={isPending}
              className="w-full py-3 bg-black text-white text-xs font-black tracking-widest uppercase border-2 border-black hover:bg-white hover:text-black transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isPending ? '[ CONNECTING... ]' : '[ UPGRADE NOW ]'}
            </button>
          </div>
        </div>

        {/* Bottom note */}
        <p className="text-center text-white/25 text-xs mt-8 tracking-wide">
          All payments processed securely via Stripe. Subscription renews monthly.
        </p>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/20 px-8 py-5 text-center text-white/30 text-xs tracking-widest uppercase">
        OPSMEM © {new Date().getFullYear()} — BUILT ON NEXT.JS · SUPABASE · OPENAI
      </footer>
    </div>
  );
}
