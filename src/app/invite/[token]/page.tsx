"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { ThemeToggle } from '@/components/theme-toggle';
import { getInviteByToken, acceptInvite } from '@/app/actions/team';

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [step, setStep] = useState<'loading' | 'form' | 'error' | 'success'>('loading');
  const [invite, setInvite] = useState<{ workspace_id: string; invited_by: string | null } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    async function load() {
      const result = await getInviteByToken(token);
      if (result.success && result.data) {
        setInvite({ workspace_id: result.data.workspace_id, invited_by: result.data.invited_by });
        setStep('form');
      } else {
        setErrorMsg(result.error || 'Invalid invite link.');
        setStep('error');
      }
    }
    load();
  }, [token]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setIsPending(true);
    const result = await acceptInvite(token, email.trim(), name.trim());
    if (result.success && result.workspaceId) {
      setStep('success');
      setTimeout(() => router.push(`/dashboard?workspace=${result.workspaceId}`), 1500);
    } else {
      setErrorMsg(result.error || 'Failed to join workspace.');
      setStep('error');
    }
    setIsPending(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-8"
      style={{ fontFamily: '"Courier New", Courier, monospace' }}>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <Image src="/opsmem-logo.png" alt="OpsMem" width={60} height={60}
            className="th-logo" style={{ imageRendering: 'pixelated', display: 'inline-block' }} />
          <div className="mt-3 font-black text-lg tracking-widest">OPSMEM</div>
        </div>

        {step === 'loading' && (
          <div className="border-2 border-foreground/20 p-8 text-center text-foreground/40 text-xs tracking-widest animate-pulse">
            VERIFYING INVITE...
          </div>
        )}

        {step === 'error' && (
          <div className="border-2 border-red-400/40 p-8 text-center space-y-4">
            <div className="text-red-400 font-black text-sm tracking-widest">[ INVITE INVALID ]</div>
            <p className="text-foreground/50 text-xs leading-relaxed">{errorMsg}</p>
            <button onClick={() => router.push('/')}
              className="text-xs border border-foreground/20 px-4 py-2 hover:border-foreground/50 hover:text-foreground transition-all text-foreground/40">
              ← Go Home
            </button>
          </div>
        )}

        {step === 'form' && invite && (
          <div className="border-2 border-foreground">
            <div className="border-b border-foreground/20 px-6 py-4">
              <div className="text-xs text-foreground/40 tracking-widest uppercase mb-1">You&apos;ve been invited to</div>
              <div className="font-black text-lg tracking-wider">
                Workspace: <span className="border border-foreground/30 px-2 py-0.5 text-sm">{invite.workspace_id}</span>
              </div>
              {invite.invited_by && (
                <div className="text-foreground/30 text-xs mt-1">by {invite.invited_by}</div>
              )}
            </div>

            <div className="p-6 flex flex-col items-center justify-center space-y-4">
              <p className="text-foreground/50 text-xs text-center leading-relaxed mb-4">
                You must connect your Slack account to join the workspace and log decisions.
              </p>
              <a
                href={`https://slack.com/oauth/v2/authorize?client_id=10826535322675.10861212633408&scope=commands,chat:write&user_scope=&state=${token}`}
                className="w-full text-center py-3 bg-foreground text-background font-black text-xs tracking-widest uppercase hover:bg-background hover:text-foreground border-2 border-foreground transition-all"
              >
                [ ACCEPT VIA SLACK ]
              </a>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="border-2 border-green-400/50 p-8 text-center space-y-3">
            <div className="text-green-400 font-black text-2xl">✓</div>
            <div className="font-black text-sm tracking-widest text-green-400">JOINED SUCCESSFULLY</div>
            <p className="text-foreground/40 text-xs">Redirecting to your dashboard...</p>
          </div>
        )}
      </div>
    </div>
  );
}
