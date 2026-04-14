import Link from 'next/link';
import { HomeNav } from '@/components/home-nav';

export const metadata = {
  title: 'Privacy Policy — OpsMem',
  description: 'OpsMem Privacy Policy outlining data erasure rights, third-party integrations, and operations jurisdiction.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)', color: 'var(--foreground)', fontFamily: '"Courier New", Courier, monospace' }}>
      
      {/* Nav */}
      <HomeNav />

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-20 text-left">
        <h1 className="text-4xl md:text-5xl font-black tracking-widest uppercase mb-12 border-b-4 th-border-strong pb-4">
          PRIVACY POLICY
        </h1>
        
        <div className="space-y-10 leading-relaxed text-sm md:text-base th-text-ghost tracking-wide">
          <section>
            <h2 className="text-xl font-black text-foreground uppercase mb-4 tracking-widest">1. Introduction</h2>
            <p>
              OpsMem operates out of Lithuania, providing services tailored for users predominantly based in the United States. 
              This Privacy Policy explains how we collect, use, and protect your personal data when you interact with our service 
              (the "Platform"). We respect your right to privacy and fully align with global data protection frameworks 
              (including European GDPR frameworks mapping seamlessly to standardized American data protection practices where applicable).
            </p>
          </section>
          
          <section>
            <h2 className="text-xl font-black text-foreground uppercase mb-4 tracking-widest">2. Information Collection</h2>
            <p className="mb-3">We collect minimal information strictly required to power your persistent memory log safely:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Slack User References:</strong> User IDs to map message ownership.</li>
              <li><strong>Workspace Identity:</strong> Slack Team boundaries.</li>
              <li><strong>Decision Vectors:</strong> Text submissions processed into mathematical vectors to enable seamless semantic searches.</li>
              <li><strong>Billing:</strong> Secure metadata handled directly by our payment processor.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-black text-foreground uppercase mb-4 tracking-widest">3. Third-Party Integrations</h2>
            <p className="mb-3">Our platform shares telemetry and integration operations securely with specific third-party providers:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Stripe:</strong> Payment processing.</li>
              <li><strong>Supabase:</strong> Scalable PostgreSQL and vector database persistence.</li>
              <li><strong>OpenAI:</strong> Secure processing of semantic AI embeddings.</li>
              <li><strong>Slack:</strong> Messaging platform interaction.</li>
              <li><strong>Google Analytics & Meta:</strong> Platform operational telemetry, site debugging, and aggregated visitor tracking.</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-xl font-black text-foreground uppercase mb-4 tracking-widest">4. Data Ownership and Right to Erasure</h2>
            <p>
              You maintain total, uncompromised control over your memory structures. If you choose to terminate your usage of OpsMem, you may request the hard erasure of your Workspace data directly via the &quot;Delete Data&quot; functionality integrated cleanly into your OpsMem Dashboard. Executing this option explicitly and permanently wipes all of your decision vectors, logs, and metadata from our active database entries.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-foreground uppercase mb-4 tracking-widest">5. Contact Information</h2>
            <p>
              For any questions regarding automated logging, compliance disclosures, or to submit a direct Subject Access Request (SAR), please reach out directly:
            </p>
            <p className="mt-4 font-black">
              support@opsmem.com
            </p>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t th-divider px-8 py-5 text-center th-text-ghost text-xs tracking-widest uppercase">
        OPSMEM © {new Date().getFullYear()} — <Link href="/privacy" className="hover:text-foreground hover:underline transition-all">PRIVACY POLICY</Link>
      </footer>
    </div>
  );
}
