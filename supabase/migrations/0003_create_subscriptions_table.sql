-- Drop table to ensure clean schema update if re-running
DROP TABLE IF EXISTS public.subscriptions;

CREATE TABLE public.subscriptions (
  stripe_subscription_id text PRIMARY KEY,
  workspace_id text NOT NULL,
  stripe_customer_id text,
  status text NOT NULL,
  price_id text,
  current_period_end timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their workspace subscriptions"
  ON public.subscriptions
  FOR SELECT
  USING (workspace_id = auth.jwt()->>'workspace_id');
