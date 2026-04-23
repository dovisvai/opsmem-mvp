import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

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

    // Send Welcome DM to the installing user
    try {
      if (data.access_token && data.authed_user?.id) {
        await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${data.access_token}`
          },
          body: JSON.stringify({
            channel: data.authed_user.id,
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
                    url: `${origin}/dashboard?workspace=${workspaceId}`,
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
      // We don't block the redirect if the DM fails
    }

    return NextResponse.redirect(`${origin}/dashboard?workspace=${workspaceId}`);
  } catch (err: unknown) {
    console.error('Failed to exchange OAuth code:', err);
    return NextResponse.redirect(`${origin}/?error=internal_server_error`);
  }
}
