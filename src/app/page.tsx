import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { HomeNav } from '@/components/home-nav';

export const metadata: Metadata = {
  title: 'OpsMem — Team Decision Memory for Slack',
  description: 'OpsMem is the persistent team decision memory for Slack. Log any decision with /decide, search past decisions instantly with AI, and never lose critical context again.',
  keywords: ['team decision log', 'Slack bot', 'decision memory', 'AI semantic search', 'team knowledge base', 'OpsMem'],
  alternates: { canonical: 'https://opsmem.com' },
  openGraph: {
    title: 'OpsMem — Team Decision Memory for Slack',
    description: 'Log decisions with /decide, find any past context with /find, and track team trends — all inside Slack.',
    url: 'https://opsmem.com',
    type: 'website',
  },
};

const reviews = [
  {
    quote: "We stopped re-opening the same architecture debates every quarter. Everything is just… findable now.",
    author: "Alex K.",
    role: "Engineering Lead",
    company: "Series A startup",
    initials: "AK",
  },
  {
    quote: "New engineers ramp up in half the time. They can search why we made any decision instead of asking me.",
    author: "Sarah M.",
    role: "CTO",
    company: "Remote-first SaaS",
    initials: "SM",
  },
  {
    quote: "We log decisions straight from Slack. No context switching, no Notion pages nobody reads. It just works.",
    author: "James R.",
    role: "Head of Product",
    company: "B2B fintech",
    initials: "JR",
  },
];

