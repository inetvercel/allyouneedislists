import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Get Listed',
  description: 'Want your business, product or service featured in one of our lists? Get in touch.',
}

export default function ContactPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16">

      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-[#E63946] rounded-2xl mb-6">
          <span className="text-white text-2xl font-black">#</span>
        </div>
        <h1 className="text-4xl font-black text-gray-900 mb-4">Get Listed</h1>
        <p className="text-lg text-gray-500 leading-relaxed">
          Want your brand, product, or service featured in one of our lists?
          We&apos;d love to hear from you.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Send us a message</h2>
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
            className="w-full bg-[#E63946] hover:bg-[#c1121f] text-white font-bold py-3.5 rounded-xl transition text-sm"
          >
            Send Message
          </button>
        </form>
      </div>

      <p className="text-center text-sm text-gray-400">
        Or email us directly at{' '}
        <a href="mailto:hello@allyouneedislists.com" className="text-[#E63946] font-semibold hover:underline">
          hello@allyouneedislists.com
        </a>
      </p>

    </div>
  )
}
