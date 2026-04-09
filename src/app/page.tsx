import Link from 'next/link';
import Image from 'next/image';
import { ThemeToggle } from '@/components/theme-toggle';

export const metadata = {
  title: 'OpsMem — Team Decision Log',
  description: 'Never lose critical context again. OpsMem is your persistent team memory, powered by OpenAI semantic search and Slack.',
};

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)', color: 'var(--foreground)', fontFamily: '"Courier New", Courier, monospace' }}>

      {/* Nav */}
      <nav className="th-divider border-b px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Image
            src="/opsmem-logo.png"
            alt="OpsMem"
            width={32}
            height={32}
            className="th-logo"
            priority
          />
          <span className="font-black text-base tracking-widest uppercase hidden sm:inline">OPSMEM</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="th-nav-link text-xs tracking-widest transition-colors uppercase">Dashboard</Link>
          <Link href="/pricing" className="th-nav-link text-xs tracking-widest transition-colors uppercase">Pricing</Link>
          <ThemeToggle />
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">

        {/* Pixel Logo */}
        <div className="mb-10 border-4 th-border-strong p-4 inline-block" style={{ imageRendering: 'pixelated' }}>
          <Image
            src="/opsmem-logo.png"
            alt="OpsMem Logo"
            width={100}
            height={100}
            className="th-logo"
            priority
          />
        </div>

        {/* Tagline */}
        <h1 className="text-4xl md:text-6xl font-black tracking-tight uppercase mb-4 leading-none">
          YOUR TEAM&apos;S<br />
          <span className="border-b-4 th-border-strong pb-1">DECISION MEMORY</span>
        </h1>

        <p className="th-text-muted text-sm md:text-base max-w-xl mx-auto mt-6 leading-relaxed tracking-wide">
          &gt; Log decisions via Slack with <span className="font-bold" style={{ color: 'var(--foreground)' }}>/decide</span>.<br />
          &gt; Find any past decision instantly with <span className="font-bold" style={{ color: 'var(--foreground)' }}>/find</span>.<br />
          &gt; Powered by OpenAI semantic search + Supabase.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mt-12">
          <Link href="/dashboard">
            <button className="th-btn-primary px-8 py-4 font-black uppercase tracking-widest text-sm border-4 transition-all duration-100 cursor-pointer">
              [ GO TO DASHBOARD ]
            </button>
          </Link>
          <Link href="/pricing">
            <button className="th-btn-secondary px-8 py-4 font-black uppercase tracking-widest text-sm border-4 transition-all duration-100 cursor-pointer">
              [ VIEW PRICING ]
            </button>
          </Link>
          <a href="https://slack.com/oauth/v2/authorize" target="_blank" rel="noopener noreferrer">
            <button className="th-btn-secondary px-8 py-4 font-black uppercase tracking-widest text-sm border-2 transition-all duration-100 cursor-pointer opacity-70 hover:opacity-100">
              [ ADD TO SLACK ]
            </button>
          </a>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 mt-20 w-full max-w-3xl border th-border-soft">
          {[
            { cmd: '/decide', desc: 'Log any team decision directly from Slack. Add #tags anywhere in your message — e.g. #backend #q4 — to organise decisions automatically.' },
            { cmd: '/find', desc: 'Retrieve any past decision using natural language. AI finds the closest match.' },
            { cmd: 'Dashboard', desc: 'Browse, search, and manage your entire decision history in a clean web UI.' },
          ].map((f, i) => (
            <div key={i} className="th-card-hover p-6 border-r th-border-faint last:border-r-0 text-left transition-colors">
              <div className="font-black text-lg mb-2 font-mono">{f.cmd}</div>
              <div className="th-text-dim text-xs leading-relaxed tracking-wide">{f.desc}</div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t th-divider px-8 py-5 text-center th-text-ghost text-xs tracking-widest uppercase">
        OPSMEM © {new Date().getFullYear()} — BUILT ON NEXT.JS · SUPABASE · OPENAI
      </footer>
    </div>
  );
}
