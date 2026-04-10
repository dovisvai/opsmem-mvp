import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/server';

// Helper: safely convert a Stripe Unix timestamp to ISO string
function toISOSafe(unix: unknown): string | null {
  if (!unix || typeof unix !== 'number') return null;
  try {
    return new Date(unix * 1000).toISOString();
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    console.error('STRIPE_SECRET_KEY is not configured.');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured.');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
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
    console.error('Webhook signature verification failed:', (err as Error).message);
    return NextResponse.json({ error: 'Webhook signature invalid' }, { status: 400 });
  }

  console.log(`Webhook received: ${event.type}`);

  const supabaseAdmin = createAdminClient();

  try {
    // ── checkout.session.completed ─────────────────────────────────────────
    // Primary sync path — fires immediately after successful payment
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const workspaceId = session.metadata?.workspace_id;
      const stripeSubscriptionId = session.subscription as string | null;
      const stripeCustomerId = session.customer as string | null;

      if (!workspaceId) {
        console.error('checkout.session.completed — missing workspace_id in metadata');
        return NextResponse.json({ received: true });
      }

      if (workspaceId && stripeSubscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        const priceId = subscription.items.data[0]?.price?.id ?? null;
        const currentPeriodEnd = toISOSafe((subscription as unknown as { current_period_end: number }).current_period_end);

        const { error } = await supabaseAdmin.from('subscriptions').upsert({
          stripe_subscription_id: subscription.id,
          workspace_id: workspaceId,
          stripe_customer_id: stripeCustomerId,
          status: subscription.status,
          price_id: priceId,
          current_period_end: currentPeriodEnd,
        }, { onConflict: 'stripe_subscription_id' });

        if (error) {
          console.error(`DB upsert failed for workspace ${workspaceId}:`, error.message);
        } else {
          console.log(`Subscription created for workspace: ${workspaceId}`);
        }
      }
    }

    // ── customer.subscription.created / updated ────────────────────────────
    // Handles renewals, plan changes, and cancellations
    else if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated'
    ) {
      const subscription = event.data.object as Stripe.Subscription;
      let workspaceId = subscription.metadata?.workspace_id;

      if (!workspaceId) {
        // Fallback: look up workspace from existing DB row
        const { data: existingSub } = await supabaseAdmin
          .from('subscriptions')
          .select('workspace_id')
          .eq('stripe_subscription_id', subscription.id)
          .maybeSingle();
        if (existingSub) workspaceId = existingSub.workspace_id;
      }

      if (!workspaceId) {
        console.warn(`${event.type} — could not resolve workspace_id for sub ${subscription.id}`);
        return NextResponse.json({ received: true });
      }

      // If subscription is canceled or scheduled for cancellation — delete row immediately
      if (
        subscription.status === 'canceled' ||
        subscription.status === 'incomplete_expired' ||
        subscription.cancel_at_period_end
      ) {
        await supabaseAdmin.from('subscriptions')
          .delete()
          .eq('stripe_subscription_id', subscription.id);
        console.log(`Subscription ${subscription.id} canceled — removed for workspace ${workspaceId}`);
      } else {
        const currentPeriodEnd = toISOSafe((subscription as unknown as { current_period_end: number }).current_period_end);

        const { error } = await supabaseAdmin.from('subscriptions').upsert({
          stripe_subscription_id: subscription.id,
          workspace_id: workspaceId,
          stripe_customer_id: subscription.customer as string,
          status: subscription.status,
          price_id: subscription.items.data[0]?.price?.id ?? null,
          current_period_end: currentPeriodEnd,
        }, { onConflict: 'stripe_subscription_id' });

        if (error) {
          console.error(`DB upsert failed for workspace ${workspaceId}:`, error.message);
        } else {
          console.log(`Subscription ${subscription.id} synced for workspace ${workspaceId}`);
        }
      }
    }

    // ── customer.subscription.deleted ─────────────────────────────────────
    else if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      await supabaseAdmin
        .from('subscriptions')
        .delete()
        .eq('stripe_subscription_id', subscription.id);
      console.log(`Subscription ${subscription.id} deleted from Supabase`);
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error('Webhook handler error:', (error as Error).message);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
