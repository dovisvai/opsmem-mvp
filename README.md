# OpsMem

Welcome to the OpsMem MVP repository! This project is built with Next.js 15 App Router, TypeScript, Tailwind CSS, Supabase, and shadcn/ui.

## Prerequisites

- Node.js (v18+)
- A Supabase project
- A Stripe account
- A Slack Workspace (for Slack bot integration)
- An OpenAI API key

## Getting Started

### Using Grok (xAI) instead of OpenAI
- Get free API key at https://console.grok.x.ai
- Paste as `XAI_API_KEY` in your `.env.local`
- Much cheaper & faster than OpenAI for embeddings.

1. **Environment Variables**:
   Copy `.env.local.example` to `.env.local` and fill in your keys.

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **How to test locally**:
   Run the development server and open the testing URL which features a pre-populated workspace placeholder.
   ```bash
   npm run dev
   ```
   Open: [http://localhost:3000/dashboard?workspace=T12345](http://localhost:3000/dashboard?workspace=T12345)

## Architecture & Integration Setup

### Supabase
The Supabase clients are ready in `src/lib/supabase`. Complete the authentication setup in your Supabase dashboard and securely store the `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in your `.env.local`.

### Slack Setup Guide
The Slack integration is fully designed to run optimally on Vercel Edge/Serverless environments using native HTTP bindings. 

**1. Create the App**
Go to [api.slack.com/apps](https://api.slack.com/apps) and click **Create an App** (From scratch).

**2. Configure Slash Commands**
Go to **Slash Commands** and create two commands:
- Command: `/decide`, Request URL: `<Your-Vercel-URL>/api/slack/events`, Description: Log a new decision
- Command: `/search`, Request URL: `<Your-Vercel-URL>/api/slack/events`, Description: Semantic search decisions

**3. Add Bot Token Scopes**
Go to **OAuth & Permissions**. Under Bot Token Scopes, ensure you have ONLY the following minimal scopes added:
- `commands`
- `chat:write`

**4. Install to Workspace**
Scroll up to the top of **OAuth & Permissions** and click **Install to Workspace**. Ensure your Vercel URL points to the `/api/slack/events` routing!

### Step: Run the database migration
To set up your pgvector database for memory retrieval, copy the SQL located in `supabase/migrations/0001_create_decisions_table.sql`.
Then, navigate to the **SQL Editor** in your Supabase Dashboard project and run the complete SQL script. This provisions the vector extension, the `decisions` table with the requested schema, the HNSW semantic index, and standard Row Level Security.

### Task 3 Complete: Backend Matching Logic
You also need to apply the semantic search function logic inside Supabase.
**Instruction**: Run the SQL located in `supabase/migrations/0002_create_match_decisions_function.sql` in the Supabase SQL Editor *after* the initial table migration.

The `src/app/actions/decisions.ts` file now contains the dual Server Actions which use OpenAI embeddings and the Supabase Service Role to perform database inserts and Semantic searches matching. It is ready for your Slack bot.
### Step: Update the Subscriptions schema
If you plan to utilize Stripe, please run `supabase/migrations/0003_create_subscriptions_table.sql` in the Supabase Dashboard to enable the webhook synchronization.

---

## Stripe Setup Guide

OpsMem supports two pricing tiers: **Free** and **$19.99/month Pro**. The integration supports both **test mode** and **live mode** automatically — just swap in the corresponding keys.

### Required Environment Variables

| Variable | Where to find it | Example value |
|---|---|---|
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API Keys | `sk_test_...` or `sk_live_...` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard → Developers → API Keys | `pk_test_...` or `pk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Developers → Webhooks (after adding endpoint) | `whsec_...` |
| `STRIPE_PRO_PRICE_ID` | Stripe Dashboard → Products → your Pro product → Price | `price_...` |

> **Test vs Live mode**: Use `sk_test_` / `pk_test_` keys during development and `sk_live_` / `pk_live_` for production. The price IDs are different per mode — make sure you copy the correct ones.

### Step 1 — Create the Products

1. Go to [dashboard.stripe.com/products](https://dashboard.stripe.com/products) and click **+ Add Product**.
2. Set the name to **OpsMem Pro**, price to **$19.99 USD**, billing period **Monthly**. Save it and copy the **Price ID** to `STRIPE_PRO_PRICE_ID`.

### Step 2 — Add API Keys

1. Go to [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys).
2. Copy the **Publishable key** → save as `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
3. Reveal and copy the **Secret key** → save as `STRIPE_SECRET_KEY`.

### Step 3 — Configure Webhooks

#### Local development (Stripe CLI)
```bash
# Install Stripe CLI: https://stripe.com/docs/stripe-cli
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
# Copy the whsec_... secret printed by the CLI → STRIPE_WEBHOOK_SECRET
```

#### Production (Vercel)
1. Go to [dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks) → **Add endpoint**.
2. Set the **Endpoint URL** to `https://<your-vercel-domain>/api/stripe/webhook`.
3. Under **Events to send**, select:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Click **Add endpoint**, then **Reveal signing secret** → copy `whsec_...` → save as `STRIPE_WEBHOOK_SECRET`.

### Step 4 — Test the Checkout Flow

1. With the dev server running (`npm run dev`), open:
   ```
   http://localhost:3000/pricing?workspace=T12345
   ```
2. Click **[ UPGRADE NOW ]** — you should be redirected to a Stripe Checkout page.
3. Use Stripe test card `4242 4242 4242 4242` (any future date, any CVC) to complete payment.
4. After success, you'll be redirected to `/dashboard?workspace=T12345&checkout=success`.
5. Verify the subscription was written to Supabase: check the `subscriptions` table in your Supabase dashboard.

### Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `Missing required env var: STRIPE_SECRET_KEY` | Key not set | Add `STRIPE_SECRET_KEY` to `.env.local` and restart the dev server |
| `Missing required env var: STRIPE_PRO_PRICE_ID` | Price ID not set | Add `STRIPE_PRO_PRICE_ID` to `.env.local` |
| Webhook signature verification failed | Wrong `STRIPE_WEBHOOK_SECRET` | Make sure you're using the webhook signing secret, not the API secret key |
| Checkout session created but subscription not in DB | Webhook not forwarded | Run `stripe listen --forward-to localhost:3000/api/stripe/webhook` locally |

---

## Deployment Guide (Vercel)

Deploying OpsMem to production takes just a few clicks thanks to Vercel and Supabase.

1. **Deploy to Vercel** — Push your code to GitHub, then go to [vercel.com](https://vercel.com) → Import Project → select your repo (framework preset: **Next.js**).

2. **Add Environment Variables** — In Vercel **Settings → Environment Variables**, add all vars from your `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`
   - `SLACK_SIGNING_SECRET`
   - `STRIPE_SECRET_KEY`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `STRIPE_PRO_PRICE_ID` ← your `price_...` string from Stripe
   - `NEXT_PUBLIC_APP_URL` ← your production URL

3. **Set Up Stripe Webhook** — Follow [Step 3 in the Stripe Setup Guide](#step-3--configure-webhooks) above, using your Vercel domain.

### Final Launch Checklist
- [ ] Supabase migrations run (all three SQL files)
- [ ] All environment variables set in Vercel
- [ ] Stripe webhook endpoint pointing to your Vercel URL
- [ ] Slack slash commands pointing to your Vercel URL
- [ ] Test checkout with Stripe test card `4242 4242 4242 4242`

## Production Security Checklist

For this MVP, a rigorous production-hardening pipeline was manually implemented mapping to 2026 security best architectures:
- **Zero Placeholder Data**: Hardcoded workspace IDs were stripped out preventing insecure session crossovers manually.
- **Crypto HMAC Verification**: Native Node cryptography processes `X-Slack-Signature` and standard timestamps securely parsing standard API endpoints with rate limits. 
- **Zod Data Sanitizations**: Core semantic actions evaluate type structures safely via comprehensive generic masking to ensure error streams don't trace back to internal server stacks.
- **HTTP Hardening Maps**: Embedded `Strict-Transport-Security`, CSP rules, and `X-Content-Type` mitigations through `next.config.mjs`.

*Note*: Currently using `text-embedding-3-small` (OpenAI embeddings). We will transition to Grok embeddings when xAI publicly launches a compatible embedding model.
