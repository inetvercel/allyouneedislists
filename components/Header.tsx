'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { ChevronDown, Menu, X, Search } from 'lucide-react'
import { client } from '@/sanity/lib/client'

type NavChild = { label: string; href: string }
type NavItem = { label: string; href: string; slug: string; children?: NavChild[] }

const ALL_NAV: NavItem[] = [
  {
    label: 'AI',
    href: '/category/ai',
    slug: 'ai',
    children: [
      { label: 'AI Tools', href: '/category/ai-tools' },
      { label: 'AI Models', href: '/category/ai-models' },
      { label: 'ChatGPT', href: '/category/chatgpt' },
      { label: 'Productivity', href: '/category/productivity' },
    ],
  },
  {
    label: 'Business',
    href: '/category/business',
    slug: 'business',
    children: [
      { label: 'Marketing', href: '/category/marketing' },
      { label: 'Finance', href: '/category/finance' },
      { label: 'SEO', href: '/category/seo' },
      { label: 'Startups', href: '/category/startups' },
    ],
  },
  {
    label: 'Technology',
    href: '/category/technology',
    slug: 'technology',
    children: [
      { label: 'Software', href: '/category/software' },
      { label: 'Hardware', href: '/category/hardware' },
      { label: 'Internet', href: '/category/internet' },
      { label: 'Programming', href: '/category/programming' },
    ],
  },
  {
    label: 'Entertainment',
    href: '/category/entertainment',
    slug: 'entertainment',
    children: [
      { label: 'Movies', href: '/category/movies' },
      { label: 'TV', href: '/category/tv' },
      { label: 'Gaming', href: '/category/gaming' },
      { label: 'Music', href: '/category/music' },
    ],
  },
  { label: 'Travel', href: '/category/travel', slug: 'travel' },
  { label: 'Lifestyle', href: '/category/lifestyle', slug: 'lifestyle' },
  { label: 'Statistics', href: '/category/statistics', slug: 'statistics' },
  { label: 'Directories', href: '/category/directories', slug: 'directories' },
]

