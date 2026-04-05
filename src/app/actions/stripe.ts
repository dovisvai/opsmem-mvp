'use server';

import Stripe from 'stripe';
import { headers } from 'next/headers';

// Stripe is initialised once per serverless cold start.
// Both keys are required — the server will throw early if they are missing
// so a misconfigured deploy fails loudly rather than creating broken sessions.
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  throw new Error('Missing required env var: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2026-03-25.dahlia',
});

export async function createCheckoutSession(workspaceId: string) {
  try {
    const origin =
      (await headers()).get('origin') ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'https://opsmem.com';

    // STRIPE_PRO_PRICE_ID is the price_ string from your Stripe dashboard
    // for the $19/month Pro subscription product.
    // Works in both test mode (price_test_...) and live mode (price_live_...).
    const priceId = process.env.STRIPE_PRO_PRICE_ID;
    if (!priceId) {
      throw new Error('Missing required env var: STRIPE_PRO_PRICE_ID');
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
