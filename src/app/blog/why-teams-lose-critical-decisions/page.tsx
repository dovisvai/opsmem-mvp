import type { Metadata } from 'next';
import Link from 'next/link';
import { HomeNav } from '@/components/home-nav';

export const metadata: Metadata = {
  title: 'Why Your Team Keeps Losing Critical Decisions (And How to Fix It)',
  description: 'Every engineering team has experienced it: a decision made months ago surfaces in a production incident and nobody can remember why. Here\'s the systemic reason it happens — and how OpsMem\'s persistent decision log solves it permanently.',
  keywords: ['team decision log', 'institutional knowledge', 'engineering decisions', 'decision memory', 'knowledge management', 'OpsMem'],
  alternates: { canonical: 'https://opsmem.com/blog/why-teams-lose-critical-decisions' },
  openGraph: {
    title: 'Why Your Team Keeps Losing Critical Decisions (And How to Fix It)',
    description: 'The systemic reason engineering teams forget past decisions — and how a persistent decision log like OpsMem prevents it.',
    url: 'https://opsmem.com/blog/why-teams-lose-critical-decisions',
    type: 'article',
    publishedTime: '2026-04-10T00:00:00.000Z',
    authors: ['https://opsmem.com'],
    tags: ['team dynamics', 'knowledge management', 'Slack', 'OpsMem'],
  },
};