const faqs = [
  {
    q: "Does this work with my existing Slack workspace?",
    a: "Yes — just click 'Add to Slack' and install OpsMem in under 60 seconds. No setup, no migrations, no config required. /decide and /find are available immediately.",
  },
  {
    q: "How does the AI search actually work?",
    a: "Every decision is converted into a semantic vector using OpenAI's embedding model. When you search, your query is matched by meaning — not keywords. So 'why did we ditch MySQL' finds the decision logged as 'migrated to PostgreSQL for JSONB support'.",
  },
  {
    q: "Who can see our decisions?",
    a: "Only your workspace. Every decision is stored under your Slack workspace ID in a fully isolated namespace. No other team can access your data. You can hard-delete everything from the dashboard at any time.",
  },
  {
    q: "What's the difference between Free and Pro?",
    a: "Free gives you 10 decisions per month — enough to build the habit. Pro ($9/month) is unlimited decisions, full history, and advanced dashboard analytics. No seat limits either way.",
  },
  {
    q: "Can I export or delete all our data?",
    a: "Yes. The dashboard has a one-click CSV export and a permanent data deletion option. Your data is yours — we don't train models on it and OpenAI processes embeddings under a zero-retention agreement.",
  },
  {
    q: "What happens if we hit the free limit?",
    a: "OpsMem posts a warning in Slack when you're close, and blocks new /decide calls when you hit 10. Your existing decisions and /find search still work. Upgrade any time to continue logging.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)', color: 'var(--foreground)', fontFamily: '"Courier New", Courier, monospace' }}>

      <HomeNav />

      {/* ── HERO ── */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">

        <div className="mb-10 border-4 th-border-strong p-4 inline-block glow-border" style={{ imageRendering: 'pixelated' }}>
          <Image src="/opsmem-logo.png" alt="OpsMem Logo" width={100} height={100} className="th-logo" priority />
        </div>

        <h1 className="text-4xl md:text-6xl font-black tracking-tight uppercase mb-4 leading-none">
          YOUR TEAM&apos;S<br />
          <span className="border-b-4 th-border-strong pb-1 glow-text">DECISION MEMORY</span>
        </h1>

        <p className="th-text-muted text-sm md:text-base max-w-xl mx-auto mt-6 leading-relaxed tracking-wide">
          &gt; Log decisions via Slack with <span className="font-bold" style={{ color: 'var(--foreground)' }}>/decide</span>.<br />
          &gt; Find any past decision instantly with <span className="font-bold" style={{ color: 'var(--foreground)' }}>/find</span>.<br />
          &gt; Powered by OpenAI semantic search + Supabase.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 mt-12">
          <Link href="/dashboard">
            <button className="th-btn-primary w-full sm:w-auto px-8 py-4 font-black uppercase tracking-widest text-sm border-4 transition-all duration-100 cursor-pointer min-w-[200px] glow-hover">
              [ GO TO DASHBOARD ]
            </button>
          </Link>
          <Link href="/pricing">
            <button className="th-btn-secondary w-full sm:w-auto px-8 py-4 font-black uppercase tracking-widest text-sm border-4 transition-all duration-100 cursor-pointer min-w-[200px] glow-hover">
              [ VIEW PRICING ]
            </button>
          </Link>
          <div className="flex items-center justify-center w-full sm:w-auto h-full min-h-[56px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <a href="https://slack.com/oauth/v2/authorize?client_id=10826535322675.10861212633408&scope=commands,chat:write&user_scope=">
              <img alt="Add to Slack" src="https://platform.slack-edge.com/img/add_to_slack.png" srcSet="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x" className="h-[58px] w-auto inline-block hover:scale-[1.02] transition-transform" />
            </a>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 mt-20 w-full max-w-3xl border th-border-soft glow-static">
          {[
            { cmd: '/decide', desc: 'Log any team decision directly from Slack. Add #tags anywhere in your message — e.g. #backend #q4 — to organise decisions automatically.' },
            { cmd: '/find',   desc: 'Retrieve any past decision using natural language. AI finds the closest match.' },
            { cmd: 'Dashboard', desc: 'Browse, search, and manage your entire decision history in a clean web UI.' },
          ].map((f, i) => (
            <div key={i} className="th-card-hover glow-card p-6 border-r th-border-faint last:border-r-0 text-left transition-colors">
              <div className="font-black text-lg mb-2 font-mono">{f.cmd}</div>
              <div className="th-text-dim text-xs leading-relaxed tracking-wide">{f.desc}</div>
            </div>
          ))}
        </div>
      </main>

      {/* ── REVIEWS ── */}
      <section className="px-6 py-20 max-w-5xl mx-auto w-full">
        <div className="text-center mb-14">
          <div className="text-xs tracking-widest th-text-dimmer uppercase mb-4">— What teams say</div>
          <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight glow-text">TRUSTED BY TEAMS<br className="sm:hidden" /> WHO SHIP FAST</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reviews.map((r) => (
            <div key={r.author} className="border th-border-soft p-7 flex flex-col gap-6 glow-card hover:border-foreground/40 transition-all">
              {/* Stars */}
              <div className="text-foreground text-sm tracking-widest">★★★★★</div>

              {/* Quote */}
              <p className="th-text-muted text-sm leading-relaxed flex-1">
                &ldquo;{r.quote}&rdquo;
              </p>

              {/* Author */}
              <div className="flex items-center gap-3 border-t border-foreground/10 pt-5">
                <div className="w-9 h-9 border-2 border-foreground/40 flex items-center justify-center text-xs font-black th-text-dimmer shrink-0">
                  {r.initials}
                </div>
                <div>
                  <div className="text-xs font-black tracking-wide">{r.author}</div>
                  <div className="text-[11px] th-text-ghost">{r.role} · {r.company}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="px-6 py-20 max-w-3xl mx-auto w-full">
        <div className="text-center mb-14">
          <div className="text-xs tracking-widest th-text-dimmer uppercase mb-4">— Got questions?</div>
          <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight glow-text">FAQ</h2>
        </div>

        <div className="space-y-0 border th-border-soft">
          {faqs.map((faq, i) => (
            <details
              key={i}
              className="group border-b th-border-soft last:border-b-0"
            >
              <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer list-none th-text-muted hover:text-foreground transition-colors select-none">
                <span className="font-black text-sm uppercase tracking-wide">{faq.q}</span>
                <span className="text-foreground/40 group-open:rotate-45 transition-transform duration-200 text-xl font-light shrink-0">+</span>
              </summary>
              <div className="px-6 pb-6 th-text-dim text-sm leading-relaxed border-t border-foreground/5 pt-4">
                {faq.a}
              </div>
            </details>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-14 text-center">
          <div className="th-text-ghost text-xs uppercase tracking-widest mb-6">Still have questions? We&apos;re here.</div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://slack.com/oauth/v2/authorize?client_id=10826535322675.10861212633408&scope=commands,chat:write&user_scope="
              className="th-btn-primary px-8 py-4 font-black uppercase tracking-widest text-sm border-4 transition-all glow-hover inline-block"
            >
              Add to Slack — Free
            </a>
            <Link
              href="/support"
              className="th-btn-secondary px-8 py-4 font-black uppercase tracking-widest text-sm border-4 transition-all glow-hover inline-block"
            >
              Contact Support
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t th-divider px-8 py-5 text-center th-text-ghost text-xs tracking-widest uppercase flex flex-col md:flex-row gap-4 justify-center items-center">
        <span>OPSMEM © {new Date().getFullYear()}</span>
        <span className="hidden md:inline">—</span>
        <Link href="/blog" className="hover:text-foreground hover:underline transition-all">BLOG</Link>
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
