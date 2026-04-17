import type { Metadata } from 'next';
import Link from 'next/link';
import { HomeNav } from '@/components/home-nav';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Insights from the OpsMem team on team decision-making, AI-powered knowledge management, and building better Slack workflows for modern engineering teams.',
  keywords: ['team decisions', 'Slack productivity', 'decision log blog', 'AI knowledge base', 'OpsMem blog'],
  alternates: { canonical: 'https://opsmem.com/blog' },
  openGraph: {
    title: 'Blog | OpsMem',
    description: 'Insights on team decision-making, knowledge management, and AI-powered Slack workflows.',
    url: 'https://opsmem.com/blog',
    type: 'website',
  },
};

const posts = [
  {
    slug: 'why-teams-lose-critical-decisions',
    title: 'Why Your Team Keeps Losing Critical Decisions (And How to Fix It)',
    excerpt: 'Every engineering team has experienced it: a decision made six months ago surfaces in a painful production incident and nobody can remember why it was made. Here\'s the systemic reason it happens — and how a persistent decision log solves it permanently.',
    date: 'April 10, 2026',
    readTime: '6 min read',
    tag: 'TEAM DYNAMICS',
  },
  {
    slug: 'ai-semantic-search-for-slack-teams',
    title: 'How AI Semantic Search Is Transforming Team Knowledge in Slack',
    excerpt: 'Keyword search in Slack channels fails when you don\'t remember the exact words used three months ago. AI semantic search understands the meaning behind your query — here\'s what that unlocks for distributed teams.',
    date: 'April 3, 2026',
    readTime: '5 min read',
    tag: 'AI & SEARCH',
  },
  {
    slug: 'eliminate-decision-fatigue-with-opsmem',
    title: 'Eliminate Decision Fatigue: How OpsMem Gives Your Team Institutional Memory',
    excerpt: 'Decision fatigue compounds silently across engineering orgs. Teams re-debate settled issues, onboard engineers slowly, and lose institutional knowledge every time someone leaves. OpsMem is the infrastructure layer that fixes this.',
    date: 'March 27, 2026',
    readTime: '7 min read',
    tag: 'PRODUCTIVITY',
  },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)', color: 'var(--foreground)', fontFamily: '"Courier New", Courier, monospace' }}>
      <HomeNav />

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-20">

        {/* Header */}
        <div className="border-b-4 th-border-strong pb-8 mb-16">
          <div className="text-xs tracking-widest th-text-dimmer uppercase mb-4">— The OpsMem Journal</div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight uppercase leading-none glow-text mb-4">
            BLOG
          </h1>
          <p className="th-text-muted text-sm md:text-base max-w-xl leading-relaxed">
            Practical insights on team decision-making, AI search, and making knowledge stick across your org.
          </p>
        </div>

        {/* Post List */}
        <div className="space-y-6">
          {posts.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="block group">
              <article className="p-8 md:p-10 border th-border-soft glow-card transition-all">
                <div className="flex items-center gap-4 mb-5">
                  <span className="text-xs font-black tracking-widest border border-foreground/30 px-2 py-0.5 th-text-dimmer group-hover:border-foreground/60 transition-colors">
                    {post.tag}
                  </span>
                  <span className="text-xs th-text-ghost">{post.date}</span>
                  <span className="text-xs th-text-ghost">· {post.readTime}</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight leading-tight mb-4 group-hover:opacity-70 transition-opacity">
                  {post.title}
                </h2>
                <p className="th-text-dim text-sm leading-relaxed max-w-2xl">
                  {post.excerpt}
                </p>
                <div className="mt-8 text-xs font-black tracking-widest th-text-dimmer group-hover:text-foreground transition-colors uppercase">
                  READ ARTICLE →
                </div>
              </article>
            </Link>
          ))}
        </div>
      </main>

      <footer className="border-t th-divider px-8 py-5 text-center th-text-ghost text-xs tracking-widest uppercase flex flex-col md:flex-row gap-4 justify-center items-center">
        <span>OPSMEM © {new Date().getFullYear()}</span>
        <span className="hidden md:inline">—</span>
        <Link href="/privacy" className="hover:text-foreground hover:underline transition-all">PRIVACY</Link>
        <span className="hidden md:inline">—</span>
        <Link href="/terms" className="hover:text-foreground hover:underline transition-all">TERMS</Link>
        <span className="hidden md:inline">—</span>
        <Link href="/support" className="hover:text-foreground hover:underline transition-all">SUPPORT</Link>
        <span className="hidden md:inline">—</span>
        <Link href="/blog" className="hover:text-foreground hover:underline transition-all">BLOG</Link>
      </footer>
    </div>
  );
}
