import { NextResponse } from 'next/server';
import { logDecision, searchDecisions } from '@/app/actions/decisions';

import crypto from 'crypto';

const rateLimitMap = new Map<string, number>();

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const now = Date.now();
    if (rateLimitMap.has(ip) && now - rateLimitMap.get(ip)! < 500) {
      return new NextResponse('Rate limited', { status: 429 });
    }
    rateLimitMap.set(ip, now);

    const contentType = request.headers.get('content-type') || '';
    
    // Handle Slack Events API URL Verification
    if (contentType.includes('application/json')) {
      const body = await request.json();
      if (body.type === 'url_verification') {
        return NextResponse.json({ challenge: body.challenge });
      }
      return NextResponse.json({ status: 'ignored' });
    }

    const bodyText = await request.text();

    const secret = process.env.SLACK_SIGNING_SECRET;
    if (secret) {
      const timestamp = request.headers.get('x-slack-request-timestamp');
      const signature = request.headers.get('x-slack-signature');
      
      if (!timestamp || !signature) {
        return new NextResponse('Missing signature', { status: 401 });
      }

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
        return new NextResponse('Invalid signature length mismatch', { status: 401 });
      }
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
      if (!result.success) {
        if (result.requiresUpgrade) {
          const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://opsmem.com';
          return NextResponse.json({
            response_type: 'ephemeral',
            text: `🚨 *Free Plan Limit Reached (25 decisions/month)*\nUpgrade to Pro for unlimited logging: ${siteUrl}/pricing?workspace=${workspace_id}`,
          });
        }
        return NextResponse.json({
          response_type: 'ephemeral',
          text: `🚨 Error logging decision: ${result.error}`,
        });
      }

      const tagLine = tagsArray.length > 0
        ? `\n🏷️ Tags: ${tagsArray.map(t => `#${t}`).join(' ')}`
        : '';

      return NextResponse.json({
        response_type: 'in_channel',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `✅ *Decision logged by <@${user_id}>:*\n${cleanText}${tagLine}`,
            },
          },
          dashboardButton,
        ],
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

      matches.forEach((m: { similarity: number; text: string }) => {
        const pct = (m.similarity * 100).toFixed(1);
        const bar = m.similarity >= 0.75 ? '🟢' : m.similarity >= 0.65 ? '🟡' : '🔴';
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${bar} *${pct}% match*\n${m.text}`
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
