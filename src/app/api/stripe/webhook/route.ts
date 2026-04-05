import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/server';

// Both secrets are required — throw at cold-start so a misconfigured deploy
// surfaces immediately rather than failing silently on every webhook call.
const stripeSecretKey = process.env.STRIPE_SECRET_KEY as string;
if (!stripeSecretKey) {
  throw new Error('Missing required env var: STRIPE_SECRET_KEY');
}

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;
if (!webhookSecret) {
  throw new Error('Missing required env var: STRIPE_WEBHOOK_SECRET');
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2026-03-25.dahlia',
});

export async function POST(req: Request) {
  const payload = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err: unknown) {
    console.error('⚠️ Webhook signature verification failed:', (err as Error).message);
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  const supabaseAdmin = createAdminClient();

  try {
    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription;
      const workspaceId = subscription.metadata.workspace_id;
      
      if (workspaceId) {
        await supabaseAdmin.from('subscriptions').upsert({
          id: subscription.id,
          workspace_id: workspaceId,
          status: subscription.status,
          price_id: subscription.items.data[0].price.id,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          current_period_end: new Date((((subscription as unknown as any).current_period_end as number) || Date.now() / 1000) * 1000).toISOString(),
        });
        console.log(`✅ Upserted subscription ${subscription.id} for workspace ${workspaceId}`);
      }
    } else if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      await supabaseAdmin.from('subscriptions')
        .update({ status: 'canceled' })
        .eq('id', subscription.id);
      console.log(`❌ Canceled subscription ${subscription.id}`);
    }
    
    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error('Error handling webhook DB write:', error);
    return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
  }
}
