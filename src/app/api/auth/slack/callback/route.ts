import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/server';
import { setSession } from '@/lib/session';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state'); // The invite token, if present

  const origin =
    (await headers()).get('origin') ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://opsmem.com';

  if (error) {
    return NextResponse.redirect(`${origin}/?error=slack_oauth_denied`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=no_code`);
  }

  const clientId = process.env.NEXT_PUBLIC_SLACK_CLIENT_ID || '';
  const clientSecret = process.env.SLACK_CLIENT_SECRET || '';

  if (!clientId || !clientSecret) {
    console.error('Slack OAuth missing env vars: NEXT_PUBLIC_SLACK_CLIENT_ID or SLACK_CLIENT_SECRET');
    return NextResponse.redirect(`${origin}/?error=server_config`);
  }

  try {
    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      redirect_uri: `${origin}/api/auth/slack/callback`
    });

    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const data = await response.json();

    if (!data.ok) {
      console.error('Slack OAuth error:', data.error);
      return NextResponse.redirect(`${origin}/?error=slack_oauth_failed_${data.error}`);
    }

    const workspaceId = data.team?.id;
    if (!workspaceId) {
      return NextResponse.redirect(`${origin}/?error=no_workspace`);
    }
    
    const slackUserId = data.authed_user?.id;
    if (!slackUserId) {
      return NextResponse.redirect(`${origin}/?error=no_user_id`);
    }

    const db = createAdminClient();

    // 1. Check if this specific user is already a member
    const { data: member } = await db
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('slack_user_id', slackUserId)
      .maybeSingle();

    if (member) {
      // Returning user! Just log them in.
      await setSession(workspaceId, slackUserId, member.role);
      return NextResponse.redirect(`${origin}/dashboard`);
    }

    // 2. User is NOT a member. Let's check if they have an invite token (passed via state)
    if (state) {
      const { data: invite, error: inviteErr } = await db
        .from('workspace_members')
        .select('id, workspace_id, accepted_at')
        .eq('invite_token', state)
        .single();

      if (inviteErr || !invite) {
        return NextResponse.redirect(`${origin}/?error=invalid_invite`);
      }

      if (invite.accepted_at) {
        return NextResponse.redirect(`${origin}/?error=invite_already_used`);
      }

      if (invite.workspace_id !== workspaceId) {
        return NextResponse.redirect(`${origin}/?error=wrong_workspace`);
      }

      // Mark invite as accepted with Slack info
      const { error: updateErr } = await db
        .from('workspace_members')
        .update({
          slack_user_id: slackUserId,
          accepted_at: new Date().toISOString(),
        })
        .eq('id', invite.id);

      if (updateErr) {
        return NextResponse.redirect(`${origin}/?error=failed_to_accept_invite`);
      }

      // Successfully joined via invite!
      await setSession(workspaceId, slackUserId, 'member');
      return NextResponse.redirect(`${origin}/dashboard`);
    }

    // 3. User is NOT a member and has NO invite. Check if workspace exists at all.
    const { count } = await db
      .from('workspace_members')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId);

    if (count && count > 0) {
      // Workspace exists, but this user is not invited. Block access.
      return NextResponse.redirect(`${origin}/?error=unauthorized_ask_admin`);
    }

    // 3. Workspace DOES NOT exist. This is a fresh install!
    // Insert them as Admin.
    const { error: insertErr } = await db
      .from('workspace_members')
      .insert({
        workspace_id: workspaceId,
        slack_user_id: slackUserId,
        role: 'admin',
        accepted_at: new Date().toISOString()
      });

    if (insertErr) {
      console.error('Failed to create admin member:', insertErr);
      return NextResponse.redirect(`${origin}/?error=failed_to_create_admin`);
    }

    // Send Welcome DM to the installing user
    try {
      if (data.access_token) {
        await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${data.access_token}`
          },
          body: JSON.stringify({
            channel: slackUserId,
            blocks: [
              {
                type: 'header',
                text: { type: 'plain_text', text: '🧠 OpsMem is installed and ready.', emoji: true }
              },
              {
                type: 'section',
                text: { 
                  type: 'mrkdwn', 
                  text: "You've successfully connected your workspace! OpsMem helps your team stop losing critical context by saving decisions right where they happen.\n\n*Here is your Quick Start checklist:*"
                }
              },
              {
                type: 'section',
                text: { type: 'mrkdwn', text: "*1. Log a decision*\nGo to any channel and type a decision with `#tags`. E.g.\n>`/decide We chose PostgreSQL over MySQL because of JSONB support #database #backend`" }
              },
              {
                type: 'section',
                text: { type: 'mrkdwn', text: "*2. Find a decision*\nAsk OpsMem to find decisions using natural language. E.g.\n>`/find why postgres`" }
              },
              {
                type: 'section',
                text: { type: 'mrkdwn', text: "*3. Invite your team*\nDecisions are a team sport. Open the dashboard and share the invite link so your whole team can browse the memory log." }
              },
              { type: 'divider' },
              {
                type: 'actions',
                elements: [
                  {
                    type: 'button',
                    text: { type: 'plain_text', text: 'Open Dashboard', emoji: true },
                    url: `${origin}/dashboard`,
                    style: 'primary',
                    action_id: 'open_dashboard_welcome'
                  }
                ]
              }
            ]
          })
        });
      }
    } catch (dmErr) {
      console.error('Failed to send welcome DM:', dmErr);
    }

    // Set their session and redirect
    await setSession(workspaceId, slackUserId, 'admin');
    return NextResponse.redirect(`${origin}/dashboard`);
  } catch (err: unknown) {
    console.error('Failed to exchange OAuth code:', err);
    return NextResponse.redirect(`${origin}/?error=internal_server_error`);
  }
}
