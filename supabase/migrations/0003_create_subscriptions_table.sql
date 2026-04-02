-- Create subscriptions table for Stripe data
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id text PRIMARY KEY, -- Stripe subscription ID
  workspace_id text NOT NULL,
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
