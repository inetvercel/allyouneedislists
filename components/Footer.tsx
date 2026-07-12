import Link from 'next/link'
import { LogoMark } from './Logo'
import { catColor } from '@/lib/categoryColors'

const BROWSE = [
  { label: 'AI & Tools',     href: '/category/ai' },
  { label: 'Technology',     href: '/category/technology' },
  { label: 'Business',       href: '/category/business' },
  { label: 'Entertainment',  href: '/category/entertainment' },
  { label: 'Lifestyle',      href: '/category/lifestyle' },
  { label: 'Travel',         href: '/category/travel' },
]

const POPULAR = [
  { label: 'Best Productivity Apps',     href: '/category/productivity' },
  { label: 'Best AI Tools',              href: '/category/ai-tools' },
  { label: 'Best Password Managers',     href: '/category/software' },
  { label: 'Best Note-Taking Apps',      href: '/category/software' },
  { label: 'Best Project Management',    href: '/category/business' },
]

const COMPANY = [
  { label: 'About Us',    href: '/about' },
  { label: 'Contact',     href: '/contact' },
  { label: 'Latest',      href: '/' },
]

function dotColor(href: string) {
  const slug = href.split('/').pop() || ''
  return catColor(slug)
}

function SocialX() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  )
}

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="px-3 md:px-4 pb-4 mt-16">
      <div className="max-w-[1380px] mx-auto relative overflow-hidden rounded-[32px] bg-[#111111] border border-white/[0.07] shadow-2xl shadow-black/30 text-gray-400">

        {/* Ambient glow */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-[0.1] blur-3xl pointer-events-none" style={{ backgroundColor: '#E63946' }} />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full opacity-[0.08] blur-3xl pointer-events-none" style={{ backgroundColor: '#38bdf8' }} />

        {/* Newsletter banner */}
        <div className="relative px-6 md:px-10 pt-9 md:pt-10 pb-8">
          <div className="rounded-3xl bg-white/[0.04] border border-white/[0.06] px-6 md:px-9 py-7 md:py-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-white text-xl md:text-2xl font-black mb-1.5">Never miss a great list</h3>
              <p className="text-gray-400 text-sm">Fresh top 10s and curated picks, straight to your inbox.</p>
            </div>
            <Link
              href="/contact"
              className="flex-shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[#E63946] to-[#ff8a5c] text-white text-sm font-bold hover:shadow-[0_6px_20px_rgba(230,57,70,0.5)] transition-shadow whitespace-nowrap"
            >
              Get in touch →
            </Link>
          </div>
        </div>

        {/* Main footer grid */}
        <div className="relative px-6 md:px-10 pb-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr] gap-10">

            {/* Brand column */}
            <div>
              <Link href="/" className="inline-flex items-center gap-2.5 mb-5">
                <LogoMark size={32} />
                <span className="text-[16px] font-extrabold tracking-tight leading-none">
                  <span className="text-white">AllYouNeedIs</span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E63946] to-[#ff8a5c]">Lists</span>
                </span>
              </Link>
              <p className="text-sm leading-relaxed mb-5 max-w-[240px]">
                Your go-to destination for the best lists on the internet — top 5s, top 10s, and everything in between.
              </p>
              <div className="flex items-center gap-2">
                <a
                  href="https://x.com/allyouneedislists"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Follow on X"
                  className="flex items-center justify-center w-9 h-9 rounded-full bg-white/[0.06] hover:bg-[#E63946] text-gray-400 hover:text-white transition-all"
                >
                  <SocialX />
                </a>
              </div>
            </div>

            {/* Browse categories */}
            <div>
              <h3 className="text-white text-[11px] font-black uppercase tracking-widest mb-4">Browse</h3>
              <ul className="space-y-2.5">
                {BROWSE.map(l => (
                  <li key={l.href}>
                    <Link href={l.href} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors group">
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: dotColor(l.href) }} />
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Popular lists */}
            <div>
              <h3 className="text-white text-[11px] font-black uppercase tracking-widest mb-4">Popular Lists</h3>
              <ul className="space-y-2.5">
                {POPULAR.map(l => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-sm text-gray-400 hover:text-white transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className="text-white text-[11px] font-black uppercase tracking-widest mb-4">Company</h3>
              <ul className="space-y-2.5">
                {COMPANY.map(l => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-gray-400 hover:text-white transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>

        {/* Bottom bar */}
        <div className="relative border-t border-white/[0.07] mx-6 md:mx-10" />
        <div className="relative px-6 md:px-10 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
          <p>© {currentYear} All You Need Is Lists. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <Link href="/privacy" className="hover:text-gray-400 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-400 transition-colors">Terms</Link>
            <Link href="/contact" className="hover:text-gray-400 transition-colors">Contact</Link>
          </div>
        </div>

      </div>
    </footer>
  )
}
