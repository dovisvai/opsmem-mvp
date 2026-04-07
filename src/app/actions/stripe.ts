'use server';

import Stripe from 'stripe';
import { headers } from 'next/headers';

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
    });

    return { url: session.url };
  } catch (error: unknown) {
    console.error('Error creating checkout session:', error);
    return { error: (error as Error).message };
  }
}
