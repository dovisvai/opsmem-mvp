"use client";

import { useState, useTransition, useEffect, useCallback, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip } from 'recharts';
import { ThemeToggle } from '@/components/theme-toggle';
import { logDecision, searchDecisions, getAllDecisions, getMonthlyUsage, deleteWorkspaceData } from '@/app/actions/decisions';
import { getWorkspaceMembers, createInvite, WorkspaceMember } from '@/app/actions/team';
import { createCustomerPortalSession } from '@/app/actions/stripe';
import { useScrolled } from '@/lib/hooks/use-scrolled';

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center font-mono tracking-widest animate-pulse">
        BOOTING OPSMEM...
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}

type Decision = {
  id: string;
  text: string;
  tags: string[];
  created_at: string;
  similarity?: number;
  user_id?: string;
};

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const workspaceId = searchParams.get('workspace');
  const userId = 'U_WEB_DASHBOARD';

  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [allDecisions, setAllDecisions] = useState<Decision[]>([]);
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [monthlyCount, setMonthlyCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'log' | 'analytics'>('log');
  const [isPro, setIsPro] = useState(false); // kept for getMonthlyUsage return shape compatibility
  const [tier, setTier] = useState<'free' | 'pro'>('free');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rawSub, setRawSub] = useState<any>(null);
  const [isRefreshingPlan, setIsRefreshingPlan] = useState(false);
  const [isManagingPlan, setIsManagingPlan] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const scrolled = useScrolled();
  const FREE_LIMIT = 25;

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [newText, setNewText] = useState('');
  const [newTags, setNewTags] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [aiText, setAiText] = useState('');

  // Team modal state
  const [showTeam, setShowTeam] = useState(false);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [inviteUrl, setInviteUrl] = useState('');
  const [inviteCopied, setInviteCopied] = useState(false);
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);

  // Filters
  const [tagFilter, setTagFilter] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  const loadAll = useCallback(async () => {
    if (!workspaceId) return;
    startTransition(async () => {
      const [decResult, usageResult, teamResult] = await Promise.all([
        getAllDecisions(workspaceId),
        getMonthlyUsage(workspaceId),
        getWorkspaceMembers(workspaceId),
      ]);
      if (decResult.success && decResult.data) setAllDecisions(decResult.data as Decision[]);
      else setAllDecisions([]);
      if (usageResult.success) {
        setMonthlyCount(usageResult.count);
        setIsPro(usageResult.isPro);
        setTier((usageResult.tier as 'free' | 'pro') || 'free');
        setRawSub(usageResult.rawSub || null);
      }
      if (teamResult.success) setMembers(teamResult.data);
      setIsSearching(false);
    });
  }, [workspaceId]);

  // Lightweight plan-only refresh — no full page reload needed after checkout.
  const refreshPlan = useCallback(async () => {
    if (!workspaceId) return;
    setIsRefreshingPlan(true);
    try {
      const usageResult = await getMonthlyUsage(workspaceId, Date.now());
      if (usageResult.success) {
        setMonthlyCount(usageResult.count);
        setIsPro(usageResult.isPro);
        setTier((usageResult.tier as 'free' | 'pro') || 'free');
        setRawSub(usageResult.rawSub || null);
      }
    } finally {
      setIsRefreshingPlan(false);
    }
  }, [workspaceId]);

  const performSearch = useCallback(async (query: string) => {
    if (!workspaceId) return;
    startTransition(async () => {
      const result = await searchDecisions(query, workspaceId);
      if (result.success && result.data) {
        setAllDecisions(result.data as Decision[]);
      } else {
        setAllDecisions([]);
      }
      setIsSearching(true);
    });
  }, [workspaceId]);

  const handleManagePlan = async () => {
    if (!workspaceId) return;
    setIsManagingPlan(true);
    setStatusMsg('CONNECTING TO STRIPE...');
    const result = await createCustomerPortalSession(workspaceId);
    if (result.error) {
      console.error(result.error);
      setStatusMsg(`ERROR: ${result.error}`);
      setIsManagingPlan(false);
    } else if (result.url) {
      window.location.href = result.url;
    }
  };

  useEffect(() => { loadAll(); }, [loadAll]);

  // Apply filters + sort
  useEffect(() => {
    let filtered = [...allDecisions];
    if (tagFilter) {
      filtered = filtered.filter(d =>
        d.tags?.some(t => t.toLowerCase().includes(tagFilter.toLowerCase()))
      );
    }
    filtered.sort((a, b) => {
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortOrder === 'newest' ? -diff : diff;
    });
    setDecisions(filtered);
    setCurrentPage(1);
  }, [allDecisions, tagFilter, sortOrder]);

  const handleLogDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim() || !workspaceId) return;
    startTransition(async () => {
      const tagsArray = newTags.split(',').map(t => t.trim()).filter(Boolean);
      const result = await logDecision(newText, workspaceId, userId, tagsArray, {});
      if (result.success) {
        setNewText('');
        setNewTags('');
        setShowModal(false);
        setStatusMsg('✓ Decision logged successfully.');
        setTimeout(() => setStatusMsg(''), 4000);
        loadAll();
      } else if (result.requiresUpgrade) {
        setStatusMsg('');
        setShowModal(false);
        router.push(`/pricing?workspace=${workspaceId}`);
      } else {
        setStatusMsg(`✗ ${result.error}`);
      }
    });
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Pagination
  const totalPages = Math.ceil(decisions.length / ITEMS_PER_PAGE);
  const paginated = decisions.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Stats
  const now = new Date();
  const thisMonthCount = allDecisions.filter(d => {
    const created = new Date(d.created_at);
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
  }).length;
  const allTags = allDecisions.flatMap(d => d.tags || []);
  const tagCounts = allTags.reduce<Record<string, number>>((acc, t) => {
    acc[t] = (acc[t] || 0) + 1; return acc;
  }, {});
  const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);

  // Memoized Chart Data
  const chartData = useMemo(() => {
    const buckets = Array.from({ length: 12 }, (_, i) => ({
      name: `W${i + 1}`,
      decisions: 0
    }));
    allDecisions.forEach(d => {
      const msDiff = new Date().getTime() - new Date(d.created_at).getTime();
      const weeksAgo = Math.floor(msDiff / (1000 * 60 * 60 * 24 * 7));
      if (weeksAgo >= 0 && weeksAgo < 12) {
        buckets[11 - weeksAgo].decisions++;
      }
    });
    return buckets;
  }, [allDecisions]);

  // AI Summary Hook
  const fullAiMsg = useMemo(() => {
    return thisMonthCount > 0 
      ? `Your team made ${thisMonthCount} decisions this month. Most common topic: ${topTags.length > 0 ? topTags[0][0].toUpperCase() : 'General'}.`
      : 'Not enough data this month to generate an insight. Log some decisions to see trends.';
  }, [thisMonthCount, topTags]);

  useEffect(() => {
    if (activeTab !== 'analytics') return;
    setAiText('');
    let i = 0;
    const interval = setInterval(() => {
      setAiText(fullAiMsg.substring(0, i));
      i++;
      if (i > fullAiMsg.length) clearInterval(interval);
    }, 25);
    return () => clearInterval(interval);
  }, [fullAiMsg, activeTab]);

  if (!workspaceId) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-8" style={{ fontFamily: '"Courier New", Courier, monospace' }}>
        <div className="border-4 border-foreground p-10 text-center max-w-lg">
          <div className="text-4xl font-black mb-6 tracking-widest">[ NO WORKSPACE ]</div>
          <p className="text-foreground/60 text-sm mb-6 leading-relaxed">
            Add your Slack workspace ID to the URL to access your decision memory.
          </p>
          <code className="bg-foreground text-background px-4 py-2 text-xs font-mono block">
            /dashboard?workspace=YOUR_TEAM_ID
          </code>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col" style={{ fontFamily: '"Courier New", Courier, monospace' }}>

      {/* ── NAV ── */}
      <header className={`nav-header border-b-0 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4 ${scrolled ? 'nav-scrolled' : ''}`}>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <Image
            src="/opsmem-logo.png"
            alt="OpsMem"
            width={32}
            height={32}
            className="th-logo opacity-90"
          />
          <span className="font-black text-base tracking-widest uppercase">OPSMEM</span>
          <span className="text-foreground/20">|</span>
          <span className="text-foreground/50 text-xs tracking-widest uppercase">Dashboard</span>
          <span className="text-foreground/25 text-xs border border-foreground/20 px-2 py-0.5">{workspaceId}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {statusMsg && (
            <span className={`text-xs font-mono ${statusMsg.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>
              {statusMsg}
            </span>
          )}
          {tier !== 'free' && rawSub?.status === 'active' ? (
            <>
              <span className="px-3 py-1.5 border border-foreground/40 bg-foreground text-background text-xs font-black tracking-widest uppercase inline-flex items-center gap-1">
                ∞ PRO
              </span>
              <button
                onClick={refreshPlan}
                disabled={isRefreshingPlan}
                title="Refresh plan status"
                className="px-3 py-1.5 border border-foreground/20 text-foreground/40 text-xs font-black tracking-widest hover:border-foreground/50 hover:text-foreground/70 transition-all uppercase disabled:opacity-30"
              >
                {isRefreshingPlan ? '...' : '↺'}
              </button>
              <button
                onClick={handleManagePlan}
                disabled={isManagingPlan}
                className="px-3 py-1.5 border border-foreground/30 text-foreground/60 text-xs font-black tracking-widest hover:border-foreground hover:text-foreground transition-all uppercase disabled:opacity-30"
              >
                {isManagingPlan ? 'LOADING...' : 'MANAGE SUB'}
              </button>
            </>
          ) : (
            <button
              onClick={() => router.push(`/pricing?workspace=${workspaceId}`)}
              className="px-3 py-1.5 border border-foreground/30 text-foreground/60 text-xs font-black tracking-widest hover:border-foreground hover:text-foreground transition-all uppercase"
              title="Upgrade your plan"
            >
              FREE PLAN ↑
            </button>
          )}
          <div className="flex border border-foreground/30 ml-0 sm:ml-2">
            <button
              onClick={() => setActiveTab('log')}
              className={`px-3 py-1.5 text-xs font-black tracking-widest transition-all uppercase ${activeTab === 'log' ? 'bg-foreground text-background' : 'text-foreground/60 hover:bg-foreground/10'}`}
            >
              LOG
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-1.5 text-xs font-black tracking-widest transition-all uppercase border-l border-foreground/30 ${activeTab === 'analytics' ? 'bg-foreground text-background' : 'text-foreground/60 hover:bg-foreground/10'}`}
            >
              ANALYTICS
            </button>
          </div>
          <button
            onClick={() => setShowTeam(true)}
            className="px-3 py-1.5 border border-foreground/30 text-foreground/60 text-xs font-black tracking-widest hover:border-foreground hover:text-foreground transition-all uppercase"
          >
            TEAM {members.filter(m => m.accepted_at).length > 0 ? `(${members.filter(m => m.accepted_at).length})` : ''}
          </button>
          <ThemeToggle />
          <button
            onClick={() => router.push('/')}
            className="px-3 py-1.5 border border-foreground/20 text-foreground/40 text-xs font-black tracking-widest hover:border-foreground/50 hover:text-foreground/70 transition-all uppercase"
          >
            EXIT
          </button>
        </div>
      </header>

      <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">

        {activeTab === 'log' && (
          <>
            {/* ── STATS CARDS ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-foreground/20">
          <StatCard label="TOTAL LOGGED" value={allDecisions.length.toString()} />
          <StatCard label="THIS MONTH" value={thisMonthCount.toString()} highlight={thisMonthCount > 0} />

          {/* Usage meter strictly checking active paid subscription */}
          <div className={`p-4 border-r border-foreground/10 ${tier === 'free' && monthlyCount >= FREE_LIMIT ? 'bg-red-950/30' : tier === 'free' && monthlyCount >= FREE_LIMIT * 0.8 ? 'bg-yellow-950/20' : ''}`}>
            <div className="text-foreground/40 text-xs tracking-widest uppercase mb-2">
              {tier !== 'free' ? 'PLAN' : 'MONTHLY USAGE'}
            </div>
            
            {tier !== 'free' && rawSub?.status === 'active' ? (
              <div className="space-y-1">
                <div className="text-3xl font-black text-foreground">∞</div>
                <div className="text-foreground/50 text-xs tracking-widest uppercase">
                  Unlimited {tier}
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className={`text-2xl font-black tabular-nums ${monthlyCount >= FREE_LIMIT ? 'text-red-400' : monthlyCount >= FREE_LIMIT * 0.8 ? 'text-yellow-400' : 'text-foreground'}`}>
                    {monthlyCount}
                  </span>
                  <span className="text-foreground/30 text-sm">/ {FREE_LIMIT}</span>
                  <span className="text-foreground/25 text-xs ml-1">this month</span>
                </div>
                {/* Progress bar */}
                <div className="h-1 bg-foreground/10 w-full mb-2">
                  <div
                    className={`h-1 transition-all ${monthlyCount >= FREE_LIMIT ? 'bg-red-400' : monthlyCount >= FREE_LIMIT * 0.8 ? 'bg-yellow-400' : 'bg-foreground/60'}`}
                    style={{ width: `${Math.min(100, (monthlyCount / FREE_LIMIT) * 100)}%` }}
                  />
                </div>
                {monthlyCount >= FREE_LIMIT ? (
                  <button
                    onClick={() => router.push(`/pricing?workspace=${workspaceId}`)}
                    className="text-xs text-red-400 border border-red-400/40 px-2 py-0.5 hover:bg-red-400/10 transition-colors w-full text-center font-mono tracking-wide"
                  >
                    LIMIT REACHED — UPGRADE ↑
                  </button>
                ) : monthlyCount >= FREE_LIMIT * 0.8 ? (
                  <button
                    onClick={() => router.push(`/pricing?workspace=${workspaceId}`)}
                    className="text-xs text-yellow-400/70 border border-yellow-400/20 px-2 py-0.5 hover:bg-yellow-400/10 transition-colors w-full text-center font-mono tracking-wide"
                  >
                    {FREE_LIMIT - monthlyCount} left — upgrade ↑
                  </button>
                ) : null}
              </>
            )}
          </div>
          <div className="p-4 border-l border-foreground/10 last:border-r-0">
            <div className="text-foreground/40 text-xs tracking-widest uppercase mb-2">TOP TAGS</div>
            {topTags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {topTags.map(([tag, count]) => (
                  <button
                    key={tag}
                    onClick={() => setTagFilter(tag === tagFilter ? '' : tag)}
                    className={`text-xs px-1.5 py-0.5 border transition-colors ${
                      tagFilter === tag ? 'border-foreground bg-foreground text-background' : 'border-foreground/20 text-foreground/60 hover:border-foreground/50'
                    }`}
                  >
                    {tag} ({count})
                  </button>
                ))}
              </div>
            ) : (
              <span className="text-foreground/20 text-xs">—</span>
            )}
          </div>
        </div>

        {/* ── CONTROLS ── */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          {/* Search */}
          <div className="flex gap-2 flex-1 w-full sm:w-auto">
            <input
              placeholder="&gt; query memory..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchQuery.trim() && performSearch(searchQuery)}
              className="flex-1 min-w-0 bg-background border border-foreground/30 focus:border-foreground outline-none px-3 py-2 text-foreground text-xs font-mono placeholder:text-foreground/25 transition-colors"
            />
            <button
              onClick={() => searchQuery.trim() ? performSearch(searchQuery) : loadAll()}
              disabled={isPending}
              className="px-4 py-2 border border-foreground text-xs font-black tracking-widest hover:bg-foreground hover:text-background transition-all disabled:opacity-30 uppercase shrink-0"
            >
              {isPending ? '...' : 'FIND'}
            </button>
            {isSearching && (
              <button
                onClick={() => { setSearchQuery(''); loadAll(); }}
                className="px-3 py-2 border border-foreground/30 text-foreground/50 text-xs hover:border-foreground/60 hover:text-foreground transition-all shrink-0"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filters + Add */}
          <div className="flex gap-2 items-center shrink-0">
            <input
              placeholder="filter by tag"
              value={tagFilter}
              onChange={e => setTagFilter(e.target.value)}
              className="w-28 bg-background border border-foreground/20 focus:border-foreground/50 outline-none px-2 py-2 text-foreground text-xs font-mono placeholder:text-foreground/20 transition-colors"
            />
            <select
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value as 'newest' | 'oldest')}
              className="bg-background border border-foreground/20 text-foreground/60 text-xs font-mono px-2 py-2 outline-none focus:border-foreground/50 cursor-pointer"
            >
              <option value="newest">NEWEST</option>
              <option value="oldest">OLDEST</option>
            </select>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-foreground text-background font-black text-xs tracking-widest uppercase border-2 border-foreground hover:bg-background hover:text-foreground transition-all"
            >
              + LOG
            </button>
          </div>
        </div>

        {/* ── EXPORT ROW (Pro only) ── */}
        <div className="flex items-center justify-between border border-foreground/10 px-4 py-2.5">
          <span className="text-xs text-foreground/40 tracking-widest uppercase font-mono">
            {tier === 'pro' ? `Export ${allDecisions.length} decisions` : '⬇ Data Export'}
          </span>
          {tier === 'pro' ? (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (isExporting) return;
                  setIsExporting(true);
                  try {
                    const rows = [
                      ['id', 'date', 'decision', 'tags'],
                      ...allDecisions.map(d => [
                        d.id,
                        new Date(d.created_at).toISOString(),
                        `"${d.text.replace(/"/g, '""')}"`,
                        (d.tags || []).join(';'),
                      ])
                    ];
                    const csv = rows.map(r => r.join(',')).join('\n');
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `opsmem-decisions-${workspaceId}-${new Date().toISOString().split('T')[0]}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  } finally {
                    setIsExporting(false);
                  }
                }}
                disabled={isExporting || allDecisions.length === 0}
                className="px-3 py-1.5 border border-foreground/30 text-foreground/70 text-xs font-black tracking-widest hover:border-foreground hover:text-foreground transition-all uppercase disabled:opacity-30"
              >
                {isExporting ? '...' : '↓ CSV'}
              </button>
              <button
                onClick={() => {
                  if (isExporting) return;
                  setIsExporting(true);
                  try {
                    const data = allDecisions.map(d => ({
                      id: d.id,
                      date: new Date(d.created_at).toISOString(),
                      decision: d.text,
                      tags: d.tags || [],
                    }));
                    const json = JSON.stringify({ workspace_id: workspaceId, exported_at: new Date().toISOString(), total: data.length, decisions: data }, null, 2);
                    const blob = new Blob([json], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `opsmem-decisions-${workspaceId}-${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  } finally {
                    setIsExporting(false);
                  }
                }}
                disabled={isExporting || allDecisions.length === 0}
                className="px-3 py-1.5 border border-foreground/30 text-foreground/70 text-xs font-black tracking-widest hover:border-foreground hover:text-foreground transition-all uppercase disabled:opacity-30"
              >
                {isExporting ? '...' : '↓ JSON'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => router.push(`/pricing?workspace=${workspaceId}`)}
              className="text-xs text-foreground/30 border border-foreground/10 px-3 py-1.5 hover:border-foreground/30 hover:text-foreground/50 transition-all tracking-widest uppercase font-mono"
            >
              🔒 Pro plan only — upgrade ↑
            </button>
          )}
        </div>

        {/* ── TABLE ── */}
        <div className="border border-foreground/20">
          {/* Header */}
          <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2 border-b border-foreground/10 text-xs text-foreground/30 uppercase tracking-widest">
            <span className="col-span-2">Date</span>
            <span className="col-span-6">Decision</span>
            <span className="col-span-2">Tags</span>
            <span className="col-span-1 text-right">Match</span>
            <span className="col-span-1 text-right">Copy</span>
          </div>

          {isPending ? (
            <div className="py-16 text-center text-foreground/30 text-xs tracking-widest animate-pulse">
              QUERYING MEMORY...
            </div>
          ) : paginated.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="text-foreground/20 text-xs tracking-widest">
                {allDecisions.length === 0
                  ? 'NO DECISIONS LOGGED YET'
                  : 'NO RESULTS MATCH YOUR FILTERS'}
              </div>
              {allDecisions.length === 0 && (
                <button
                  onClick={() => setShowModal(true)}
                  className="text-xs border border-foreground/20 px-4 py-2 hover:border-foreground/50 text-foreground/40 hover:text-foreground transition-all"
                >
                  + LOG YOUR FIRST DECISION
                </button>
              )}
            </div>
          ) : (
            paginated.map((d, i) => (
              <div
                key={d.id}
                className={`grid grid-cols-12 gap-3 px-4 py-4 border-b border-foreground/5 hover:bg-foreground/5 transition-colors group ${
                  i === paginated.length - 1 ? 'border-b-0' : ''
                }`}
              >
                <div className="col-span-12 md:col-span-2 text-foreground/35 text-xs self-center">
                  {new Date(d.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                </div>
                <div className="col-span-12 md:col-span-6 text-foreground text-sm self-center leading-relaxed">
                  {d.text}
                </div>
                <div className="col-span-8 md:col-span-2 flex flex-wrap gap-1 self-center">
                  {d.tags?.filter(Boolean).map(tag => (
                    <button
                      key={tag}
                      onClick={() => setTagFilter(tag === tagFilter ? '' : tag)}
                      className={`text-xs px-1.5 border transition-colors ${
                        tagFilter === tag
                          ? 'border-foreground bg-foreground text-background'
                          : 'border-foreground/15 text-foreground/40 hover:border-foreground/40'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <div className="col-span-2 md:col-span-1 text-right self-center">
                  {d.similarity !== undefined && (
                    <span className={`text-xs font-mono font-bold tabular-nums ${
                      d.similarity >= 0.75 ? 'text-green-400' :
                      d.similarity >= 0.65 ? 'text-yellow-400' : 'text-foreground/30'
                    }`}>
                      {(d.similarity * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
                <div className="col-span-2 md:col-span-1 text-right self-center">
                  <button
                    onClick={() => handleCopy(d.id, d.text)}
                    className="text-foreground/20 hover:text-foreground text-xs transition-colors opacity-0 group-hover:opacity-100"
                    title="Copy decision text"
                  >
                    {copiedId === d.id ? '✓' : '⎘'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── PAGINATION ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-foreground/40 font-mono">
            <span>
              SHOWING {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, decisions.length)} OF {decisions.length}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-foreground/20 hover:border-foreground/50 hover:text-foreground disabled:opacity-20 transition-all"
              >
                ←
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`px-3 py-1 border transition-all ${
                    p === currentPage
                      ? 'border-foreground text-foreground bg-foreground/10'
                      : 'border-foreground/20 hover:border-foreground/50 hover:text-foreground'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-foreground/20 hover:border-foreground/50 hover:text-foreground disabled:opacity-20 transition-all"
              >
                →
              </button>
            </div>
          </div>
        )}
          </>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {tier !== 'pro' ? (
              <div className="border border-foreground/20 p-12 text-center flex flex-col items-center justify-center">
                <div className="text-4xl font-black mb-4">🔒</div>
                <h2 className="text-2xl font-black uppercase tracking-widest mb-2">Advanced Analytics</h2>
                <p className="text-foreground/60 text-sm max-w-md mx-auto mb-8 leading-relaxed">
                  Unlock detailed trends, team member insights, top topic breakdown, and PDF/CSV exports with the Pro plan.
                </p>
                <button
                  onClick={() => router.push(`/pricing?workspace=${workspaceId}`)}
                  className="px-6 py-3 bg-foreground text-background font-black text-xs tracking-widest uppercase hover:opacity-80 transition-opacity"
                >
                  UPGRADE TO PRO PLAN
                </button>
              </div>
            ) : (
              <div className="space-y-8 animate-in fade-in duration-300 pb-12">
                {/* Header & Export */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-foreground/10 pb-4">
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-widest">Team Insights</h2>
                    <p className="text-foreground/50 text-xs mt-1">Detailed breakdown of decision data.</p>
                  </div>
                  <div className="flex gap-2 mt-4 sm:mt-0 print:hidden">
                    <button
                      onClick={() => {
                        const rows = [['id', 'date', 'decision', 'tags', 'user_id'], ...allDecisions.map(d => [d.id, new Date(d.created_at).toISOString(), `"${d.text.replace(/"/g, '""')}"`, (d.tags || []).join(';'), d.user_id || ''])];
                        const csv = rows.map(r => r.join(',')).join('\n');
                        const blob = new Blob([csv], { type: 'text/csv' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url; a.download = `analytics-${workspaceId}-${new Date().toISOString().split('T')[0]}.csv`;
                        a.click(); URL.revokeObjectURL(url);
                      }}
                      className="px-3 py-1.5 border border-foreground/30 text-foreground/70 text-xs font-black tracking-widest hover:border-foreground hover:text-foreground transition-all uppercase"
                    >
                      ↓ CSV
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="px-3 py-1.5 border border-foreground/30 text-foreground/70 text-xs font-black tracking-widest hover:border-foreground hover:text-foreground transition-all uppercase"
                    >
                      ↓ PDF
                    </button>
                  </div>
                </div>

                {/* AI Summary */}
                <div className="p-6 border border-foreground/20 bg-foreground/5 relative overflow-hidden shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-shadow">
                  <div className="text-foreground/80 text-xs tracking-widest uppercase mb-2 flex items-center gap-2">
                    <span className="animate-pulse">✨</span> AI INSIGHT SUMMARY
                  </div>
                  <div className="text-lg font-medium leading-relaxed min-h-[1.75rem]">
                    {aiText}
                    <span className="inline-block w-2 bg-foreground h-4 ml-1 animate-pulse"></span>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  {/* Decisions by Member */}
                  <div className="border border-foreground/10 p-6">
                    <div className="text-foreground/40 text-xs tracking-widest uppercase mb-6">Decisions by Member</div>
                    <div className="space-y-5">
                      {(() => {
                        const memberCounts = allDecisions.reduce<Record<string, number>>((acc, d) => {
                          const uid = d.user_id || 'Unknown';
                          acc[uid] = (acc[uid] || 0) + 1;
                          return acc;
                        }, {});
                        const sortedCounts = Object.entries(memberCounts).sort((a, b) => b[1] - a[1]);
                        return sortedCounts.map(([uid, count]) => {
                          const mem = members.find(m => m.id === uid);
                          const displayName = mem?.user_name || mem?.user_email || uid;
                          const pct = Math.round((count / Math.max(allDecisions.length, 1)) * 100);
                          return (
                            <div key={uid} className="flex items-center text-sm gap-3">
                              {/* Dicebear Avatar Injection */}
                              <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`} alt="avatar" className="w-8 h-8 rounded-full bg-foreground/5 p-1 border border-foreground/10" />
                              <div className="w-1/3 truncate pr-2 font-mono" title={displayName}>{displayName}</div>
                              <div className="w-2/3 flex items-center gap-2">
                                <div className="h-2 rounded-sm bg-foreground/90 transition-all duration-1000" style={{ width: `${Math.max(pct, 2)}%` }}></div>
                                <div className="text-foreground/50 text-xs w-8 text-right tabular-nums font-mono">{pct}%</div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {/* Top Tags Breakdown */}
                  <div className="border border-foreground/10 p-6">
                    <div className="text-foreground/40 text-xs tracking-widest uppercase mb-6">Topic Breakdown</div>
                    <div className="space-y-6">
                      {Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([tag, count]) => {
                        const pct = Math.round((count / Math.max(allTags.length, 1)) * 100);
                        return (
                          <div key={tag} className="flex flex-col text-sm gap-1.5">
                            <div className="flex justify-between items-end">
                              <span className="font-mono uppercase text-xs px-2 py-0.5 bg-foreground text-background font-bold tracking-widest">{tag}</span>
                              <span className="text-foreground/50 text-xs tabular-nums font-mono">{pct}%</span>
                            </div>
                            <div className="w-full bg-foreground/10 h-1 rounded-sm overflow-hidden mt-1">
                              <div className="h-full bg-foreground transition-all duration-1000 delay-100" style={{ width: `${Math.max(pct, 2)}%` }}></div>
                            </div>
                          </div>
                        );
                      })}
                      {Object.keys(tagCounts).length === 0 && <div className="text-foreground/40 text-xs">No tags found.</div>}
                    </div>
                  </div>
                </div>

                {/* Trend Chart (Recharts) */}
                <div className="border border-foreground/10 p-6 h-64 flex flex-col">
                  <div className="text-foreground/40 text-xs tracking-widest uppercase mb-4">Activity Trend (Last 12 Weeks)</div>
                  {allDecisions.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-xs text-foreground/40 font-mono">No data to chart</div>
                  ) : (
                    <div className="flex-1 -ml-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorDecisions" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--foreground)" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="var(--foreground)" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="name" stroke="var(--foreground)" opacity={0.3} style={{ fontSize: '10px', fontFamily: 'monospace' }} tickLine={false} axisLine={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--foreground)', color: 'var(--foreground)', borderRadius: '0px', fontFamily: 'monospace', fontSize: '12px' }}
                            itemStyle={{ color: 'var(--foreground)' }}
                            cursor={{ stroke: 'var(--foreground)', strokeWidth: 1, strokeDasharray: '4 4' }}
                          />
                          <Area type="monotone" dataKey="decisions" stroke="var(--foreground)" strokeWidth={2} fillOpacity={1} fill="url(#colorDecisions)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>


      {/* ── LOG MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-background border-2 border-foreground w-full max-w-lg">
            <div className="border-b border-foreground/20 px-6 py-4 flex items-center justify-between">
              <h2 className="font-black tracking-widest uppercase text-sm">[ LOG NEW DECISION ]</h2>
              <button
                onClick={() => { setShowModal(false); setStatusMsg(''); }}
                className="text-foreground/40 hover:text-foreground text-lg transition-colors"
              >×</button>
            </div>
            <form onSubmit={handleLogDecision} className="p-6 space-y-4">
              <div>
                <label className="text-foreground/40 text-xs tracking-widest uppercase block mb-2">DECISION *</label>
                <textarea
                  autoFocus
                  placeholder="What did the team decide?"
                  value={newText}
                  onChange={e => setNewText(e.target.value)}
                  disabled={isPending}
                  rows={4}
                  className="w-full bg-background border border-foreground/30 focus:border-foreground outline-none px-4 py-3 text-foreground text-sm font-mono placeholder:text-foreground/20 resize-none transition-colors"
                />
              </div>
              <div>
                <label className="text-foreground/40 text-xs tracking-widest uppercase block mb-2">TAGS (COMMA SEPARATED)</label>
                <input
                  placeholder="e.g. backend, infra, q2-2025"
                  value={newTags}
                  onChange={e => setNewTags(e.target.value)}
                  disabled={isPending}
                  className="w-full bg-background border border-foreground/30 focus:border-foreground outline-none px-4 py-2 text-foreground text-sm font-mono placeholder:text-foreground/20 transition-colors"
                />
              </div>
              {statusMsg && (
                <p className={`text-xs font-mono ${statusMsg.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>
                  {statusMsg}
                </p>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isPending || !newText.trim()}
                  className="flex-1 py-3 bg-foreground text-background font-black text-xs tracking-widest uppercase hover:bg-background hover:text-foreground border-2 border-foreground transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {isPending ? 'SAVING...' : '[ SAVE DECISION ]'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 border border-foreground/30 text-foreground/40 text-xs font-black tracking-widest hover:border-foreground/60 hover:text-foreground/70 transition-all uppercase"
                >
                  CANCEL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── TEAM MODAL ── */}
      {showTeam && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-background border-2 border-foreground w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="border-b border-foreground/20 px-6 py-4 flex items-center justify-between shrink-0">
              <h2 className="font-black tracking-widest uppercase text-sm">[ YOUR TEAM ]</h2>
              <button onClick={() => { setShowTeam(false); setInviteUrl(''); setInviteCopied(false); }}
                className="text-foreground/40 hover:text-foreground text-lg transition-colors">×</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Member list */}
              <div>
                <div className="text-foreground/40 text-xs tracking-widest uppercase mb-3">
                  MEMBERS ({members.filter(m => m.accepted_at).length} active · {members.filter(m => !m.accepted_at).length} pending)
                </div>
                <div className="space-y-2">
                  {members.length === 0 ? (
                    <div className="text-foreground/25 text-xs py-4 text-center border border-foreground/10">
                      No members yet. Generate an invite link to add teammates.
                    </div>
                  ) : members.map(m => (
                    <div key={m.id} className="flex items-center justify-between px-3 py-2 border border-foreground/10 hover:border-foreground/20 transition-colors">
                      <div>
                        <div className="text-foreground text-xs font-mono">
                          {m.user_name || m.user_email || <span className="text-foreground/30 italic">pending invite</span>}
                        </div>
                        {m.user_email && m.user_name && (
                          <div className="text-foreground/30 text-xs">{m.user_email}</div>
                        )}
                        {m.invited_by && (
                          <div className="text-foreground/20 text-xs">invited by {m.invited_by}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-1.5 border font-mono ${
                          m.role === 'admin'
                            ? 'border-foreground/40 text-foreground/60'
                            : 'border-foreground/15 text-foreground/30'
                        }`}>{m.role}</span>
                        {m.accepted_at ? (
                          <span className="text-green-400 text-xs">✓</span>
                        ) : (
                          <span className="text-yellow-400/60 text-xs">pending</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Invite link generator */}
              <div className="border-t border-foreground/10 pt-6">
                <div className="text-foreground/40 text-xs tracking-widest uppercase mb-3">INVITE A TEAMMATE</div>
                {tier === 'free' ? (
                  <div className="text-center py-6 border border-foreground/10 bg-foreground/5">
                    <div className="text-lg mb-2">🔒</div>
                    <p className="text-foreground/60 text-xs tracking-widest uppercase mb-4">
                      Team Invites require Pro Plan
                    </p>
                    <button
                      onClick={() => router.push(`/pricing?workspace=${workspaceId}`)}
                      className="px-4 py-2 bg-foreground text-background font-black text-xs tracking-widest uppercase hover:opacity-80 transition-opacity"
                    >
                      UPGRADE NOW
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-foreground/30 text-xs mb-4 leading-relaxed">
                      Generate a shareable invite link. Anyone with the link can join this workspace.
                    </p>
                    {!inviteUrl ? (
                      <button
                        onClick={async () => {
                          setIsGeneratingInvite(true);
                          const result = await createInvite(workspaceId!, 'web-dashboard');
                          if (result.success && result.inviteUrl) {
                            setInviteUrl(result.inviteUrl);
                          }
                          setIsGeneratingInvite(false);
                        }}
                        disabled={isGeneratingInvite}
                        className="w-full py-3 border-2 border-foreground text-foreground font-black text-xs tracking-widest uppercase hover:bg-foreground hover:text-background transition-all disabled:opacity-30"
                      >
                        {isGeneratingInvite ? 'GENERATING...' : '[ GENERATE INVITE LINK ]'}
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <div className="border border-foreground/30 px-3 py-2 flex items-center gap-2">
                          <code className="flex-1 text-xs text-foreground/70 font-mono truncate">{inviteUrl}</code>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(inviteUrl);
                              setInviteCopied(true);
                              setTimeout(() => setInviteCopied(false), 2000);
                            }}
                            className="text-xs border border-foreground/30 px-2 py-1 hover:border-foreground/60 hover:text-foreground text-foreground/50 transition-all shrink-0 font-mono"
                          >
                            {inviteCopied ? '✓ COPIED' : 'COPY'}
                          </button>
                        </div>
                        <button
                          onClick={() => { setInviteUrl(''); setInviteCopied(false); }}
                          className="text-xs text-foreground/25 hover:text-foreground/50 transition-colors"
                        >
                          Generate another ↺
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── DANGER ZONE ── */}
      <div className="border-t border-red-500/20 px-6 py-6 mt-8 flex flex-col items-center text-center">
        <h3 className="text-red-500/80 text-xl font-black uppercase tracking-widest mb-2">Danger Zone</h3>
        <p className="text-foreground/40 text-xs max-w-md mb-4">
          Permanently erase all decisions, tags, and subscriptions tied to this workspace. This action cannot be undone.
        </p>
        <button
          onClick={async () => {
            const confirmFirst = window.confirm('WARNING: This will permanently wipe your entire OpsMem workspace data (decisions, teammates, and tags). Are you completely sure you want to proceed?');
            if (!confirmFirst) return;
            const confirmSecond = window.confirm('FINAL WARNING: This cannot be undone. Click OK to permanently delete all data.');
            if (!confirmSecond) return;
            
            const res = await deleteWorkspaceData(workspaceId!);
            if (res.success) {
              window.alert('Workspace data has been permanently deleted.');
              router.push('/');
            } else {
              window.alert('Error deleting data: ' + res.error);
            }
          }}
          className="px-6 py-3 border-2 border-red-500/50 text-red-500 text-xs font-black tracking-widest uppercase hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors"
        >
          [ DELETE DATA ]
        </button>
      </div>

      {/* ── FOOTER ── */}
      <footer className="border-t border-foreground/10 px-6 py-4 text-center text-foreground/15 text-xs tracking-widest uppercase">
        OPSMEM · {workspaceId} · POWERED BY OPENAI + SUPABASE
      </footer>
    </div>
  );
}

function StatCard({ label, value, sub, highlight }: {
  label: string; value: string; sub?: string; highlight?: boolean;
}) {
  return (
    <div className={`p-4 border-r border-foreground/10 last:border-r-0 ${highlight ? 'bg-foreground/5' : ''}`}>
      <div className="text-foreground/40 text-xs tracking-widest uppercase mb-2">{label}</div>
      <div className={`text-3xl font-black tabular-nums ${highlight ? 'text-foreground' : 'text-foreground/80'}`}>
        {value}
      </div>
      {sub && <div className="text-foreground/20 text-xs mt-0.5">{sub}</div>}
    </div>
  );
}
