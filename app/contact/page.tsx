import type { Metadata } from 'next'
import { Mail, Sparkles, Clock } from 'lucide-react'
import { LogoMark } from '@/components/Logo'

export const metadata: Metadata = {
  title: 'Get Listed',
  description: 'Want your business, product or service featured in one of our lists? Get in touch.',
}

const W = 'max-w-[1380px]'

export default function ContactPage() {
  return (
    <div className={`${W} mx-auto px-4 py-2`}>

      {/* Floating dark hero */}
      <div className="relative overflow-hidden rounded-3xl bg-[#151515] border border-white/[0.06] shadow-2xl shadow-black/30 px-6 md:px-10 py-12 md:py-16 mb-8 text-center">
        <div className="absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full opacity-[0.15] blur-3xl pointer-events-none bg-[#E63946]" />
        <div className="absolute -bottom-24 -right-24 w-[420px] h-[420px] rounded-full opacity-[0.1] blur-3xl pointer-events-none bg-[#38bdf8]" />
        <div className="relative max-w-2xl mx-auto">
          <div className="flex justify-center mb-6">
            <LogoMark size={48} />
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white leading-tight mb-4">Get Listed</h1>
          <p className="text-lg md:text-xl font-medium text-gray-400 leading-snug">
            Want your brand, product, or service featured in one of our lists?<br className="hidden md:block" /> We&apos;d love to hear from you.
          </p>
        </div>
      </div>

      {/* Perks strip */}
      <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        {[
          { icon: Sparkles, label: 'Curated placements', sub: 'Only relevant categories' },
          { icon: Clock, label: 'Fast response', sub: 'Within 2–3 business days' },
          { icon: Mail, label: 'Direct line', sub: 'hello@allyouneedislists.com' },
        ].map(({ icon: Icon, label, sub }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#E63946] to-[#ff8a5c] flex items-center justify-center flex-shrink-0">
              <Icon size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">{label}</p>
              <p className="text-xs text-gray-500">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.05)] p-8 md:p-10 mb-12">
        <h2 className="text-xl font-black text-gray-900 mb-6">Send us a message</h2>
        <form
          action="mailto:hello@allyouneedislists.com"
          method="get"
          encType="text/plain"
          className="space-y-5"
        >
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="name">
              Your name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="Jane Smith"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#E63946] focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="jane@company.com"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#E63946] focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="website">
              Website / product URL
            </label>
            <input
              id="website"
              name="website"
              type="url"
              placeholder="https://yoursite.com"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#E63946] focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="message">
              What would you like to be listed for?
            </label>
            <textarea
              id="message"
              name="body"
              required
              rows={5}
              placeholder="Tell us about your brand and which category or list you think you'd be a great fit for..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#E63946] focus:border-transparent transition resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#E63946] to-[#ff6b5c] hover:shadow-[0_6px_20px_rgba(230,57,70,0.5)] text-white font-bold py-3.5 rounded-full transition-shadow text-sm"
          >
            Send Message
          </button>
        </form>
      </div>

      <p className="text-center text-sm text-gray-400 mb-12">
        Or email us directly at{' '}
        <a href="mailto:hello@allyouneedislists.com" className="text-[#E63946] font-semibold hover:underline">
          hello@allyouneedislists.com
        </a>
      </p>

    </div>
  )
}
