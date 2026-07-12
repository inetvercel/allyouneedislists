import Link from 'next/link'
import Image from 'next/image'

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

function SocialX() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  )
}

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-[#0c0c0c] border-t border-white/[0.07] text-gray-400 mt-16">

      {/* Main footer grid */}
      <div className="max-w-[1380px] mx-auto px-4 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Brand column */}
          <div className="lg:col-span-1">
            <Link href="/" className="inline-block mb-5">
              <span className="flex items-center bg-white rounded-lg px-2.5 py-1.5 shadow-sm">
                <Image
                  src="https://cdn.sanity.io/images/1z2ohlkj/production/fac14359f6d086b9c7df3f474e9aa22b09f53719-1585x527.png"
                  alt="All You Need Is Lists"
                  width={180}
                  height={60}
                  className="h-8 w-auto object-contain"
                />
              </span>
            </Link>
            <p className="text-sm leading-relaxed mb-5 max-w-[220px]">
              Your go-to destination for the best lists on the internet — top 5s, top 10s, and everything in between.
            </p>
            <div className="flex items-center gap-2">
              <a
                href="https://x.com/allyouneedislists"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow on X"
                className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.06] hover:bg-[#E63946] text-gray-400 hover:text-white transition-all"
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
                  <Link href={l.href} className="text-sm text-gray-400 hover:text-white transition-colors">
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

          {/* Company + newsletter */}
          <div>
            <h3 className="text-white text-[11px] font-black uppercase tracking-widest mb-4">Company</h3>
            <ul className="space-y-2.5 mb-8">
              {COMPANY.map(l => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-gray-400 hover:text-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>

            <h3 className="text-white text-[11px] font-black uppercase tracking-widest mb-3">Stay in the loop</h3>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#E63946] hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors"
            >
              Get in touch →
            </Link>
          </div>

        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/[0.06]">
        <div className="max-w-[1380px] mx-auto px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
          <p>© {currentYear} All You Need Is Lists. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <Link href="/about" className="hover:text-gray-400 transition-colors">Privacy</Link>
            <Link href="/about" className="hover:text-gray-400 transition-colors">Terms</Link>
            <Link href="/contact" className="hover:text-gray-400 transition-colors">Contact</Link>
          </div>
        </div>
      </div>

    </footer>
  )
}
