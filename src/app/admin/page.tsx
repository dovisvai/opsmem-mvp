import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin — OpsMem',
  robots: { index: false, follow: false },
};

// ── Auth guard ──────────────────────────────────────────────────────────────
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const email = user?.email?.toLowerCase() ?? '';
  if (!user || !ADMIN_EMAILS.includes(email)) {
    redirect('/');
  }
  return user;
}

// ── Data fetching ───────────────────────────────────────────────────────────
async function getAdminStats() {
  const db = createAdminClient();
  const now = new Date();

  // Start of month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Start of week (Monday)
  const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - dayOfWeek);
  startOfWeek.setHours(0, 0, 0, 0);

  // Start of 30-day window for chart
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 29);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const [
    { count: totalDecisions },
    { count: thisMonthDecisions },
    { count: thisWeekDecisions },
    { count: proSubs },
    { data: workspaceRows },
    { data: recentDecisions },
  ] = await Promise.all([
    db.from('decisions').select('*', { count: 'exact', head: true }),
    db.from('decisions').select('*', { count: 'exact', head: true }).gte('created_at', startOfMonth),
    db.from('decisions').select('*', { count: 'exact', head: true }).gte('created_at', startOfWeek.toISOString()),
    db.from('subscriptions').select('*', { count: 'exact', head: true }).in('status', ['active', 'trialing']),
    db.from('decisions').select('workspace_id').gte('created_at', thirtyDaysAgo.toISOString()),
    db.from('decisions').select('created_at').gte('created_at', thirtyDaysAgo.toISOString()).order('created_at', { ascending: true }),
  ]);

  // Unique active workspaces in last 30 days
  const activeWorkspaces = new Set((workspaceRows ?? []).map((r: { workspace_id: string }) => r.workspace_id)).size;

  // Build daily chart — last 30 days buckets
  const buckets: Record<string, number> = {};
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo);
    d.setDate(thirtyDaysAgo.getDate() + i);
    buckets[d.toISOString().split('T')[0]] = 0;
  }
  (recentDecisions ?? []).forEach((r: { created_at: string }) => {
    const day = r.created_at.split('T')[0];
    if (buckets[day] !== undefined) buckets[day]++;
  });

  const chartData = Object.entries(buckets).map(([date, count]) => ({ date, count }));
  const maxCount = Math.max(...chartData.map(d => d.count), 1);

  return {
    totalDecisions: totalDecisions ?? 0,
    thisMonthDecisions: thisMonthDecisions ?? 0,
    thisWeekDecisions: thisWeekDecisions ?? 0,
    proSubs: proSubs ?? 0,
    activeWorkspaces,
    chartData,
    maxCount,
  };
}

