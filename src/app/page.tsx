import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <main className="max-w-3xl space-y-12">
        <div className="space-y-6">
          <h1 className="text-6xl font-extrabold tracking-tight text-slate-900 border-b border-slate-200 pb-8">
            OpsMem <span className="text-blue-600 mx-2">—</span> <br/>
            Team Decision Log 
          </h1>
          <p className="text-xl text-slate-600 font-medium leading-relaxed max-w-2xl mx-auto">
            Never lose critical context again. OpsMem acts as your persistent architectural and organizational memory, 
            natively powered by <strong className="text-slate-900">xAI Grok Semantic Search</strong>.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4">
           <Link href="/dashboard">
             <Button size="lg" className="px-10 py-6 text-lg tracking-wide rounded-full shadow-lg hover:shadow-xl transition-all h-auto">
               Go to Dashboard
             </Button>
           </Link>
           <Button size="lg" variant="outline" className="px-10 py-6 text-lg tracking-wide rounded-full bg-white h-auto" asChild>
             <a href="https://slack.com/oauth/v2/authorize" target="_blank" rel="noopener noreferrer">
               Install Slack Bot
             </a>
           </Button>
           <Link href="/pricing">
             <Button size="lg" variant="secondary" className="px-10 py-6 text-lg tracking-wide rounded-full shadow hover:shadow-md transition-all h-auto bg-slate-200">
               View Pro Pricing
             </Button>
           </Link>
        </div>
      </main>

      <footer className="fixed bottom-8 text-center text-slate-400 text-sm font-medium">
        Powered by Next.js 16, Supabase pgvector, and xAI Grok.
      </footer>
    </div>
  );
}
