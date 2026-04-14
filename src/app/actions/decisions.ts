'use server';

import OpenAI from 'openai';
import { createAdminClient } from '@/lib/supabase/server';
import { z } from 'zod';
import Stripe from 'stripe';

const logDecisionSchema = z.object({
  text: z.string().min(1).max(2000),
  workspaceId: z.string().min(1),
  userId: z.string().min(1),
  tags: z.array(z.string()).optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});

const searchDecisionsSchema = z.object({
  query: z.string().min(1).max(1000),
  workspaceId: z.string().min(1),
});

// S2: Hard fail if OPENAI_API_KEY is not configured — no silent dummy key
if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing required env var: OPENAI_API_KEY');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// O6: Shared helper — avoids duplicating this 3-line calculation in every function
function getStartOfMonth(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function logDecision(
  text: string,
  workspaceId: string,
  userId: string,
  tags?: string[],
  context?: Record<string, unknown>
) {
  try {
    const parsed = logDecisionSchema.safeParse({ text, workspaceId, userId, tags, context });
    if (!parsed.success) {
      return { success: false, error: 'Invalid input parameters.' };
    }

    const supabaseAdmin = createAdminClient();
    const startOfMonth = getStartOfMonth();

    const { count } = await supabaseAdmin
      .from('decisions')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .gte('created_at', startOfMonth.toISOString());

    if ((count || 0) >= 25) {
      const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('status')
        .eq('workspace_id', workspaceId)
        .in('status', ['active', 'trialing'])
        .maybeSingle();

      if (!sub) {
        return { success: false, requiresUpgrade: true, error: 'Free plan limit reached (25 decisions/month). Upgrade for unlimited logging.' };
      }
    }

    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: parsed.data.text,
    });
    const embedding = embeddingResponse.data[0].embedding;

    const { error: dbError } = await supabaseAdmin.from('decisions').insert({
      workspace_id: parsed.data.workspaceId,
      user_id: parsed.data.userId,
      text: parsed.data.text,
      tags: parsed.data.tags || [],
      context: parsed.data.context || {},
      embedding,
    });

    if (dbError) throw new Error('Database insertion failed: ' + dbError.message);

    return { success: true };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMsg };
  }
}

// Return current month's decision count and subscription tier.
export async function getMonthlyUsage(workspaceId: string, _forceRefresh?: number) {
  try {
    if (!workspaceId) return { success: false, count: 0, limit: 25, isPro: false, tier: 'free' as const, rawSub: null };

    const supabaseAdmin = createAdminClient();
    const startOfMonth = getStartOfMonth();

    const { count } = await supabaseAdmin
      .from('decisions')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .gte('created_at', startOfMonth.toISOString());

    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('status, price_id, stripe_subscription_id')
      .eq('workspace_id', workspaceId)
      .in('status', ['active', 'trialing'])
      .maybeSingle();

    // If user explicitly requested a refresh, validate sub live against Stripe API
    if (sub && _forceRefresh && sub.stripe_subscription_id) {
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
      if (stripeSecretKey) {
        const stripe = new Stripe(stripeSecretKey, { apiVersion: '2026-03-25.dahlia' });
        try {
          const remoteSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
          if (remoteSub.status === 'canceled' || remoteSub.status === 'incomplete_expired' || remoteSub.cancel_at_period_end) {
            await supabaseAdmin.from('subscriptions')
              .delete()
              .eq('stripe_subscription_id', sub.stripe_subscription_id);
            return { success: true, count: count || 0, limit: 25, isPro: false, tier: 'free' as const, rawSub: null };
          }
        } catch (e) {
          console.error('Failed to verify Stripe subscription remotely:', (e as Error).message);
        }
      }
    }

    let tier: 'free' | 'pro' | 'business' = 'free';
    if (sub) {
      tier = sub.price_id === process.env.STRIPE_BUSINESS_PRICE_ID ? 'business' : 'pro';
    }

    return { success: true, count: count || 0, limit: 25, isPro: tier !== 'free', tier, rawSub: sub };
  } catch {
    return { success: false, count: 0, limit: 25, isPro: false, tier: 'free' as const, rawSub: null };
  }
}

// Fetch ALL decisions for a workspace, ordered newest → oldest.
export async function getAllDecisions(workspaceId: string) {
  try {
    if (!workspaceId) return { success: false, error: 'workspaceId required' };

    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin
      .from('decisions')
      .select('id, text, tags, context, created_at, user_id')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw new Error('Failed to fetch decisions: ' + error.message);

    return { success: true, data: data || [] };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMsg };
  }
}

// Semantic search — used only when user actively types a query.
export async function searchDecisions(query: string, workspaceId: string) {
  try {
    const parsed = searchDecisionsSchema.safeParse({ query, workspaceId });
    if (!parsed.success) {
      return { success: false, error: 'Invalid query parameters.' };
    }

    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: parsed.data.query,
    });
    const query_embedding = embeddingResponse.data[0].embedding;

    const supabaseAdmin = createAdminClient();
    const { data, error: dbError } = await supabaseAdmin.rpc('match_decisions', {
      query_embedding,
      workspace_id: parsed.data.workspaceId,
      match_threshold: 0.55,
      match_count: 10,
    });

    if (dbError) throw new Error('Search failed: ' + dbError.message);

    // Fallback: if nothing above threshold, return 3 closest by raw distance
    let results = data || [];
    if (results.length === 0) {
      const { data: fallback } = await supabaseAdmin.rpc('match_decisions', {
        query_embedding,
        workspace_id: parsed.data.workspaceId,
        match_threshold: 0.0,
        match_count: 3,
      });
      results = fallback || [];
    }

    return { success: true, data: results };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMsg };
  }
}
