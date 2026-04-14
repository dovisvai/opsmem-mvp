export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { logDecision, searchDecisions, getMonthlyUsage } from '@/app/actions/decisions';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';

    // ── Handle Slack Events API URL Verification (no signature needed) ──
    if (contentType.includes('application/json')) {
      const body = await request.json();
      if (body.type === 'url_verification') {
        return NextResponse.json({ challenge: body.challenge });
      }
      return NextResponse.json({ status: 'ignored' });
    }

    const bodyText = await request.text();

    // ── S3: Slack signature verification is REQUIRED — hard fail if secret missing ──
    const secret = process.env.SLACK_SIGNING_SECRET;
    if (!secret) {
      console.error('SLACK_SIGNING_SECRET is not set — refusing all requests.');
      return new NextResponse('Server misconfiguration', { status: 500 });
    }

    const timestamp = request.headers.get('x-slack-request-timestamp');
    const signature = request.headers.get('x-slack-signature');

    if (!timestamp || !signature) {
      return new NextResponse('Missing signature', { status: 401 });
    }

    // Reject requests older than 5 minutes — prevents replay attacks
    const time = parseInt(timestamp, 10);
    if (Math.abs(Date.now() / 1000 - time) > 300) {
      return new NextResponse('Replay attack detected', { status: 401 });
    }

    const sigBaseString = `v0:${timestamp}:${bodyText}`;
    const mySignature = 'v0=' + crypto.createHmac('sha256', secret).update(sigBaseString, 'utf8').digest('hex');
    try {
      if (!crypto.timingSafeEqual(Buffer.from(mySignature), Buffer.from(signature))) {
        return new NextResponse('Invalid signature', { status: 401 });
      }
    } catch {
      return new NextResponse('Invalid signature', { status: 401 });
    }

    const params = new URLSearchParams(bodyText);

    const command = params.get('command');
    const text = params.get('text') || '';
    const workspace_id = params.get('team_id');
    const user_id = params.get('user_id');

    if (!workspace_id || !user_id) {
      return NextResponse.json({ text: 'Missing workspace or user context from Slack.' });
    }

    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://opsmem.com';

    // Reusable Block Kit "Open Dashboard" button
    const dashboardButton = {
      type: 'actions',
      elements: [{
        type: 'button',
        text: { type: 'plain_text', text: '📊 Open Dashboard', emoji: true },
        style: 'primary',
        url: `${siteUrl}/dashboard?workspace=${workspace_id}`,
        action_id: 'open_dashboard',
      }],
    };

    if (command === '/decide') {
      // Extract #hashtags from anywhere in the message
      const hashtagRegex = /#([\w-]+)/g;
      const tagsArray = [...text.matchAll(hashtagRegex)].map(m => m[1].toLowerCase());
      const cleanText = text.replace(hashtagRegex, '').replace(/\s{2,}/g, ' ').trim();

      if (!cleanText) {
        return NextResponse.json({
          response_type: 'ephemeral',
          text: '⚠️ Please include a decision message.\nExample: `/decide We chose PostgreSQL #backend #infra`',
        });
      }

      const result = await logDecision(cleanText, workspace_id, user_id, tagsArray, {});
      const upgradeUrl = `${siteUrl}/pricing?workspace=${workspace_id}`;

      const upgradeButtonAction = {
        type: 'actions',
        elements: [{
          type: 'button',
          text: { type: 'plain_text', text: 'Upgrade Now', emoji: true },
          style: 'primary',
          url: upgradeUrl,
          action_id: 'upgrade_now',
        }],
      };

      if (!result.success) {
        if (result.requiresUpgrade) {
          return NextResponse.json({
            response_type: 'ephemeral',
            blocks: [
              {
                type: 'section',
                text: { type: 'mrkdwn', text: `🚨 Free plan limit reached (25/25). No more decisions can be logged this month. Upgrade to Pro for unlimited logging.` }
              },
              upgradeButtonAction
            ]
          });
        }
        return NextResponse.json({
          response_type: 'ephemeral',
          text: `🚨 Error logging decision: ${result.error}`,
        });
      }

      // Check current quota for Free users — passes Date.now() to bypass server action memoization
      const usage = await getMonthlyUsage(workspace_id, Date.now());

      const tagLine = tagsArray.length > 0
        ? `\n🏷️ Tags: ${tagsArray.map(t => `#${t}`).join(' ')}`
        : '';

      const baseBlocks = [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `✅ *Decision logged by <@${user_id}>:*\n${cleanText}${tagLine}`,
          },
        },
        dashboardButton,
      ];

      if (usage.success && usage.tier === 'free') {
        if (usage.count === 15) {
          baseBlocks.push({
            type: 'section',
            text: { type: 'mrkdwn', text: `⚠️ You're at 15/25 Free decisions this month. Upgrade anytime for unlimited logging.` }
          });
          baseBlocks.push(upgradeButtonAction);
        } else if (usage.count === 20) {
          baseBlocks.push({
            type: 'section',
            text: { type: 'mrkdwn', text: `⚠️ You're at 20/25 Free decisions this month. Consider upgrading soon for unlimited access.` }
          });
          baseBlocks.push(upgradeButtonAction);
        }
      }

      return NextResponse.json({
        response_type: 'in_channel',
        blocks: baseBlocks,
      });
    }

    if (command === '/find') {
      const result = await searchDecisions(text, workspace_id);
      if (!result.success) {
        return NextResponse.json({
          response_type: 'ephemeral',
          text: `🚨 Error searching decisions: ${result.error}`
        });
      }

      const matches = result.data || [];
      if (matches.length === 0) {
        return NextResponse.json({
          response_type: 'in_channel',
          text: `🔍 No decisions found for: _"${text}"_\nTry logging more decisions with \`/decide\`.`
        });
      }

      const topSimilarity: number = matches[0]?.similarity ?? 0;
      const headerText = topSimilarity < 0.65
        ? `🔍 *Closest matches found (may not be perfect):* _"${text}"_`
        : `🔍 *Top results for:* _"${text}"_`;

      const blocks: Record<string, unknown>[] = [
        { type: 'section', text: { type: 'mrkdwn', text: headerText } },
        { type: 'divider' },
      ];

      matches.forEach((m: { similarity: number; text: string; user_id?: string; created_at?: string }) => {
        const pct = (m.similarity * 100).toFixed(1);
        const bar = m.similarity >= 0.75 ? '🟢' : m.similarity >= 0.65 ? '🟡' : '🔴';
        const dateStr = m.created_at ? new Date(m.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
        const userTag = m.user_id ? `<@${m.user_id}>` : 'Unknown';
        const meta = dateStr ? `_${dateStr} by ${userTag}_` : `_by ${userTag}_`;
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${bar} *${pct}% match* • ${meta}\n${m.text}`
          }
        });
      });

      blocks.push(dashboardButton);

      return NextResponse.json({ response_type: 'in_channel', blocks });
    }

    return NextResponse.json({ text: `Unknown command: ${command}` });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ text: `Internal Server Error: ${errorMsg}` }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Slack API Endpoint Active' });
}
