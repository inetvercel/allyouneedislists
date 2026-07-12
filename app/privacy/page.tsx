import type { Metadata } from 'next'
import { LogoMark } from '@/components/Logo'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How All You Need Is Lists collects, uses, and protects your information.',
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

export default function PrivacyPage() {
  const updated = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className={`${W} mx-auto px-4 py-2`}>
      {/* Floating dark hero */}
      <div className="relative overflow-hidden rounded-3xl bg-[#151515] border border-white/[0.06] shadow-2xl shadow-black/30 px-6 md:px-10 py-12 md:py-16 mb-8 text-center">
        <div className="absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full opacity-[0.15] blur-3xl pointer-events-none bg-[#38bdf8]" />
        <div className="absolute -bottom-24 -right-24 w-[420px] h-[420px] rounded-full opacity-[0.1] blur-3xl pointer-events-none bg-[#E63946]" />
        <div className="relative max-w-2xl mx-auto">
          <div className="flex justify-center mb-6">
            <LogoMark size={48} />
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white leading-tight mb-4">Privacy Policy</h1>
          <p className="text-lg md:text-xl font-medium text-gray-400 leading-snug">
            Last updated: {updated}
          </p>
        </div>
      </div>

      {/* Content card */}
      <div className="max-w-3xl mx-auto bg-white rounded-3xl border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.05)] p-8 md:p-12 mb-12">
        <Section title="Overview">
          <p>
            All You Need Is Lists (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) respects your privacy. This policy explains what
            information we collect when you visit allyouneedislists.com, how we use it, and the choices you have.
          </p>
        </Section>

        <Section title="Information We Collect">
          <p>We collect limited information to operate and improve the site, including:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Usage data</strong> — pages visited, time on site, referring URLs, and general device/browser information, collected via analytics tools.</li>
            <li><strong>Cookies</strong> — small files used to remember preferences and measure site performance.</li>
            <li><strong>Contact information</strong> — if you email us or submit our contact form, we collect your name, email address, and message content.</li>
          </ul>
        </Section>

        <Section title="How We Use Information">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>To operate, maintain, and improve our website and content.</li>
            <li>To understand which lists and categories are most useful to readers.</li>
            <li>To respond to inquiries submitted through our contact form.</li>
            <li>To display relevant advertising through third-party partners (see below).</li>
          </ul>
        </Section>

        <Section title="Affiliate Links & Advertising">
          <p>
            Some links on this site are affiliate links. If you click through and make a purchase, we may earn a commission
            at no additional cost to you. This never influences the objectivity of our rankings and recommendations.
          </p>
          <p>
            <strong>All You Need Is Lists is a participant in the Amazon Services LLC Associates Program</strong>, an
            affiliate advertising program designed to provide a means for sites to earn advertising fees by
            advertising and linking to Amazon.com (and its international equivalents, including Amazon.co.uk).
            As an Amazon Associate, we earn from qualifying purchases.
          </p>
          <p>
            We may also work with third-party advertising and analytics providers (such as Google) who may use cookies
            to serve relevant ads based on your visits to this and other websites.
          </p>
        </Section>

        <Section title="Third-Party Services">
          <p>
            We use third-party tools such as analytics and content delivery providers to operate the site. These
            providers may collect information sent by your browser as part of a web page request, such as cookies
            or your IP address.
          </p>
        </Section>

        <Section title="Your Choices">
          <p>
            You can control cookies through your browser settings. Disabling cookies may affect some site functionality.
            You may also opt out of personalized advertising through your browser or device settings.
          </p>
        </Section>

        <Section title="Children's Privacy">
          <p>
            Our site is not directed to children under 13, and we do not knowingly collect personal information from children.
          </p>
        </Section>

        <Section title="Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated
            revision date.
          </p>
        </Section>

        <Section title="Contact Us">
          <p>
            If you have questions about this Privacy Policy, please{' '}
            <a href="mailto:hello@allyouneedislists.com" className="text-[#E63946] font-semibold hover:underline">
              contact us
            </a>.
          </p>
        </Section>
      </div>
    </div>
  )
}
