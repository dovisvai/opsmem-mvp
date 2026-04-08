'use server';

import Stripe from 'stripe';
import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/server';

export async function createCheckoutSession(workspaceId: string, tier: 'pro' | 'business' = 'pro') {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error('Missing required env var: STRIPE_SECRET_KEY');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2026-03-25.dahlia',
    });

    const origin =
      (await headers()).get('origin') ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'https://opsmem.com';

    let priceId = '';
    if (tier === 'pro') {
      priceId = process.env.STRIPE_PRO_PRICE_ID || '';
      if (!priceId) throw new Error('Missing required env var: STRIPE_PRO_PRICE_ID');
    } else if (tier === 'business') {
      priceId = process.env.STRIPE_BUSINESS_PRICE_ID || '';
      if (!priceId) throw new Error('Missing required env var: STRIPE_BUSINESS_PRICE_ID');
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${origin}/dashboard?workspace=${workspaceId}&checkout=success`,
      cancel_url: `${origin}/pricing?workspace=${workspaceId}&checkout=cancelled`,
      client_reference_id: workspaceId,
      metadata: {
        workspace_id: workspaceId,
      },
      subscription_data: {
        metadata: {
          workspace_id: workspaceId,
        },
        description: `OpsMem Subscription [Workspace: ${workspaceId}]`,
      },
    });

    return { url: session.url };
  } catch (error: unknown) {
    console.error('Error creating checkout session:', error);
    return { error: (error as Error).message };
  }
}

export async function createCustomerPortalSession(workspaceId: string) {
  try {
    if (!workspaceId) throw new Error('Missing workspaceId');

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error('Missing required env var: STRIPE_SECRET_KEY');
    }

    const supabaseAdmin = createAdminClient();
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('workspace_id', workspaceId)
      .in('status', ['active', 'trialing'])
      .maybeSingle();

    if (!sub || !sub.stripe_customer_id) {
      throw new Error('No active subscription or customer ID found for this workspace.');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2026-03-25.dahlia',
    });

    const origin =
      (await headers()).get('origin') ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'https://opsmem.com';

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${origin}/dashboard?workspace=${workspaceId}`,
    });

    return { url: portalSession.url };
  } catch (error: unknown) {
    console.error('Error creating customer portal session:', error);
    return { error: (error as Error).message };
  }
}
