import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/server';
import Stripe from 'stripe';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin — OpsMem',
  robots: { index: false, follow: false },
};

// ── Auth guard ─────────────────────────────────────────────────────────────
function requireAdmin(searchParams: { key?: string }) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || searchParams.key !== secret) redirect('/');
}

// ── Helpers ────────────────────────────────────────────────────────────────
function fmt(n: number, decimals = 0) {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function fmtUsd(cents: number) {
  return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Data fetching ──────────────────────────────────────────────────────────
async function getStats() {
  const db   = createAdminClient();
  const now  = new Date();

  const startOfMonth    = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth= new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth  = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  const dayOfWeek       = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const startOfWeek     = new Date(now);
  startOfWeek.setDate(now.getDate() - dayOfWeek);
  startOfWeek.setHours(0, 0, 0, 0);
  const thirtyDaysAgo   = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 29);
  thirtyDaysAgo.setHours(0, 0, 0, 0);
  const yesterday       = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  // ── Supabase queries ──
  const [
    { count: totalDecisions },
    { count: thisMonthDecisions },
    { count: lastMonthDecisions },
    { count: thisWeekDecisions },
    { count: todayDecisions },
    { data: allSubs },
    { data: thirtyDayRows },
    { data: recentRows },
    { data: allWsRows },
  ] = await Promise.all([
    db.from('decisions').select('*', { count: 'exact', head: true }),
    db.from('decisions').select('*', { count: 'exact', head: true }).gte('created_at', startOfMonth.toISOString()),
    db.from('decisions').select('*', { count: 'exact', head: true }).gte('created_at', startOfLastMonth.toISOString()).lte('created_at', endOfLastMonth.toISOString()),
    db.from('decisions').select('*', { count: 'exact', head: true }).gte('created_at', startOfWeek.toISOString()),
    db.from('decisions').select('*', { count: 'exact', head: true }).gte('created_at', yesterday.toISOString()),
    db.from('subscriptions').select('workspace_id, status, stripe_subscription_id, created_at'),
    db.from('decisions').select('workspace_id, created_at').gte('created_at', thirtyDaysAgo.toISOString()),
    db.from('decisions').select('created_at').gte('created_at', thirtyDaysAgo.toISOString()).order('created_at', { ascending: true }),
    db.from('decisions').select('workspace_id'),
  ]);

  // Active/trialing subs
  const activeSubs = (allSubs ?? []).filter(s => ['active', 'trialing'].includes(s.status));
  const newSubsThisMonth = activeSubs.filter(s => new Date(s.created_at) >= startOfMonth).length;

  // Workspace stats
  const allWsSet      = new Set((allWsRows ?? []).map((r: { workspace_id: string }) => r.workspace_id));
  const activeWsSet   = new Set((thirtyDayRows ?? []).map((r: { workspace_id: string }) => r.workspace_id));
  const proWsSet      = new Set(activeSubs.map(s => s.workspace_id));
  const totalWorkspaces  = allWsSet.size;
  const activeWorkspaces = activeWsSet.size;
  const freeWorkspaces   = activeWorkspaces - [...activeWsSet].filter(ws => proWsSet.has(ws)).length;

  // Growth: this month vs last month
  const growth = lastMonthDecisions && lastMonthDecisions > 0
    ? (((thisMonthDecisions ?? 0) - lastMonthDecisions) / lastMonthDecisions * 100)
    : null;

  // Top 5 workspaces by decisions (last 30 days)
  const wsCounts: Record<string, number> = {};
  (thirtyDayRows ?? []).forEach((r: { workspace_id: string }) => {
    wsCounts[r.workspace_id] = (wsCounts[r.workspace_id] ?? 0) + 1;
  });
  const topWorkspaces = Object.entries(wsCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([ws, count]) => ({ ws, count, isPro: proWsSet.has(ws) }));

  // Daily chart buckets
  const buckets: Record<string, number> = {};
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo);
    d.setDate(thirtyDaysAgo.getDate() + i);
    buckets[d.toISOString().split('T')[0]] = 0;
  }
  (recentRows ?? []).forEach((r: { created_at: string }) => {
    const day = r.created_at.split('T')[0];
    if (buckets[day] !== undefined) buckets[day]++;
  });
  const chartData = Object.entries(buckets).map(([date, count]) => ({ date, count }));
  const maxCount  = Math.max(...chartData.map(d => d.count), 1);

  // ── Stripe revenue ──
  let mrr = 0;
  let totalRevenue = 0;
  let revenueThisMonth = 0;
  let stripeError: string | null = null;

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-03-25.dahlia' as any });

    // MRR: sum all active subscription amounts
    for (const sub of activeSubs) {
      if (!sub.stripe_subscription_id) continue;
      try {
        const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
        for (const item of stripeSub.items.data) {
          mrr += item.price.unit_amount ?? 0;
        }
      } catch { /* sub may not exist in Stripe yet */ }
    }

    // Total & this-month revenue from invoices
    const invoices = await stripe.invoices.list({ limit: 100, status: 'paid' });
    for (const inv of invoices.data) {
      totalRevenue += inv.amount_paid;
      if (inv.created >= Math.floor(startOfMonth.getTime() / 1000)) {
        revenueThisMonth += inv.amount_paid;
      }
    }
  } catch (e) {
    stripeError = (e as Error).message;
  }

  // ── Cost estimates ──
  // OpenAI: text-embedding-3-small → $0.00002 / 1K tokens, ~100 tokens/decision avg
  const openaiCostPerDecision = 0.000002; // $0.000002 per decision
  const estimatedOpenaiCostMonth = (thisMonthDecisions ?? 0) * openaiCostPerDecision;
  const estimatedOpenaiCostTotal = (totalDecisions ?? 0) * openaiCostPerDecision;

  // Fixed infra costs (set in env or use defaults)
  const infra = {
    supabase: parseFloat(process.env.COST_SUPABASE ?? '25'),
    vercel:   parseFloat(process.env.COST_VERCEL   ?? '20'),
    other:    parseFloat(process.env.COST_OTHER     ?? '0'),
  };
  const monthlyInfraCost = infra.supabase + infra.vercel + infra.other;
  const estimatedTotalCostMonth = monthlyInfraCost + estimatedOpenaiCostMonth;
  const estimatedProfit = (mrr / 100) - estimatedTotalCostMonth;
  const margin = estimatedTotalCostMonth > 0 && mrr > 0
    ? ((estimatedProfit / (mrr / 100)) * 100)
    : null;

  return {
    // Usage
    totalDecisions:     totalDecisions    ?? 0,
    thisMonthDecisions: thisMonthDecisions ?? 0,
    lastMonthDecisions: lastMonthDecisions ?? 0,
    thisWeekDecisions:  thisWeekDecisions  ?? 0,
    todayDecisions:     todayDecisions     ?? 0,
    growth,
    // Workspaces
    totalWorkspaces,
    activeWorkspaces,
    freeWorkspaces,
    proWorkspaces: proWsSet.size,
    topWorkspaces,
    newSubsThisMonth,
    // Revenue
    mrr,
    totalRevenue,
    revenueThisMonth,
    stripeError,
    // Costs
    estimatedOpenaiCostMonth,
    estimatedOpenaiCostTotal,
    infra,
    monthlyInfraCost,
    estimatedTotalCostMonth,
    estimatedProfit,
    margin,
    // Chart
    chartData,
    maxCount,
  };
}

