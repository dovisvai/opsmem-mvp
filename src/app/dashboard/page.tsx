"use client";

import { useState, useTransition, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { logDecision, searchDecisions, getAllDecisions, getMonthlyUsage } from '@/app/actions/decisions';
import { getWorkspaceMembers, createInvite, WorkspaceMember } from '@/app/actions/team';

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black text-white flex items-center justify-center font-mono tracking-widest animate-pulse">
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
  const [isPro, setIsPro] = useState(false);
  const [isRefreshingPlan, setIsRefreshingPlan] = useState(false);
  const FREE_LIMIT = 25;

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [newText, setNewText] = useState('');
  const [newTags, setNewTags] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
      const usageResult = await getMonthlyUsage(workspaceId);
      if (usageResult.success) {
        setMonthlyCount(usageResult.count);
        setIsPro(usageResult.isPro);
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

  if (!workspaceId) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-8" style={{ fontFamily: '"Courier New", Courier, monospace' }}>
        <div className="border-4 border-white p-10 text-center max-w-lg">
          <div className="text-4xl font-black mb-6 tracking-widest">[ NO WORKSPACE ]</div>
          <p className="text-white/60 text-sm mb-6 leading-relaxed">
            Add your Slack workspace ID to the URL to access your decision memory.
          </p>
          <code className="bg-white text-black px-4 py-2 text-xs font-mono block">
            /dashboard?workspace=YOUR_TEAM_ID
          </code>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col" style={{ fontFamily: '"Courier New", Courier, monospace' }}>

      {/* ── NAV ── */}
      <header className="border-b-2 border-white/30 px-6 py-3 flex items-center justify-between sticky top-0 bg-black z-40">
        <div className="flex items-center gap-4">
          <Image
            src="/opsmem-logo.png"
            alt="OpsMem"
            width={32}
            height={32}
            style={{ imageRendering: 'pixelated', filter: 'invert(1)' }}
          />
          <span className="font-black text-base tracking-widest uppercase hidden sm:inline">OPSMEM</span>
          <span className="text-white/20 hidden sm:inline">|</span>
          <span className="text-white/50 text-xs tracking-widest uppercase">Dashboard</span>
          <span className="text-white/25 text-xs border border-white/20 px-2 py-0.5 hidden sm:inline">{workspaceId}</span>
        </div>
        <div className="flex items-center gap-3">
          {statusMsg && (
            <span className={`text-xs font-mono ${statusMsg.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>
              {statusMsg}
            </span>
          )}
          {isPro ? (
            <>
              <span className="px-3 py-1.5 border border-white/40 bg-white text-black text-xs font-black tracking-widest uppercase hidden sm:inline-flex items-center gap-1">
                ∞ PRO
              </span>
              <button
                onClick={refreshPlan}
                disabled={isRefreshingPlan}
                title="Refresh plan status"
                className="px-3 py-1.5 border border-white/20 text-white/40 text-xs font-black tracking-widest hover:border-white/50 hover:text-white/70 transition-all uppercase hidden sm:block disabled:opacity-30"
              >
                {isRefreshingPlan ? '...' : '↺'}
              </button>
            </>
          ) : (
            <button
              onClick={() => router.push(`/pricing?workspace=${workspaceId}`)}
              className="px-3 py-1.5 border border-white/30 text-white/60 text-xs font-black tracking-widest hover:border-white hover:text-white transition-all uppercase hidden sm:block"
            >
              ↑ PRO
            </button>
          )}
          <button
            onClick={() => setShowTeam(true)}
            className="px-3 py-1.5 border border-white/30 text-white/60 text-xs font-black tracking-widest hover:border-white hover:text-white transition-all uppercase hidden sm:block"
          >
            TEAM {members.filter(m => m.accepted_at).length > 0 ? `(${members.filter(m => m.accepted_at).length})` : ''}
          </button>
          <button
            onClick={() => router.push('/')}
            className="px-3 py-1.5 border border-white/20 text-white/40 text-xs font-black tracking-widest hover:border-white/50 hover:text-white/70 transition-all uppercase"
          >
            EXIT
          </button>
        </div>
      </header>

      <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">

        {/* ── STATS CARDS ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-white/20">
          <StatCard label="TOTAL LOGGED" value={allDecisions.length.toString()} />
          <StatCard label="THIS MONTH" value={thisMonthCount.toString()} highlight={thisMonthCount > 0} />

          {/* Usage meter */}
          <div className={`p-4 border-r border-white/10 ${!isPro && monthlyCount >= FREE_LIMIT ? 'bg-red-950/30' : !isPro && monthlyCount >= FREE_LIMIT * 0.8 ? 'bg-yellow-950/20' : ''}`}>
            <div className="text-white/40 text-xs tracking-widest uppercase mb-2">
              {isPro ? 'PLAN' : 'MONTHLY USAGE'}
            </div>
            {isPro ? (
              <div className="space-y-1">
                <div className="text-3xl font-black text-white">∞</div>
                <div className="text-white/50 text-xs tracking-widest uppercase">Unlimited</div>
              </div>
            ) : (
              <>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className={`text-2xl font-black tabular-nums ${monthlyCount >= FREE_LIMIT ? 'text-red-400' : monthlyCount >= FREE_LIMIT * 0.8 ? 'text-yellow-400' : 'text-white'}`}>
                    {monthlyCount}
                  </span>
                  <span className="text-white/30 text-sm">/ {FREE_LIMIT}</span>
                  <span className="text-white/25 text-xs ml-1">this month</span>
                </div>
                {/* Progress bar */}
                <div className="h-1 bg-white/10 w-full mb-2">
                  <div
                    className={`h-1 transition-all ${monthlyCount >= FREE_LIMIT ? 'bg-red-400' : monthlyCount >= FREE_LIMIT * 0.8 ? 'bg-yellow-400' : 'bg-white/60'}`}
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
          <div className="p-4 border-l border-white/10 last:border-r-0">
            <div className="text-white/40 text-xs tracking-widest uppercase mb-2">TOP TAGS</div>
            {topTags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {topTags.map(([tag, count]) => (
                  <button
                    key={tag}
                    onClick={() => setTagFilter(tag === tagFilter ? '' : tag)}
                    className={`text-xs px-1.5 py-0.5 border transition-colors ${
                      tagFilter === tag ? 'border-white bg-white text-black' : 'border-white/20 text-white/60 hover:border-white/50'
                    }`}
                  >
                    {tag} ({count})
                  </button>
                ))}
              </div>
            ) : (
              <span className="text-white/20 text-xs">—</span>
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
              className="flex-1 min-w-0 bg-black border border-white/30 focus:border-white outline-none px-3 py-2 text-white text-xs font-mono placeholder:text-white/25 transition-colors"
            />
            <button
              onClick={() => searchQuery.trim() ? performSearch(searchQuery) : loadAll()}
              disabled={isPending}
              className="px-4 py-2 border border-white text-xs font-black tracking-widest hover:bg-white hover:text-black transition-all disabled:opacity-30 uppercase shrink-0"
            >
              {isPending ? '...' : 'FIND'}
            </button>
            {isSearching && (
              <button
                onClick={() => { setSearchQuery(''); loadAll(); }}
                className="px-3 py-2 border border-white/30 text-white/50 text-xs hover:border-white/60 hover:text-white transition-all shrink-0"
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
              className="w-28 bg-black border border-white/20 focus:border-white/50 outline-none px-2 py-2 text-white text-xs font-mono placeholder:text-white/20 transition-colors"
            />
            <select
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value as 'newest' | 'oldest')}
              className="bg-black border border-white/20 text-white/60 text-xs font-mono px-2 py-2 outline-none focus:border-white/50 cursor-pointer"
            >
              <option value="newest">NEWEST</option>
              <option value="oldest">OLDEST</option>
            </select>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-white text-black font-black text-xs tracking-widest uppercase border-2 border-white hover:bg-black hover:text-white transition-all"
            >
              + LOG
            </button>
          </div>
        </div>

        {/* ── TABLE ── */}
        <div className="border border-white/20">
          {/* Header */}
          <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2 border-b border-white/10 text-xs text-white/30 uppercase tracking-widest">
            <span className="col-span-2">Date</span>
            <span className="col-span-6">Decision</span>
            <span className="col-span-2">Tags</span>
            <span className="col-span-1 text-right">Match</span>
            <span className="col-span-1 text-right">Copy</span>
          </div>

          {isPending ? (
            <div className="py-16 text-center text-white/30 text-xs tracking-widest animate-pulse">
              QUERYING MEMORY...
            </div>
          ) : paginated.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="text-white/20 text-xs tracking-widest">
                {allDecisions.length === 0
                  ? 'NO DECISIONS LOGGED YET'
                  : 'NO RESULTS MATCH YOUR FILTERS'}
              </div>
              {allDecisions.length === 0 && (
                <button
                  onClick={() => setShowModal(true)}
                  className="text-xs border border-white/20 px-4 py-2 hover:border-white/50 text-white/40 hover:text-white transition-all"
                >
                  + LOG YOUR FIRST DECISION
                </button>
              )}
            </div>
          ) : (
            paginated.map((d, i) => (
              <div
                key={d.id}
                className={`grid grid-cols-12 gap-3 px-4 py-4 border-b border-white/5 hover:bg-white/5 transition-colors group ${
                  i === paginated.length - 1 ? 'border-b-0' : ''
                }`}
              >
                <div className="col-span-12 md:col-span-2 text-white/35 text-xs self-center">
                  {new Date(d.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                </div>
                <div className="col-span-12 md:col-span-6 text-white text-sm self-center leading-relaxed">
                  {d.text}
                </div>
                <div className="col-span-8 md:col-span-2 flex flex-wrap gap-1 self-center">
                  {d.tags?.filter(Boolean).map(tag => (
                    <button
                      key={tag}
                      onClick={() => setTagFilter(tag === tagFilter ? '' : tag)}
                      className={`text-xs px-1.5 border transition-colors ${
                        tagFilter === tag
                          ? 'border-white bg-white text-black'
                          : 'border-white/15 text-white/40 hover:border-white/40'
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
                      d.similarity >= 0.65 ? 'text-yellow-400' : 'text-white/30'
                    }`}>
                      {(d.similarity * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
                <div className="col-span-2 md:col-span-1 text-right self-center">
                  <button
                    onClick={() => handleCopy(d.id, d.text)}
                    className="text-white/20 hover:text-white text-xs transition-colors opacity-0 group-hover:opacity-100"
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
          <div className="flex items-center justify-between text-xs text-white/40 font-mono">
            <span>
              SHOWING {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, decisions.length)} OF {decisions.length}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-white/20 hover:border-white/50 hover:text-white disabled:opacity-20 transition-all"
              >
                ←
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`px-3 py-1 border transition-all ${
                    p === currentPage
                      ? 'border-white text-white bg-white/10'
                      : 'border-white/20 hover:border-white/50 hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-white/20 hover:border-white/50 hover:text-white disabled:opacity-20 transition-all"
              >
                →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── LOG MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-black border-2 border-white w-full max-w-lg">
            <div className="border-b border-white/20 px-6 py-4 flex items-center justify-between">
              <h2 className="font-black tracking-widest uppercase text-sm">[ LOG NEW DECISION ]</h2>
              <button
                onClick={() => { setShowModal(false); setStatusMsg(''); }}
                className="text-white/40 hover:text-white text-lg transition-colors"
              >×</button>
            </div>
            <form onSubmit={handleLogDecision} className="p-6 space-y-4">
              <div>
                <label className="text-white/40 text-xs tracking-widest uppercase block mb-2">DECISION *</label>
                <textarea
                  autoFocus
                  placeholder="What did the team decide?"
                  value={newText}
                  onChange={e => setNewText(e.target.value)}
                  disabled={isPending}
                  rows={4}
                  className="w-full bg-black border border-white/30 focus:border-white outline-none px-4 py-3 text-white text-sm font-mono placeholder:text-white/20 resize-none transition-colors"
                />
              </div>
              <div>
                <label className="text-white/40 text-xs tracking-widest uppercase block mb-2">TAGS (COMMA SEPARATED)</label>
                <input
                  placeholder="e.g. backend, infra, q2-2025"
                  value={newTags}
                  onChange={e => setNewTags(e.target.value)}
                  disabled={isPending}
                  className="w-full bg-black border border-white/30 focus:border-white outline-none px-4 py-2 text-white text-sm font-mono placeholder:text-white/20 transition-colors"
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
                  className="flex-1 py-3 bg-white text-black font-black text-xs tracking-widest uppercase hover:bg-black hover:text-white border-2 border-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {isPending ? 'SAVING...' : '[ SAVE DECISION ]'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 border border-white/30 text-white/40 text-xs font-black tracking-widest hover:border-white/60 hover:text-white/70 transition-all uppercase"
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
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-black border-2 border-white w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="border-b border-white/20 px-6 py-4 flex items-center justify-between shrink-0">
              <h2 className="font-black tracking-widest uppercase text-sm">[ YOUR TEAM ]</h2>
              <button onClick={() => { setShowTeam(false); setInviteUrl(''); setInviteCopied(false); }}
                className="text-white/40 hover:text-white text-lg transition-colors">×</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Member list */}
              <div>
                <div className="text-white/40 text-xs tracking-widest uppercase mb-3">
                  MEMBERS ({members.filter(m => m.accepted_at).length} active · {members.filter(m => !m.accepted_at).length} pending)
                </div>
                <div className="space-y-2">
                  {members.length === 0 ? (
                    <div className="text-white/25 text-xs py-4 text-center border border-white/10">
                      No members yet. Generate an invite link to add teammates.
                    </div>
                  ) : members.map(m => (
                    <div key={m.id} className="flex items-center justify-between px-3 py-2 border border-white/10 hover:border-white/20 transition-colors">
                      <div>
                        <div className="text-white text-xs font-mono">
                          {m.user_name || m.user_email || <span className="text-white/30 italic">pending invite</span>}
                        </div>
                        {m.user_email && m.user_name && (
                          <div className="text-white/30 text-xs">{m.user_email}</div>
                        )}
                        {m.invited_by && (
                          <div className="text-white/20 text-xs">invited by {m.invited_by}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-1.5 border font-mono ${
                          m.role === 'admin'
                            ? 'border-white/40 text-white/60'
                            : 'border-white/15 text-white/30'
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
              <div className="border-t border-white/10 pt-6">
                <div className="text-white/40 text-xs tracking-widest uppercase mb-3">INVITE A TEAMMATE</div>
                <p className="text-white/30 text-xs mb-4 leading-relaxed">
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
                    className="w-full py-3 border-2 border-white text-white font-black text-xs tracking-widest uppercase hover:bg-white hover:text-black transition-all disabled:opacity-30"
                  >
                    {isGeneratingInvite ? 'GENERATING...' : '[ GENERATE INVITE LINK ]'}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="border border-white/30 px-3 py-2 flex items-center gap-2">
                      <code className="flex-1 text-xs text-white/70 font-mono truncate">{inviteUrl}</code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(inviteUrl);
                          setInviteCopied(true);
                          setTimeout(() => setInviteCopied(false), 2000);
                        }}
                        className="text-xs border border-white/30 px-2 py-1 hover:border-white/60 hover:text-white text-white/50 transition-all shrink-0 font-mono"
                      >
                        {inviteCopied ? '✓ COPIED' : 'COPY'}
                      </button>
                    </div>
                    <button
                      onClick={() => { setInviteUrl(''); setInviteCopied(false); }}
                      className="text-xs text-white/25 hover:text-white/50 transition-colors"
                    >
                      Generate another ↺
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/10 px-6 py-4 text-center text-white/15 text-xs tracking-widest uppercase">
        OPSMEM · {workspaceId} · POWERED BY OPENAI + SUPABASE
      </footer>
    </div>
  );
}

function StatCard({ label, value, sub, highlight }: {
  label: string; value: string; sub?: string; highlight?: boolean;
}) {
  return (
    <div className={`p-4 border-r border-white/10 last:border-r-0 ${highlight ? 'bg-white/5' : ''}`}>
      <div className="text-white/40 text-xs tracking-widest uppercase mb-2">{label}</div>
      <div className={`text-3xl font-black tabular-nums ${highlight ? 'text-white' : 'text-white/80'}`}>
        {value}
      </div>
      {sub && <div className="text-white/20 text-xs mt-0.5">{sub}</div>}
    </div>
  );
}
