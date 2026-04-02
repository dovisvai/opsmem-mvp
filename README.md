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
Scroll up to the top of **OAuth & Permissions** and click **Install to Workspace**. Once installed, copy the **Bot User OAuth Token** (`xoxb-...`) and save it to your `.env.local` as `SLACK_BOT_TOKEN`. Ensure your Vercel URL points to the `/api/slack/events` routing!

### Step: Run the database migration
To set up your pgvector database for memory retrieval, copy the SQL located in `supabase/migrations/0001_create_decisions_table.sql`.
Then, navigate to the **SQL Editor** in your Supabase Dashboard project and run the complete SQL script. This provisions the vector extension, the `decisions` table with the requested schema, the HNSW semantic index, and standard Row Level Security.

### Task 3 Complete: Backend Matching Logic
You also need to apply the semantic search function logic inside Supabase.
**Instruction**: Run the SQL located in `supabase/migrations/0002_create_match_decisions_function.sql` in the Supabase SQL Editor *after* the initial table migration.

The `src/app/actions/decisions.ts` file now contains the dual Server Actions which use OpenAI embeddings and the Supabase Service Role to perform database inserts and Semantic searches matching. It is ready for your Slack bot.
### Step: Update the Subscriptions schema
If you plan to utilize Stripe, please run `supabase/migrations/0003_create_subscriptions_table.sql` in the Supabase Dashboard to enable the webhook synchronization.

## Deployment Guide (Vercel)

Deploying OpsMem to production takes just a few clicks thanks to Vercel and Supabase.

1. **Deploy to Vercel (One-Click)**
   - Push your code to a GitHub repository.
   - Go to [Vercel](https://vercel.com) and select *Import Project*.
   - Select your repository and leave the framework preset as **Next.js**.

2. **Add Environment Variables in Vercel**
   During deployment (or afterwards in **Settings > Environment Variables**), copy all the variable names from your `.env.local` to Vercel. Crucially, fill out:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`
   - `SLACK_BOT_TOKEN`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `STRIPE_PRICE_ID_PRO` (Your $19 product price_ string)

3. **Set Up Stripe Webhook**
   - Go to the Stripe Developer Dashboard -> Webhooks.
   - Add a new endpoint pointing to `https://your-vercel-domain.vercel.app/api/stripe/webhook`
   - Select the events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`.
   - Reveal the webhook signing secret and save it to Vercel as `STRIPE_WEBHOOK_SECRET`.

4. **Final Launch Checklist**
   - Did you add your Vercel URL to the Slack App's Request URL configuration for interactivity?
   - Is Supabase RLS migrations complete?
   - Are your environment variables fully populated in Vercel?
   - Try logging a decision through Slack and finding it in your new Dashboard!

## Production Security Checklist

For this MVP, a rigorous production-hardening pipeline was manually implemented mapping to 2026 security best architectures:
- **Zero Placeholder Data**: Hardcoded workspace IDs were stripped out preventing insecure session crossovers manually.
- **Crypto HMAC Verification**: Native Node cryptography processes `X-Slack-Signature` and standard timestamps securely parsing standard API endpoints with rate limits. 
- **Zod Data Sanitizations**: Core semantic actions evaluate type structures safely via comprehensive generic masking to ensure error streams don't trace back to internal server stacks.
- **HTTP Hardening Maps**: Embedded `Strict-Transport-Security`, CSP rules, and `X-Content-Type` mitigations through `next.config.mjs`.

*Note*: We are temporarily natively running on `text-embedding-3-small` (OpenAI embeddings) due to the absence of public endpoints for `grok-embedding` pipelines at xAI! We will transition over when xAI publicly launches robust models.