export default function ArticlePage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)', color: 'var(--foreground)', fontFamily: '"Courier New", Courier, monospace' }}>
      <HomeNav />

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-20">

        {/* Breadcrumb */}
        <div className="text-xs th-text-ghost tracking-widest uppercase mb-12">
          <Link href="/blog" className="hover:text-foreground transition-colors">BLOG</Link>
          <span className="mx-2">→</span>
          <span>TEAM DYNAMICS</span>
        </div>

        {/* Header */}
        <header className="mb-16 border-b-4 th-border-strong pb-10">
          <div className="flex items-center gap-4 mb-6">
            <span className="text-xs font-black tracking-widest border border-foreground/30 px-2 py-0.5 th-text-dimmer">TEAM DYNAMICS</span>
            <span className="text-xs th-text-ghost">April 10, 2026</span>
            <span className="text-xs th-text-ghost">· 6 min read</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight leading-tight mb-6 glow-text">
            Why Your Team Keeps Losing Critical Decisions (And How to Fix It)
          </h1>
          <p className="th-text-muted text-base leading-relaxed">
            Every engineering team has experienced it: a decision made six months ago surfaces in a painful production incident — and nobody can remember why it was made.
          </p>
        </header>

        {/* Body */}
        <article className="prose-custom space-y-10 th-text-dim text-sm md:text-base leading-relaxed">

          <section>
            <h2 className="text-xl font-black text-foreground uppercase tracking-widest mb-4">The Silent Cost of Forgotten Decisions</h2>
            <p>
              Your team held a 90-minute architecture meeting in January. You chose PostgreSQL over MySQL for a very specific reason — a nuance about JSONB support critical to your data model. By July, that engineer has left the company. A new hire pushes a migration plan. Nobody pushes back because nobody remembers the reasoning.
            </p>
            <p className="mt-4">
              This is not a people problem. It is a system problem. Teams are generating high-quality decisions constantly, but those decisions evaporate the moment the Slack thread scrolls out of view.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-foreground uppercase tracking-widest mb-4">Why Slack Channels Are Not Enough</h2>
            <p>
              Slack is exceptional at facilitating real-time conversation. It is poor at retaining structured knowledge. The information architecture of a Slack channel is built for temporal flow, not for retrieval. When you search Slack for "why did we switch databases," you get a wall of emoji reactions and off-topic replies.
            </p>
            <p className="mt-4">
              Most teams attempt to compensate with Confluence pages, Notion docs, or internal wikis. These tools suffer from the same core problem: they require a separate context switch. Nobody wants to file a Notion page after making a decision in Slack. The friction is too high. The habit never forms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-foreground uppercase tracking-widest mb-4">The Three Failure Modes</h2>
            <p className="mb-4">After working with dozens of distributed teams, we see the same three failure modes repeatedly:</p>
            <div className="space-y-4">
              {[
                { n: '01', title: 'The Departing Expert', body: 'Senior engineers carry critical architectural context in their heads. When they leave, that context leaves too. Onboarding a replacement takes 6+ months not because of skill gaps, but because of context gaps.' },
                { n: '02', title: 'The Repeated Debate', body: 'Teams re-examine the same decisions every quarter. Which deployment strategy? Which ORM? Which branching model? The meeting happens again because nobody can find the record of when it was settled.' },
                { n: '03', title: 'The Invisible Assumption', body: 'Some of the most impactful decisions are never consciously recorded because they felt obvious at the time. Six months later, that invisible assumption causes a critical failure in a system nobody expected it to affect.' },
              ].map(item => (
                <div key={item.n} className="border th-border-soft p-6 glow-card">
                  <div className="text-xs font-black th-text-ghost tracking-widest mb-2">{item.n}</div>
                  <div className="font-black text-foreground uppercase mb-2 tracking-wide">{item.title}</div>
                  <p className="th-text-dim text-sm">{item.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-black text-foreground uppercase tracking-widest mb-4">The Fix: Zero-Friction Decision Logging</h2>
            <p>
              The solution to lost decisions is not another wiki. It is making the act of recording a decision as effortless as making it. This is exactly what OpsMem is built for.
            </p>
            <p className="mt-4">
              When your team reaches a decision in Slack, anyone can type <span className="font-black text-foreground border border-foreground/30 px-1 py-0.5 text-xs">/decide We chose PostgreSQL over MySQL for full JSONB support in our telemetry model #backend #data</span>. That decision is immediately logged, semantically embedded, and retrievable forever.
            </p>
            <p className="mt-4">
              Six months later, when the new hire asks, they type <span className="font-black text-foreground border border-foreground/30 px-1 py-0.5 text-xs">/find why did we pick postgres</span>. OpsMem's OpenAI-powered semantic search understands what they mean — not just the words they use — and surfaces the exact decision with its original context and tags.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-foreground uppercase tracking-widest mb-4">Building a Decision Culture</h2>
            <p>
              The teams that benefit most from OpsMem are those that treat decision documentation as a first-class engineering practice — the same way they treat tests, code review, and deployment pipelines. When logging a decision takes three seconds and retrieval is instant, the ROI compounds weekly.
            </p>
            <p className="mt-4">
              New hires onboard faster. Post-mortems become shorter. Repeated debates disappear. The institutional knowledge that was previously locked in the heads of your most senior engineers becomes durable, searchable infrastructure.
            </p>
          </section>

          {/* CTA */}
          <div className="border-2 th-border-strong p-8 glow-static mt-16 text-center">
            <div className="text-xs tracking-widest th-text-ghost uppercase mb-4">Start Building Your Team&apos;s Memory</div>
            <div className="text-2xl font-black uppercase mb-6">Never Lose a Decision Again</div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="https://slack.com/oauth/v2/authorize?client_id=10826535322675.10861212633408&scope=commands,chat:write&user_scope=" className="th-btn-primary px-8 py-3 font-black uppercase tracking-widest text-sm border-4 transition-all glow-hover inline-block">
                Add to Slack — Free
              </a>
              <Link href="/pricing" className="th-btn-secondary px-8 py-3 font-black uppercase tracking-widest text-sm border-4 transition-all glow-hover inline-block">
                View Pricing
              </Link>
            </div>
          </div>

        </article>
      </main>

      <footer className="border-t th-divider px-8 py-5 text-center th-text-ghost text-xs tracking-widest uppercase flex flex-col md:flex-row gap-4 justify-center items-center mt-10">
        <Link href="/blog" className="hover:text-foreground transition-colors">← ALL ARTICLES</Link>
        <span className="hidden md:inline">—</span>
        <Link href="/" className="hover:text-foreground transition-colors">HOME</Link>
        <span className="hidden md:inline">—</span>
        <Link href="/privacy" className="hover:text-foreground transition-colors">PRIVACY</Link>
      </footer>
    </div>
  );
}