// ── Page ────────────────────────────────────────────────────────────────────
export default async function AdminPage() {
  await requireAdmin();
  const stats = await getAdminStats();

  const statCards = [
    { label: 'TOTAL DECISIONS', value: stats.totalDecisions.toLocaleString(), sub: 'all time' },
    { label: 'THIS MONTH', value: stats.thisMonthDecisions.toLocaleString(), sub: 'decisions logged' },
    { label: 'THIS WEEK', value: stats.thisWeekDecisions.toLocaleString(), sub: 'decisions logged' },
    { label: 'PRO SUBSCRIBERS', value: stats.proSubs.toLocaleString(), sub: 'active / trialing' },
    { label: 'ACTIVE WORKSPACES', value: stats.activeWorkspaces.toLocaleString(), sub: 'last 30 days' },
  ];

  return (
    <div
      className="min-h-screen bg-background text-foreground flex flex-col"
      style={{ fontFamily: '"Courier New", Courier, monospace' }}
    >
      {/* ── NAV ── */}
      <header className="px-6 py-4 border-b border-foreground/10 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 hover:opacity-75 transition-opacity">
          <Image src="/opsmem-logo.png" alt="OpsMem" width={28} height={28} className="th-logo" />
          <span className="font-black text-sm tracking-widest uppercase">OPSMEM</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs font-black tracking-widest border border-foreground/30 px-3 py-1 th-text-dimmer uppercase">
            ⬡ FOUNDER ADMIN
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-16">

        {/* Title */}
        <div className="border-b-4 th-border-strong pb-8 mb-14">
          <div className="text-xs tracking-widest th-text-dimmer uppercase mb-3">— Internal Only</div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight uppercase leading-none glow-text mb-3">
            USAGE DASHBOARD
          </h1>
          <p className="th-text-muted text-sm">
            Live data from Supabase · Refreshes on every page load
          </p>
        </div>

        {/* ── STAT CARDS ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-0 border-2 th-border-strong mb-14 glow-static">
          {statCards.map((card, i) => (
            <div
              key={card.label}
              className={`p-6 flex flex-col justify-between glow-card ${i < statCards.length - 1 ? 'border-r border-b md:border-b-0 th-border-soft' : ''}`}
            >
              <div className="text-xs tracking-widest th-text-dimmer uppercase mb-4 leading-tight">{card.label}</div>
              <div>
                <div className="text-4xl font-black tabular-nums">{card.value}</div>
                <div className="text-xs th-text-ghost mt-1 uppercase tracking-widest">{card.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── DAILY CHART ── */}
        <div className="border border-foreground/10 p-6 mb-14">
          <div className="text-xs tracking-widest th-text-dimmer uppercase mb-6">
            Decisions Per Day — Last 30 Days
          </div>

          {/* Bar chart */}
          <div className="flex items-end gap-[3px] h-40 w-full">
            {stats.chartData.map(({ date, count }) => {
              const heightPct = Math.max((count / stats.maxCount) * 100, count > 0 ? 4 : 1);
              const label = new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              return (
                <div
                  key={date}
                  className="flex-1 flex flex-col items-center justify-end h-full group relative"
                  title={`${label}: ${count} decision${count !== 1 ? 's' : ''}`}
                >
                  <div
                    className="w-full bg-foreground/80 group-hover:bg-foreground transition-colors duration-150"
                    style={{ height: `${heightPct}%` }}
                  />
                  {/* Tooltip */}
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-9 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs px-2 py-1 whitespace-nowrap pointer-events-none transition-opacity font-mono z-10">
                    {count}
                  </div>
                </div>
              );
            })}
          </div>

          {/* X-axis labels — show every 5 days */}
          <div className="flex justify-between mt-2 px-0">
            {stats.chartData
              .filter((_, i) => i === 0 || i === 9 || i === 19 || i === 29)
              .map(({ date }) => (
                <span key={date} className="text-[10px] th-text-ghost font-mono">
                  {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              ))}
          </div>
        </div>

        {/* ── QUICK ACTIONS ── */}
        <div className="border border-foreground/10 p-6">
          <div className="text-xs tracking-widest th-text-dimmer uppercase mb-6">Quick Links</div>
          <div className="flex flex-wrap gap-3">
            {[
              { label: 'Supabase Studio', href: 'https://supabase.com/dashboard' },
              { label: 'Stripe Dashboard', href: 'https://dashboard.stripe.com' },
              { label: 'Vercel Project', href: 'https://vercel.com/dashboard' },
              { label: 'Google Analytics', href: 'https://analytics.google.com' },
              { label: '← Back to App', href: '/' },
            ].map(link => (
              <a
                key={link.label}
                href={link.href}
                target={link.href.startsWith('http') ? '_blank' : undefined}
                rel="noopener noreferrer"
                className="px-4 py-2 border th-border-soft th-text-muted text-xs font-black tracking-widest uppercase hover:border-foreground hover:text-foreground transition-all glow-hover"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

      </main>

      <footer className="border-t border-foreground/10 px-6 py-4 text-center th-text-ghost text-xs tracking-widest uppercase">
        OPSMEM INTERNAL · NOT INDEXED · {new Date().toUTCString()}
      </footer>
    </div>
  );
}
