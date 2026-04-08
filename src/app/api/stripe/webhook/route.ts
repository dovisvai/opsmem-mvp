import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new Error('Missing required env var: STRIPE_SECRET_KEY');
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error('Missing required env var: STRIPE_WEBHOOK_SECRET');
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2026-03-25.dahlia',
  });

  const payload = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err: unknown) {
    console.error('🚨 Webhook signature verification failed:', (err as Error).message);
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  console.error('========================================================================');
  console.error(`🚀 WEBHOOK RECEIVED: ${event.type}`);
  console.error('========================================================================');

  const supabaseAdmin = createAdminClient();

  try {
    // ─── PRIMARY SYNC PATH ───────────────────────────────────────────────────
    // checkout.session.completed fires immediately after successful payment.
    // This is what makes the dashboard show PRO right after redirect.
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const workspaceId = session.metadata?.workspace_id;
      const stripeSubscriptionId = session.subscription as string | null;
      const stripeCustomerId = session.customer as string | null;

      console.error(`💳 checkout.session.completed hit!`);
      console.error(`   -> workspace_id received: ${workspaceId || 'UNDEFINED'}`);
      console.error(`   -> subscription_id: ${stripeSubscriptionId || 'UNDEFINED'}`);
      console.error(`   -> FULL METADATA:`, session.metadata);

      if (!workspaceId) {
        console.error('❌ ERROR: no workspace_id in metadata!');
      }

      if (workspaceId && stripeSubscriptionId) {
        // Fetch the full subscription so we have period end + price info
        const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        
        let priceId = subscription.items.data[0]?.price?.id ?? null;
        if (!priceId) console.error('⚠️ price_id not found in subscription line items.');

        try {
          await supabaseAdmin.from('subscriptions').upsert({
            stripe_subscription_id: subscription.id,
            workspace_id: workspaceId,
            stripe_customer_id: stripeCustomerId,
            status: subscription.status,
            price_id: priceId,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            current_period_end: new Date(((subscription as unknown as any).current_period_end as number) * 1000).toISOString(),
          }, { onConflict: 'stripe_subscription_id' });

          console.error(`✅ Successfully upserted subscription for workspace: ${workspaceId}`);
        } catch (dbError) {
          console.error(`❌ DB UPSERT FAILED for workspace ${workspaceId}:`, dbError);
        }
      }
    }

    // ─── SUPPLEMENTAL SYNC (renewals, plan changes, cancellations) ──────────
    else if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated'
    ) {
      const subscription = event.data.object as Stripe.Subscription;
      let workspaceId = subscription.metadata?.workspace_id;

      if (!workspaceId) {
        // Fallback: fetch from DB if older subscription lacks metadata
        const { data: existingSub } = await supabaseAdmin
          .from('subscriptions')
          .select('workspace_id')
          .eq('stripe_subscription_id', subscription.id)
          .maybeSingle();
        if (existingSub) workspaceId = existingSub.workspace_id;
      }

      if (workspaceId) {
        await supabaseAdmin.from('subscriptions').upsert({
          stripe_subscription_id: subscription.id,
          workspace_id: workspaceId,
          stripe_customer_id: subscription.customer as string,
          status: subscription.status,
          price_id: subscription.items.data[0]?.price?.id ?? null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          current_period_end: new Date(((subscription as unknown as any).current_period_end as number) * 1000).toISOString(),
        }, { onConflict: 'stripe_subscription_id' });

        console.log(`✅ Sub ${subscription.id} synced for workspace ${workspaceId} (status: ${subscription.status})`);
      } else {
        console.warn(`⚠️ customer.subscription.updated missing workspace_id for sub ${subscription.id}`);
      }
    }

    else if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      await supabaseAdmin
        .from('subscriptions')
        .update({ status: 'canceled' })
        .eq('stripe_subscription_id', subscription.id);
      console.log(`❌ Subscription ${subscription.id} marked canceled`);
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error('Error handling webhook event:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
