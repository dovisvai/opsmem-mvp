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

    return NextResponse.redirect(`${origin}/dashboard?workspace=${workspaceId}`);
  } catch (err: unknown) {
    console.error('Failed to exchange OAuth code:', err);
    return NextResponse.redirect(`${origin}/?error=internal_server_error`);
  }
}
