'use server';

import Stripe from 'stripe';
import { headers } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2026-03-25.dahlia', 
});

export async function createCheckoutSession(workspaceId: string) {
  try {
    const origin = (await headers()).get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    
    // NOTE: This requires STRIPE_PRICE_ID_PRO in your environment representing your $19/mo product
    const priceId = process.env.STRIPE_PRICE_ID_PRO || 'price_1234567890'; 

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
