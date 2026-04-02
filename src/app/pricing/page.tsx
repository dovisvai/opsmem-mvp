"use client";

import { useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createCheckoutSession } from '@/app/actions/stripe';
import { useTransition, Suspense } from 'react';

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center">Loading Pricing...</div>}>
      <PricingContent />
    </Suspense>
  )
}

function PricingContent() {
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get('workspace') || '';
  const [isPending, startTransition] = useTransition();

  const handleUpgrade = () => {
    if (!workspaceId) {
      alert("Please provide a valid workspace ID via URL to upgrade.");
      return;
    }
    startTransition(async () => {
      const result = await createCheckoutSession(workspaceId);
      if (result?.url) {
        window.location.href = result.url;
      } else {
        alert("Failed to initialize Stripe checkout: " + result?.error);
      }
    });
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl space-y-8 py-20 text-center">
      <h1 className="text-5xl font-extrabold tracking-tight">Upgrade your OpsMem Workspace</h1>
      {workspaceId ? (
        <p className="text-xl text-slate-600 max-w-2xl mx-auto pt-4">
          Unlock unlimited OpenAI-powered semantic memory for workspace <strong className="text-blue-600 bg-blue-50 px-2 py-1 rounded">{workspaceId}</strong>.
        </p>
      ) : (
        <p className="text-xl text-slate-500 max-w-2xl mx-auto pt-4 border border-dashed border-red-300 bg-red-50 p-2 rounded">
          Warning: Unlinked Session. Add your Slack Workspace ID to the URL to proceed.
        </p>
      )}

      <div className="grid md:grid-cols-2 gap-8 pt-12 text-left">
        {/* Free Plan */}
        <Card className="border-2 border-slate-200 opacity-90">
          <CardHeader>
            <CardTitle className="text-2xl text-slate-800">Starter Core</CardTitle>
            <CardDescription>Perfect for testing the AI waters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <h3 className="text-5xl font-bold text-slate-800">$0<span className="text-xl text-slate-500 font-normal">/mo</span></h3>
            <ul className="space-y-3 text-slate-600 font-medium">
              <li>✓ 10 Decisions / month</li>
              <li>✓ OpenAI semantic retrieval</li>
              <li>✓ Next.js native UI access</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full text-lg h-12" disabled>Current Plan</Button>
          </CardFooter>
        </Card>

        {/* Pro Plan */}
        <Card className="border-2 border-blue-600 shadow-xl relative scale-105 bg-white">
          <div className="absolute -top-4 right-8 rounded-full px-4 py-1 bg-blue-600 text-white text-sm font-bold shadow">
            Recommended
          </div>
          <CardHeader>
            <CardTitle className="text-2xl text-blue-900">Pro Unlimited</CardTitle>
            <CardDescription className="text-blue-600/80">For operational enterprise flows</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <h3 className="text-5xl font-bold text-blue-900">$19<span className="text-xl text-slate-500 font-normal">/mo</span></h3>
            <ul className="space-y-3 text-slate-700 font-medium">
              <li>✓ <strong>Unlimited</strong> Decisions / month</li>
              <li>✓ Slack webhooks & integrations</li>
              <li>✓ Priority OpenAI embeddings pipeline</li>
              <li>✓ Premium support SLA</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button className="w-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white text-lg h-12" onClick={handleUpgrade} disabled={isPending}>
              {isPending ? 'Connecting to Stripe...' : 'Upgrade Now'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
