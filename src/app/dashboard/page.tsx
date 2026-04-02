"use client";

import { useState, useTransition, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { logDecision, searchDecisions } from '@/app/actions/decisions';

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading Dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const workspaceId = searchParams.get('workspace');
  const userId = 'U_WEB_DASHBOARD'; // Static tag for Web UI origin

  const [searchQuery, setSearchQuery] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [decisions, setDecisions] = useState<any[]>([]);
  const [isPending, startTransition] = useTransition();

  const [newText, setNewText] = useState('');
  const [newTags, setNewTags] = useState('');

  const performSearch = async (query: string = '') => {
    if (!workspaceId) return;
    startTransition(async () => {
      // Basic empty fallback queries semantic database generically if empty
      const targetQuery = query.trim() || 'all architecture decisions and plans';
      const result = await searchDecisions(targetQuery, workspaceId);
      if (result.success && result.data) {
        setDecisions(result.data);
      } else {
        setDecisions([]);
      }
    });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    performSearch();
  }, [workspaceId]);

  const handleLogDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim() || !workspaceId) return;

    startTransition(async () => {
      const tagsArray = newTags.split(',').map(t => t.trim()).filter(Boolean);
      const result = await logDecision(newText, workspaceId, userId, tagsArray, {});
      
      if (result.success) {
        setNewText('');
        setNewTags('');
        performSearch(searchQuery); 
      } else {
        if (result.requiresUpgrade) {
          alert("Free plan limit reached (10 decisions/month). Redirecting to upgrade...");
          router.push(`/pricing?workspace=${workspaceId}`);
        } else {
          alert(`Error logging decision: ${result.error}`);
        }
      }
    });
  };

  if (!workspaceId) {
    return (
      <div className="flex h-screen w-full items-center justify-center p-8 text-center bg-slate-50">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">Workspace Context Missing</h2>
          <p className="text-slate-500">Please add your Slack workspace ID to the URL like this:</p>
          <code className="bg-slate-200 px-4 py-2 rounded text-slate-800 font-mono">/dashboard?workspace=YOUR_TEAM_ID</code>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 max-w-5xl space-y-8">
      <div className="flex items-center justify-between bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">OpsMem MVP</h1>
          <p className="text-slate-500 mt-1">
            Workspace Context: <Badge variant="secondary" className="ml-1">{workspaceId}</Badge>
            <Badge variant="outline" className="ml-2 text-slate-400">Basic Plan</Badge>
          </p>
        </div>
        <Button onClick={() => router.push(`/pricing?workspace=${workspaceId}`)} className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md">
          Upgrade to Pro
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Log New Decision</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogDecision} className="space-y-4">
            <div className="flex gap-4">
              <Input 
                placeholder="What did we decide? (e.g., 'Switch to Grok embeddings')" 
                value={newText} 
                onChange={e => setNewText(e.target.value)} 
                className="flex-1"
                disabled={isPending}
              />
              <Input 
                placeholder="Tags (comma separated)" 
                value={newTags} 
                onChange={e => setNewTags(e.target.value)} 
                className="w-1/4"
                disabled={isPending}
              />
              <Button type="submit" disabled={isPending || !newText.trim()}>Save</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Decision Intel Repository</CardTitle>
          <div className="flex w-1/2 space-x-2">
            <Input 
              placeholder="Query semantic memory..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && performSearch(searchQuery)}
            />
            <Button variant="secondary" onClick={() => performSearch(searchQuery)} disabled={isPending}>Search</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="w-3/5">Decision Log</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="text-right">Match Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {decisions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                    {isPending ? 'Searching the hive mind...' : 'No relevant decisions found for this query.'}
                  </TableCell>
                </TableRow>
              ) : (
                decisions.map(d => (
                  <TableRow key={d.id}>
                    <TableCell className="whitespace-nowrap font-medium text-slate-500">
                      {new Date(d.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-slate-800 font-medium">{d.text}</TableCell>
                    <TableCell>
                      <div className="flex gap-2 flex-wrap">
                        {d.tags && d.tags.map((tag: string) => (
                          <Badge key={tag} variant="secondary" className="text-xs bg-slate-100">{tag}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={`text-xs ${(d.similarity * 100) > 85 ? 'text-green-600 bg-green-50' : 'text-slate-500'}`}>
                        {d.similarity ? `${(d.similarity * 100).toFixed(1)}%` : '---'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