export default function Header() {
  const pathname = usePathname()
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [expandedMobile, setExpandedMobile] = useState<string | null>(null)
  const [NAV, setNAV] = useState<NavItem[]>(ALL_NAV)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch only categories that have posts
  useEffect(() => {
    client
      .fetch<{ slug: string }[]>(
        `*[_type=="category" && !defined(parent) && count(*[_type=="post" && !defined(redirectTo) && references(^._id)]) > 0]{ "slug": slug.current }`
      )
      .then((activeSlugs) => {
        const slugSet = new Set(activeSlugs.map((c) => c.slug))
        setNAV(ALL_NAV.filter((item) => slugSet.has(item.slug)))
      })
      .catch(() => {})
  }, [])

  const openDropdown = useCallback((label: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setActiveDropdown(label)
  }, [])

  const scheduleClose = useCallback(() => {
    closeTimer.current = setTimeout(() => setActiveDropdown(null), 150)
  }, [])

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname?.startsWith(href) ?? false

  return (
    <header className="bg-[#0c0c0c] sticky top-0 z-50 shadow-[0_1px_0_rgba(255,255,255,0.06)]">
      {/* Red accent bar */}
      <div className="h-[3px] bg-gradient-to-r from-brand-red via-red-500 to-red-700" />

      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="flex items-center h-[68px] gap-8">

          {/* Logo */}
          <Link href="/" className="flex-shrink-0 flex items-center">
            <Image
              src="https://cdn.sanity.io/images/1z2ohlkj/production/594d0db86b64611dcd111eff3b1a3d0e895d5c48-906x333.jpg"
              alt="All You Need Is Lists"
              width={180}
              height={66}
              className="h-10 w-auto object-contain brightness-0 invert"
              priority
            />
          </Link>

          {/* Divider */}
          <div className="hidden lg:block h-7 w-px bg-white/10 flex-shrink-0" />

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1 flex-1 min-w-0">
            {NAV.map((item) => {
              const active = isActive(item.href)
              return (
                <div
                  key={item.label}
                  className="relative flex-shrink-0"
                  onMouseEnter={() => item.children && openDropdown(item.label)}
                  onMouseLeave={() => item.children && scheduleClose()}
                >
                  <Link
                    href={item.href}
                    className={`relative flex items-center gap-1 px-3 py-2 text-[13px] font-semibold tracking-wide rounded-lg transition-all duration-150 ${
                      active
                        ? 'text-white bg-white/[0.08]'
                        : 'text-gray-400 hover:text-white hover:bg-white/[0.05]'
                    }`}
                  >
                    {active && (
                      <span className="absolute -bottom-[1px] left-3 right-3 h-[2px] bg-brand-red rounded-full" />
                    )}
                    {item.label}
                    {item.children && (
                      <ChevronDown
                        size={11}
                        className={`transition-transform duration-200 mt-px opacity-60 ${
                          activeDropdown === item.label ? 'rotate-180 opacity-100' : ''
                        }`}
                      />
                    )}
                  </Link>

                  {/* Dropdown */}
                  {item.children && (
                    <div
                      className={`absolute top-[calc(100%+6px)] left-0 transition-all duration-[160ms] ease-out ${
                        activeDropdown === item.label
                          ? 'opacity-100 translate-y-0 pointer-events-auto'
                          : 'opacity-0 -translate-y-2 pointer-events-none'
                      }`}
                      onMouseEnter={() => openDropdown(item.label)}
                      onMouseLeave={scheduleClose}
                    >
                      <div className="bg-[#141414] border border-white/[0.1] rounded-2xl shadow-2xl shadow-black/70 overflow-hidden min-w-[190px]">
                        <div className="h-[2px] bg-gradient-to-r from-brand-red to-red-500" />
                        <div className="py-2 px-2">
                          <Link
                            href={item.href}
                            className="flex items-center gap-2 px-3 py-2 mb-1 text-[11px] font-black uppercase tracking-widest text-gray-500 hover:text-brand-red transition-colors rounded-xl"
                          >
                            All {item.label} →
                          </Link>
                          <div className="h-px bg-white/[0.06] mx-2 mb-1" />
                          {item.children.map((child) => (
                            <Link
                              key={child.label}
                              href={child.href}
                              className="group flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium text-gray-300 hover:text-white hover:bg-white/[0.07] rounded-xl transition-all"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-brand-red flex-shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" />
                              {child.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </nav>

          {/* Right side: Latest + Search */}
          <div className="hidden lg:flex items-center gap-2 ml-auto flex-shrink-0">
            <Link
              href="/"
              className={`flex items-center gap-1.5 px-3 py-2 text-[13px] font-semibold rounded-lg transition-all ${
                pathname === '/' ? 'text-white bg-white/[0.08]' : 'text-gray-400 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              Latest
            </Link>
            <Link
              href="/about"
              className="flex items-center gap-1.5 px-3 py-2 text-[13px] font-semibold text-gray-400 hover:text-white hover:bg-white/[0.05] rounded-lg transition-all"
            >
              About
            </Link>
            <div className="w-px h-5 bg-white/10 mx-1" />
            <Link
              href="/search"
              className="flex items-center justify-center w-9 h-9 rounded-xl text-gray-400 hover:text-white hover:bg-white/[0.08] transition-all border border-transparent hover:border-white/10"
              aria-label="Search"
            >
              <Search size={16} />
            </Link>
          </div>

          {/* Mobile: Search + Hamburger */}
          <div className="lg:hidden ml-auto flex items-center gap-2">
            <Link href="/search" className="flex items-center justify-center w-9 h-9 rounded-xl text-gray-400 hover:text-white transition-all" aria-label="Search">
              <Search size={17} />
            </Link>
            <button
              className="flex items-center justify-center w-9 h-9 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-all"
              onClick={() => { setMobileOpen(!mobileOpen); if (mobileOpen) setExpandedMobile(null) }}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          mobileOpen ? 'max-h-[90vh] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="bg-[#0a0a0a] border-t border-white/[0.07] px-4 py-4 overflow-y-auto max-h-[90vh]">
          {/* Mobile search bar */}
          <Link
            href="/search"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 px-4 py-3 mb-3 rounded-2xl bg-white/[0.05] border border-white/[0.08] text-gray-400 hover:text-white transition-colors"
          >
            <Search size={15} />
            <span className="text-sm font-medium">Search lists…</span>
          </Link>

          <div className="space-y-1">
            {/* Latest + About first */}
            {[{ label: 'Latest', href: '/' }, { label: 'About', href: '/about' }].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center px-4 py-3 rounded-2xl text-sm font-bold transition-colors ${
                  isActive(item.href) ? 'text-brand-red bg-red-950/20' : 'text-white hover:bg-white/[0.06]'
                }`}
              >
                {item.label}
              </Link>
            ))}

            <div className="h-px bg-white/[0.06] my-2" />

            {NAV.map((item) => (
              <div key={item.label}>
                {item.children ? (
                  <>
                    <button
                      onClick={() => setExpandedMobile(expandedMobile === item.label ? null : item.label)}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-bold text-white hover:bg-white/[0.06] transition-colors"
                    >
                      <span className={isActive(item.href) ? 'text-brand-red' : ''}>{item.label}</span>
                      <ChevronDown
                        size={15}
                        className={`text-gray-500 transition-transform duration-200 ${expandedMobile === item.label ? 'rotate-180 text-brand-red' : ''}`}
                      />
                    </button>
                    <div className={`overflow-hidden transition-all duration-200 ${expandedMobile === item.label ? 'max-h-64' : 'max-h-0'}`}>
                      <div className="mx-3 mb-2 bg-white/[0.03] rounded-2xl overflow-hidden border border-white/[0.07]">
                        <div className="h-[2px] bg-gradient-to-r from-brand-red to-red-500" />
                        <div className="p-2 space-y-0.5">
                          <Link href={item.href} onClick={() => setMobileOpen(false)}
                            className="flex items-center px-3 py-1.5 text-[11px] font-black uppercase tracking-widest text-gray-500 hover:text-brand-red transition-colors rounded-xl">
                            All {item.label} →
                          </Link>
                          {item.children.map((child) => (
                            <Link key={child.label} href={child.href} onClick={() => setMobileOpen(false)}
                              className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/[0.05] rounded-xl transition-all">
                              <span className="w-1.5 h-1.5 rounded-full bg-brand-red flex-shrink-0 opacity-50" />
                              {child.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <Link href={item.href} onClick={() => setMobileOpen(false)}
                    className={`flex items-center px-4 py-3 rounded-2xl text-sm font-bold transition-colors ${
                      isActive(item.href) ? 'text-brand-red bg-red-950/20' : 'text-white hover:bg-white/[0.06]'
                    }`}
                  >
                    {item.label}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </header>
  )
}
