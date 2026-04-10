'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { z } from 'zod';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://opsmem.com';

export type WorkspaceMember = {
  id: string;
  workspace_id: string;
  user_email: string | null;
  user_name: string | null;
  role: 'admin' | 'member';
  invited_by: string | null;
  invite_token: string;
  accepted_at: string | null;
  created_at: string;
};

// Fetch all members for a workspace (accepted + pending)
export async function getWorkspaceMembers(workspaceId: string) {
  try {
    const db = createAdminClient();
    const { data, error } = await db
      .from('workspace_members')
      .select('id, workspace_id, user_email, user_name, role, invited_by, invite_token, accepted_at, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return { success: true, data: (data || []) as WorkspaceMember[] };
  } catch (error: unknown) {
    return { success: false, data: [], error: error instanceof Error ? error.message : String(error) };
  }
}

// Generate a new invite link for a workspace.
// Creates a pending member row with a unique token.
export async function createInvite(workspaceId: string, invitedBy: string) {
  try {
    const schema = z.object({ workspaceId: z.string().min(1), invitedBy: z.string().min(1) });
    const parsed = schema.safeParse({ workspaceId, invitedBy });
    if (!parsed.success) return { success: false, error: 'Invalid parameters.' };

    const db = createAdminClient();
    const { data, error } = await db
      .from('workspace_members')
      .insert({ workspace_id: workspaceId, invited_by: invitedBy, role: 'member' })
      .select('invite_token')
      .single();

    if (error) throw error;
    const inviteUrl = `${siteUrl}/invite/${data.invite_token}`;
    return { success: true, inviteUrl, token: data.invite_token };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// Look up an invite token — returns workspace_id if valid and not yet accepted.
export async function getInviteByToken(token: string) {
  try {
    const db = createAdminClient();
    const { data, error } = await db
      .from('workspace_members')
      .select('id, workspace_id, accepted_at, invited_by')
      .eq('invite_token', token)
      .single();

    if (error || !data) return { success: false, error: 'Invite not found or expired.' };
    if (data.accepted_at) return { success: false, error: 'This invite has already been used.' };
    return { success: true, data };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// Accept an invite — fills in user details and marks accepted.
export async function acceptInvite(token: string, email: string, name: string) {
  try {
    const schema = z.object({
      token: z.string().uuid(),
      email: z.string().email(),
      name: z.string().min(1).max(100),
    });
    const parsed = schema.safeParse({ token, email, name });
    if (!parsed.success) return { success: false, error: 'Invalid invite details.' };

    const db = createAdminClient();

    // Check invite is valid
    const { data: invite, error: fetchErr } = await db
      .from('workspace_members')
      .select('id, workspace_id, accepted_at')
      .eq('invite_token', token)
      .single();

    if (fetchErr || !invite) return { success: false, error: 'Invite not found.' };
    if (invite.accepted_at) return { success: false, error: 'Invite already used.' };

    // Check if this email is already a member of this workspace
    const { data: existing } = await db
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', invite.workspace_id)
      .eq('user_email', parsed.data.email)
      .not('accepted_at', 'is', null)
      .maybeSingle();

    if (existing) return { success: false, error: 'You are already a member of this workspace.' };

    // Mark invite as accepted
    const { error: updateErr } = await db
      .from('workspace_members')
      .update({
        user_email: parsed.data.email,
        user_name: parsed.data.name,
        accepted_at: new Date().toISOString(),
      })
      .eq('invite_token', token);

    if (updateErr) throw updateErr;
    return { success: true, workspaceId: invite.workspace_id };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
