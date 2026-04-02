"use client";

import { useState, useTransition, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { logDecision, searchDecisions } from '@/app/actions/decisions';

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black text-white flex items-center justify-center font-mono tracking-widest">
        LOADING...
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

  const [searchQuery, setSearchQuery] = useState('');
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [isPending, startTransition] = useTransition();
  const [newText, setNewText] = useState('');
  const [newTags, setNewTags] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  const performSearch = async (query: string = '') => {
    if (!workspaceId) return;
    startTransition(async () => {
      const targetQuery = query.trim() || 'all architecture decisions and plans';
      const result = await searchDecisions(targetQuery, workspaceId);
      if (result.success && result.data) {
        setDecisions(result.data as Decision[]);
      } else {
        setDecisions([]);
      }
    });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { performSearch(); }, [workspaceId]);

  const handleLogDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim() || !workspaceId) return;
    startTransition(async () => {
      const tagsArray = newTags.split(',').map(t => t.trim()).filter(Boolean);
      const result = await logDecision(newText, workspaceId, userId, tagsArray, {});
      if (result.success) {
        setNewText('');
        setNewTags('');
        setStatusMsg('✓ Decision logged.');
        setTimeout(() => setStatusMsg(''), 3000);
        performSearch(searchQuery);
      } else if (result.requiresUpgrade) {
        router.push(`/pricing?workspace=${workspaceId}`);
      } else {
        setStatusMsg(`✗ Error: ${result.error}`);
      }
    });
  };

  if (!workspaceId) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-8 font-mono">
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
    <div className="min-h-screen bg-black text-white" style={{ fontFamily: '"Courier New", Courier, monospace' }}>

      {/* Header */}
      <header className="border-b-4 border-white px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Image src="/opsmem.png" alt="OpsMem" width={36} height={36} style={{ imageRendering: 'pixelated', filter: 'invert(1)' }} />
          <span className="font-black text-lg tracking-widest uppercase">OPSMEM</span>
          <span className="text-white/40 text-xs border border-white/20 px-2 py-1">{workspaceId}</span>
        </div>
        <button
          onClick={() => router.push(`/pricing?workspace=${workspaceId}`)}
          className="px-4 py-2 border-2 border-white text-xs font-black tracking-widest hover:bg-white hover:text-black transition-all uppercase"
        >
          [ UPGRADE TO PRO ]
        </button>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">

        {/* Log Decision */}
        <section className="border-2 border-white/40 p-6">
          <h2 className="text-xs tracking-widest text-white/50 uppercase mb-4">&gt; LOG NEW DECISION</h2>
          <form onSubmit={handleLogDecision} className="space-y-3">
            <textarea
              placeholder="What did the team decide? (e.g. 'We are switching to OpenAI embeddings')"
              value={newText}
              onChange={e => setNewText(e.target.value)}
              disabled={isPending}
              rows={2}
              className="w-full bg-black border-2 border-white/30 focus:border-white outline-none px-4 py-3 text-white text-sm font-mono placeholder:text-white/25 resize-none transition-colors"
            />
            <div className="flex gap-3">
              <input
                placeholder="tags: comma, separated"
                value={newTags}
                onChange={e => setNewTags(e.target.value)}
                disabled={isPending}
                className="flex-1 bg-black border-2 border-white/30 focus:border-white outline-none px-4 py-2 text-white text-sm font-mono placeholder:text-white/25 transition-colors"
              />
              <button
                type="submit"
                disabled={isPending || !newText.trim()}
                className="px-6 py-2 bg-white text-black font-black text-xs tracking-widest uppercase border-2 border-white hover:bg-black hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {isPending ? 'SAVING...' : '[ SAVE ]'}
              </button>
            </div>
            {statusMsg && (
              <p className={`text-xs font-mono ${statusMsg.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>
                {statusMsg}
              </p>
            )}
          </form>
        </section>

        {/* Search */}
        <section className="border-2 border-white/40 p-6">
          <h2 className="text-xs tracking-widest text-white/50 uppercase mb-4">&gt; SEMANTIC SEARCH</h2>
          <div className="flex gap-3">
            <input
              placeholder="Query memory... (e.g. 'what did we decide about the database?')"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && performSearch(searchQuery)}
              className="flex-1 bg-black border-2 border-white/30 focus:border-white outline-none px-4 py-2 text-white text-sm font-mono placeholder:text-white/25 transition-colors"
            />
            <button
              onClick={() => performSearch(searchQuery)}
              disabled={isPending}
              className="px-6 py-2 border-2 border-white text-xs font-black tracking-widest uppercase hover:bg-white hover:text-black transition-all disabled:opacity-30"
            >
              {isPending ? '...' : '[ FIND ]'}
            </button>
          </div>
        </section>

        {/* Results Table */}
        <section className="border-2 border-white/40">
          <div className="border-b border-white/20 px-6 py-3 grid grid-cols-12 gap-4 text-xs text-white/40 uppercase tracking-widest">
            <span className="col-span-2">Date</span>
            <span className="col-span-7">Decision</span>
            <span className="col-span-2">Tags</span>
            <span className="col-span-1 text-right">Match</span>
          </div>

          {isPending ? (
            <div className="px-6 py-12 text-center text-white/40 text-xs tracking-widest animate-pulse">
              QUERYING MEMORY...
            </div>
          ) : decisions.length === 0 ? (
            <div className="px-6 py-12 text-center text-white/30 text-xs tracking-widest">
              NO DECISIONS FOUND — LOG YOUR FIRST DECISION ABOVE
            </div>
          ) : (
            decisions.map((d) => (
              <div key={d.id} className="border-b border-white/10 px-6 py-4 grid grid-cols-12 gap-4 hover:bg-white/5 transition-colors">
                <span className="col-span-2 text-white/40 text-xs self-center">
                  {new Date(d.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                </span>
                <span className="col-span-7 text-white text-sm self-center leading-relaxed">{d.text}</span>
                <div className="col-span-2 flex flex-wrap gap-1 self-center">
                  {d.tags?.map((tag: string) => (
                    <span key={tag} className="text-white/50 text-xs border border-white/20 px-1">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="col-span-1 text-right self-center">
                  {d.similarity !== undefined && (
                    <span className={`text-xs font-mono font-bold ${
                      d.similarity >= 0.75 ? 'text-green-400' :
                      d.similarity >= 0.65 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {(d.similarity * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </section>

      </div>
    </div>
  );
}
