'use server';

import OpenAI from 'openai';
import { createAdminClient } from '@/lib/supabase/server';
import { z } from 'zod';

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

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy_key',
});

export async function logDecision(text: string, workspaceId: string, userId: string, tags?: string[], context?: Record<string, unknown>) {
  try {
    const parsed = logDecisionSchema.safeParse({ text, workspaceId, userId, tags, context });
    if (!parsed.success) {
      return { success: false, error: 'Invalid input parameters.' };
    }
    
    const supabaseAdmin = createAdminClient();

    // 1. Check current month usage
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count, error: countError } = await supabaseAdmin
      .from('decisions')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .gte('created_at', startOfMonth.toISOString());

    if (countError) throw countError;

    // 2. If usage >= 10, verify active subscription
    if ((count || 0) >= 10) {
      const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('status')
        .eq('workspace_id', workspaceId)
        // Note: checking 'active' or 'trialing' covers standard paid states
        .in('status', ['active', 'trialing'])
        .maybeSingle();
      
      if (!sub) {
        return { success: false, requiresUpgrade: true, error: "Free plan limit reached (10 decisions/month). Please upgrade." };
      }
    }

    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    const embedding = embeddingResponse.data[0].embedding;

    const { error: dbError } = await supabaseAdmin
      .from('decisions')
      .insert({
        workspace_id: parsed.data.workspaceId,
        user_id: parsed.data.userId,
        text: parsed.data.text,
        tags: parsed.data.tags || [],
        context: parsed.data.context || {},
        embedding,
      });

    if (dbError) throw new Error('Database insertion failed');
    return { success: true };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMsg };
  }
}

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
      match_threshold: 0.78,
      match_count: 5,
    });

    if (dbError) throw new Error('Database interaction failed');
    
    return { success: true, data };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMsg };
  }
}
