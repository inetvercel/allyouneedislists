import type { Metadata } from 'next'
import { LogoMark } from '@/components/Logo'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms and conditions governing your use of All You Need Is Lists.',
}

const W = 'max-w-[1380px]'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="text-xl font-black text-gray-900 mb-3">{title}</h2>
      <div className="text-gray-600 leading-relaxed space-y-3">{children}</div>
    </div>
  )
}

export default function TermsPage() {
  const updated = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className={`${W} mx-auto px-4 py-2`}>
      {/* Floating dark hero */}
      <div className="relative overflow-hidden rounded-3xl bg-[#151515] border border-white/[0.06] shadow-2xl shadow-black/30 px-6 md:px-10 py-12 md:py-16 mb-8 text-center">
        <div className="absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full opacity-[0.15] blur-3xl pointer-events-none bg-[#fbbf24]" />
        <div className="absolute -bottom-24 -right-24 w-[420px] h-[420px] rounded-full opacity-[0.1] blur-3xl pointer-events-none bg-[#E63946]" />
        <div className="relative max-w-2xl mx-auto">
          <div className="flex justify-center mb-6">
            <LogoMark size={48} />
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white leading-tight mb-4">Terms of Service</h1>
          <p className="text-lg md:text-xl font-medium text-gray-400 leading-snug">
            Last updated: {updated}
          </p>
        </div>
      </div>

      {/* Content card */}
      <div className="max-w-3xl mx-auto bg-white rounded-3xl border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.05)] p-8 md:p-12 mb-12">
        <Section title="Agreement to Terms">
          <p>
            By accessing or using allyouneedislists.com (the &ldquo;Site&rdquo;), you agree to be bound by these Terms
            of Service. If you do not agree, please do not use the Site.
          </p>
        </Section>

        <Section title="Use of Content">
          <p>
            All lists, articles, rankings, and other content on the Site are provided for informational purposes only.
            You may share links to our content, but you may not copy, republish, or redistribute substantial portions
            of our content without prior written permission.
          </p>
        </Section>

        <Section title="No Professional Advice">
          <p>
            Content on the Site — including rankings, comparisons, and statistics — is for general informational
            purposes and does not constitute financial, legal, medical, or professional advice. Always do your own
            research before making purchasing or other decisions.
          </p>
        </Section>

        <Section title="Affiliate Relationships">
          <p>
            Some links on the Site are affiliate links, meaning we may earn a commission if you click through and
            make a purchase, at no extra cost to you. Our editorial opinions and rankings remain independent of any
            affiliate relationship.
          </p>
        </Section>

        <Section title="Accuracy of Information">
          <p>
            We aim to keep lists accurate and up to date, but we make no guarantees regarding completeness,
            reliability, or accuracy. Prices, features, and availability mentioned in our lists can change without
            notice — always verify details directly with the provider.
          </p>
        </Section>

        <Section title="Third-Party Links">
          <p>
            The Site may contain links to third-party websites. We are not responsible for the content, accuracy, or
            practices of any linked external sites.
          </p>
        </Section>

        <Section title="Limitation of Liability">
          <p>
            To the fullest extent permitted by law, All You Need Is Lists shall not be liable for any indirect,
            incidental, or consequential damages arising from your use of the Site or reliance on its content.
          </p>
        </Section>

        <Section title="Changes to These Terms">
          <p>
            We may update these Terms from time to time. Continued use of the Site after changes are posted
            constitutes acceptance of the revised Terms.
          </p>
        </Section>

        <Section title="Contact Us">
          <p>
            Questions about these Terms? Please{' '}
            <a href="mailto:hello@allyouneedislists.com" className="text-[#E63946] font-semibold hover:underline">
              contact us
            </a>.
          </p>
        </Section>
      </div>
    </div>
  )
}