// ── Components ─────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs tracking-widest th-text-dimmer uppercase mb-6 flex items-center gap-3">
      <span className="flex-1 border-t border-foreground/10" />
      {children}
      <span className="flex-1 border-t border-foreground/10" />
    </div>
  );
}

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="border border-foreground/15 p-5 flex flex-col gap-3 glow-card">
      <div className="text-[10px] tracking-widest th-text-dimmer uppercase leading-tight">{label}</div>
      <div className={`text-3xl font-black tabular-nums ${accent ?? ''}`}>{value}</div>
      {sub && <div className="text-[10px] th-text-ghost uppercase tracking-widest">{sub}</div>}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const params = await searchParams;
  requireAdmin(params);
  const s = await getStats();
  const adminKey = params.key ?? '';

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col" style={{ fontFamily: '"Courier New", Courier, monospace' }}>

      {/* NAV */}
      <header className="px-6 py-4 border-b border-foreground/10 flex items-center justify-between sticky top-0 bg-background z-10">
        <Link href="/" className="flex items-center gap-3 hover:opacity-75 transition-opacity">
          <Image src="/opsmem-logo.png" alt="OpsMem" width={26} height={26} className="th-logo" />
          <span className="font-black text-sm tracking-widest uppercase">OPSMEM</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-[10px] th-text-ghost hidden sm:inline">{new Date().toUTCString()}</span>
          <span className="text-xs font-black tracking-widest border border-foreground/30 px-3 py-1 th-text-dimmer uppercase">⬡ FOUNDER</span>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-12 space-y-16">

        {/* TITLE */}
        <div className="border-b-4 th-border-strong pb-8">
          <div className="text-xs tracking-widest th-text-dimmer uppercase mb-3">— Internal · Not indexed</div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight uppercase leading-none glow-text mb-3">FOUNDER DASHBOARD</h1>
          <p className="th-text-muted text-sm">Revenue · Costs · Operations · Usage — live from Stripe + Supabase</p>
        </div>

        {/* ── REVENUE ── */}
        <section>
          <SectionLabel>💰 Revenue</SectionLabel>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <KpiCard label="MRR" value={fmtUsd(s.mrr)} sub="monthly recurring" accent="text-foreground" />
            <KpiCard label="Revenue This Month" value={fmtUsd(s.revenueThisMonth)} sub="paid invoices" />
            <KpiCard label="Total Revenue" value={fmtUsd(s.totalRevenue)} sub="all time" />
            <KpiCard label="New Subs This Month" value={fmt(s.newSubsThisMonth)} sub="upgrades" />
          </div>
          {s.stripeError && (
            <div className="text-xs text-red-400 border border-red-500/30 px-4 py-2 mt-2">
              ⚠ Stripe error: {s.stripeError}
            </div>
          )}
        </section>

        {/* ── COSTS ── */}
        <section>
          <SectionLabel>💸 Estimated Monthly Costs</SectionLabel>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <KpiCard label="Supabase" value={`$${fmt(s.infra.supabase, 2)}`} sub="set COST_SUPABASE env" />
            <KpiCard label="Vercel" value={`$${fmt(s.infra.vercel, 2)}`} sub="set COST_VERCEL env" />
            <KpiCard label="OpenAI (embeddings)" value={`$${s.estimatedOpenaiCostMonth.toFixed(4)}`} sub={`${fmt(s.thisMonthDecisions)} decisions × $0.000002`} />
            <KpiCard label="Total Est. Cost / Mo" value={`$${fmt(s.estimatedTotalCostMonth, 2)}`} sub="infra + AI" />
          </div>

          {/* Profit bar */}
          <div className="border border-foreground/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs tracking-widest th-text-dimmer uppercase">Est. Profit Margin This Month</span>
              <span className={`text-xl font-black tabular-nums ${s.estimatedProfit >= 0 ? '' : 'text-red-400'}`}>
                {s.margin !== null ? `${fmt(s.margin, 1)}%` : 'N/A'}
                <span className="text-sm font-normal ml-2 th-text-ghost">({fmtUsd((s.mrr) - (s.estimatedTotalCostMonth * 100))} / mo)</span>
              </span>
            </div>
            <div className="w-full bg-foreground/10 h-3">
              {s.margin !== null && (
                <div
                  className={`h-3 transition-all ${s.margin >= 0 ? 'bg-foreground' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(Math.max(s.margin, 0), 100)}%` }}
                />
              )}
            </div>
            <div className="flex justify-between text-[10px] th-text-ghost mt-2 uppercase tracking-widest">
              <span>MRR: {fmtUsd(s.mrr)}</span>
              <span>Costs: ${fmt(s.estimatedTotalCostMonth, 2)}/mo</span>
            </div>
          </div>
        </section>

        {/* ── WORKSPACES ── */}
        <section>
          <SectionLabel>🏢 Workspaces & Subscribers</SectionLabel>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <KpiCard label="Total Workspaces" value={fmt(s.totalWorkspaces)} sub="ever installed" />
            <KpiCard label="Active (30 days)" value={fmt(s.activeWorkspaces)} sub="logged a decision" />
            <KpiCard label="Pro Subscribers" value={fmt(s.proWorkspaces)} sub="active / trialing" accent="text-foreground" />
            <KpiCard label="Free Workspaces" value={fmt(s.freeWorkspaces)} sub="active, no sub" />
          </div>

          {/* Conversion bar */}
          <div className="border border-foreground/10 p-5 mb-8">
            <div className="text-[10px] tracking-widest th-text-dimmer uppercase mb-3">Free → Pro Conversion Rate</div>
            <div className="flex items-center gap-4">
              <div className="flex-1 bg-foreground/10 h-2">
                <div
                  className="h-2 bg-foreground transition-all"
                  style={{ width: s.activeWorkspaces > 0 ? `${(s.proWorkspaces / s.activeWorkspaces) * 100}%` : '0%' }}
                />
              </div>
              <span className="text-lg font-black tabular-nums">
                {s.activeWorkspaces > 0 ? fmt((s.proWorkspaces / s.activeWorkspaces) * 100, 1) : '0.0'}%
              </span>
            </div>
          </div>

          {/* Top workspaces */}
          <div className="border border-foreground/10 p-6">
            <div className="text-xs tracking-widest th-text-dimmer uppercase mb-5">Top 5 Most Active Workspaces (Last 30 Days)</div>
            {s.topWorkspaces.length === 0 ? (
              <div className="th-text-ghost text-sm">No data yet.</div>
            ) : (
              <div className="space-y-3">
                {s.topWorkspaces.map(({ ws, count, isPro }, i) => (
                  <div key={ws} className="flex items-center gap-4">
                    <span className="text-xs th-text-ghost w-4 tabular-nums">{i + 1}</span>
                    <span className="font-mono text-xs th-text-muted flex-1 truncate">{ws}</span>
                    <span className={`text-[10px] font-black tracking-widest px-2 py-0.5 border ${isPro ? 'border-foreground/60 text-foreground' : 'border-foreground/20 th-text-ghost'}`}>
                      {isPro ? 'PRO' : 'FREE'}
                    </span>
                    <div className="w-24 bg-foreground/10 h-1.5">
                      <div
                        className="h-1.5 bg-foreground"
                        style={{ width: `${(count / (s.topWorkspaces[0]?.count || 1)) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-black tabular-nums w-8 text-right">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── USAGE / OPERATIONS ── */}
        <section>
          <SectionLabel>📊 Usage & Operations</SectionLabel>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <KpiCard label="Today" value={fmt(s.todayDecisions)} sub="decisions logged" />
            <KpiCard label="This Week" value={fmt(s.thisWeekDecisions)} sub="decisions logged" />
            <KpiCard label="This Month" value={fmt(s.thisMonthDecisions)} sub={s.growth !== null ? `${s.growth >= 0 ? '+' : ''}${fmt(s.growth, 1)}% vs last month` : 'decisions'} />
            <KpiCard label="All Time" value={fmt(s.totalDecisions)} sub="total decisions" />
          </div>

          {/* Month-over-month growth */}
          {s.growth !== null && (
            <div className="border border-foreground/10 p-5 mb-8 flex items-center gap-6">
              <div>
                <div className="text-[10px] tracking-widest th-text-dimmer uppercase mb-1">Month-over-Month Growth</div>
                <div className={`text-3xl font-black ${s.growth >= 0 ? '' : 'text-red-400'}`}>
                  {s.growth >= 0 ? '+' : ''}{fmt(s.growth, 1)}%
                </div>
              </div>
              <div className="flex-1 grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-[10px] th-text-ghost uppercase tracking-widest mb-1">Last Month</div>
                  <div className="text-xl font-black">{fmt(s.lastMonthDecisions)}</div>
                </div>
                <div>
                  <div className="text-[10px] th-text-ghost uppercase tracking-widest mb-1">This Month</div>
                  <div className="text-xl font-black">{fmt(s.thisMonthDecisions)}</div>
                </div>
              </div>
            </div>
          )}

          {/* 30-day bar chart */}
          <div className="border border-foreground/10 p-6">
            <div className="text-xs tracking-widest th-text-dimmer uppercase mb-6">Decisions Per Day — Last 30 Days</div>
            <div className="flex items-end gap-[3px] h-36 w-full">
              {s.chartData.map(({ date, count }) => {
                const heightPct = Math.max((count / s.maxCount) * 100, count > 0 ? 4 : 1);
                const label = new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                return (
                  <div key={date} className="flex-1 flex flex-col items-center justify-end h-full group relative" title={`${label}: ${count}`}>
                    <div className="w-full bg-foreground/70 group-hover:bg-foreground transition-colors duration-150" style={{ height: `${heightPct}%` }} />
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] px-2 py-0.5 whitespace-nowrap pointer-events-none z-10 font-mono">
                      {count}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-2">
              {s.chartData.filter((_, i) => i === 0 || i === 9 || i === 19 || i === 29).map(({ date }) => (
                <span key={date} className="text-[10px] th-text-ghost font-mono">
                  {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── QUICK LINKS ── */}
        <section>
          <SectionLabel>🔗 Quick Links</SectionLabel>
          <div className="flex flex-wrap gap-3">
            {[
              { label: 'Stripe Dashboard', href: 'https://dashboard.stripe.com' },
              { label: 'Supabase Studio', href: 'https://supabase.com/dashboard' },
              { label: 'Vercel Project', href: 'https://vercel.com/dashboard' },
              { label: 'Google Analytics', href: 'https://analytics.google.com' },
              { label: 'Meta Business', href: 'https://business.facebook.com' },
              { label: '← Back to Site', href: '/' },
            ].map(link => (
              <a
                key={link.label}
                href={link.href}
                target={link.href.startsWith('http') ? '_blank' : undefined}
                rel="noopener noreferrer"
                className="px-4 py-2 border th-border-soft th-text-muted text-xs font-black tracking-widest uppercase hover:border-foreground hover:text-foreground transition-all"
              >
                {link.label}
              </a>
            ))}
          </div>
        </section>

      </main>

      <footer className="border-t border-foreground/10 px-6 py-4 text-center th-text-ghost text-[10px] tracking-widest uppercase">
        OPSMEM INTERNAL · NOT INDEXED · {new Date().toUTCString()}
      </footer>
    </div>
  );
}
