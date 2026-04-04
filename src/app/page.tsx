import Link from 'next/link';
import Image from 'next/image';

export const metadata = {
  title: 'OpsMem — Team Decision Log',
  description: 'Never lose critical context again. OpsMem is your persistent team memory, powered by OpenAI semantic search and Slack.',
};

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col" style={{ fontFamily: '"Courier New", Courier, monospace' }}>

      {/* Nav */}
      <nav className="border-b border-white/20 px-8 py-4 flex items-center justify-between">
        <span className="text-white font-bold text-sm tracking-widest uppercase">[ OPSMEM ]</span>
        <div className="flex gap-6 text-xs tracking-widest text-white/60">
          <Link href="/dashboard" className="hover:text-white transition-colors uppercase">Dashboard</Link>
          <Link href="/pricing" className="hover:text-white transition-colors uppercase">Pricing</Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">

        {/* Pixel Logo */}
        <div className="mb-10 border-4 border-white p-4 inline-block" style={{ imageRendering: 'pixelated' }}>
          <Image
            src="/opsmem-logo.png"
            alt="OpsMem Logo"
            width={100}
            height={100}
            style={{ imageRendering: 'pixelated' }}
            priority
          />
        </div>

        {/* Tagline */}
        <h1 className="text-4xl md:text-6xl font-black tracking-tight uppercase mb-4 leading-none">
          YOUR TEAM&apos;S<br />
          <span className="border-b-4 border-white pb-1">DECISION MEMORY</span>
        </h1>

        <p className="text-white/60 text-sm md:text-base max-w-xl mx-auto mt-6 leading-relaxed tracking-wide">
          &gt; Log decisions via Slack with <span className="text-white font-bold">/decide</span>.<br />
          &gt; Find any past decision instantly with <span className="text-white font-bold">/find</span>.<br />
          &gt; Powered by OpenAI semantic search + Supabase.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mt-12">
          <Link href="/dashboard">
            <button className="px-8 py-4 bg-white text-black font-black uppercase tracking-widest text-sm border-4 border-white hover:bg-black hover:text-white transition-all duration-100 cursor-pointer">
              [ GO TO DASHBOARD ]
            </button>
          </Link>
          <Link href="/pricing">
            <button className="px-8 py-4 bg-black text-white font-black uppercase tracking-widest text-sm border-4 border-white hover:bg-white hover:text-black transition-all duration-100 cursor-pointer">
              [ VIEW PRICING ]
            </button>
          </Link>
          <a href="https://slack.com/oauth/v2/authorize" target="_blank" rel="noopener noreferrer">
            <button className="px-8 py-4 bg-black text-white/60 font-black uppercase tracking-widest text-sm border-4 border-white/30 hover:border-white hover:text-white transition-all duration-100 cursor-pointer">
              [ ADD TO SLACK ]
            </button>
          </a>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 mt-20 w-full max-w-3xl border border-white/30">
          {[
            { cmd: '/decide', desc: 'Log any team decision directly from Slack. Add #tags anywhere in your message — e.g. #backend #q4 — to organise decisions automatically.' },
            { cmd: '/find', desc: 'Retrieve any past decision using natural language. AI finds the closest match.' },
            { cmd: 'Dashboard', desc: 'Browse, search, and manage your entire decision history in a clean web UI.' },
          ].map((f, i) => (
            <div key={i} className="p-6 border-r border-white/10 last:border-r-0 text-left hover:bg-white/5 transition-colors">
              <div className="text-white font-black text-lg mb-2 font-mono">{f.cmd}</div>
              <div className="text-white/50 text-xs leading-relaxed tracking-wide">{f.desc}</div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/20 px-8 py-5 text-center text-white/30 text-xs tracking-widest uppercase">
        OPSMEM © {new Date().getFullYear()} — BUILT ON NEXT.JS · SUPABASE · OPENAI
      </footer>
    </div>
  );
}
