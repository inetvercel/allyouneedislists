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
    <header className="bg-[#111111] sticky top-0 z-50 border-b border-white/[0.07]">
      <div className="max-w-[1380px] mx-auto px-4 lg:px-6">
        <div className="flex items-center h-[48px] gap-0">

          {/* Logo */}
          <Link href="/" className="flex-shrink-0 flex items-center mr-5">
            <span className="flex items-center bg-white px-2 py-1">
              <Image
                src="https://cdn.sanity.io/images/1z2ohlkj/production/fac14359f6d086b9c7df3f474e9aa22b09f53719-1585x527.png"
                alt="All You Need Is Lists"
                width={160}
                height={53}
                className="h-[28px] w-auto object-contain"
                priority
              />
            </span>
          </Link>

          {/* Desktop Nav — flat ALL CAPS links, no rounded backgrounds */}
          <nav className="hidden lg:flex items-center flex-1 min-w-0 h-full">
            {NAV.map((item) => {
              const active = isActive(item.href)
              return (
                <div
                  key={item.label}
                  className="relative h-full flex items-center"
                  onMouseEnter={() => item.children && openDropdown(item.label)}
                  onMouseLeave={() => item.children && scheduleClose()}
                >
                  <Link
                    href={item.href}
                    className={`flex items-center gap-0.5 px-3 h-full text-[11px] font-bold uppercase tracking-[0.07em] transition-colors duration-100 border-b-2 ${
                      active
                        ? 'text-white border-[#E63946]'
                        : 'text-gray-400 hover:text-white border-transparent hover:border-white/20'
                    }`}
                  >
                    {item.label}
                    {item.children && (
                      <ChevronDown size={9} className="ml-0.5 opacity-50 mt-px" />
                    )}
                  </Link>

                  {/* Dropdown */}
                  {item.children && (
                    <div
                      className={`absolute top-full left-0 pt-0 transition-all duration-[140ms] ease-out ${
                        activeDropdown === item.label
                          ? 'opacity-100 translate-y-0 pointer-events-auto'
                          : 'opacity-0 -translate-y-1 pointer-events-none'
                      }`}
                      onMouseEnter={() => openDropdown(item.label)}
                      onMouseLeave={scheduleClose}
                    >
                      <div className="bg-[#1a1a1a] border border-white/[0.1] border-t-2 border-t-[#E63946] shadow-2xl shadow-black/80 min-w-[180px]">
                        <div className="py-1">
                          <Link
                            href={item.href}
                            className="flex items-center px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-[#E63946] transition-colors"
                          >
                            All {item.label} →
                          </Link>
                          <div className="h-px bg-white/[0.06] mx-3 mb-1" />
                          {item.children.map((child) => (
                            <Link
                              key={child.label}
                              href={child.href}
                              className="flex items-center px-4 py-2 text-[12px] font-medium text-gray-400 hover:text-white hover:bg-white/[0.05] transition-colors"
                            >
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

          {/* Right side */}
          <div className="hidden lg:flex items-center gap-0 ml-auto flex-shrink-0 h-full">
            <Link
              href="/contact"
              className="flex items-center px-3 h-full text-[11px] font-black uppercase tracking-[0.07em] text-[#E63946] hover:text-red-400 transition-colors"
            >
              Get Listed
            </Link>
            <div className="w-px h-4 bg-white/[0.12] mx-1" />
            <Link
              href="/search"
              className="flex items-center justify-center w-9 h-full text-gray-400 hover:text-white transition-colors"
              aria-label="Search"
            >
              <Search size={15} />
            </Link>
            <div className="w-px h-4 bg-white/[0.12] mx-1" />
            <Link
              href="/about"
              className="flex items-center px-3 h-full text-[11px] font-bold uppercase tracking-[0.07em] text-gray-400 hover:text-white transition-colors"
            >
              About
            </Link>
          </div>

          {/* Mobile: Search + Hamburger */}
          <div className="lg:hidden ml-auto flex items-center gap-1">
            <Link href="/search" className="flex items-center justify-center w-9 h-9 text-gray-400 hover:text-white transition-colors" aria-label="Search">
              <Search size={16} />
            </Link>
            <button
              className="flex items-center justify-center w-9 h-9 text-gray-300 hover:text-white transition-colors"
              onClick={() => { setMobileOpen(!mobileOpen); if (mobileOpen) setExpandedMobile(null) }}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`lg:hidden overflow-hidden transition-all duration-200 ease-in-out ${
          mobileOpen ? 'max-h-[90vh] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="bg-[#0f0f0f] border-t border-white/[0.07] px-4 py-3 overflow-y-auto max-h-[90vh]">
          <Link
            href="/search"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 mb-2 bg-white/[0.04] border border-white/[0.07] text-gray-400 hover:text-white transition-colors"
          >
            <Search size={14} />
            <span className="text-xs font-medium uppercase tracking-widest">Search lists…</span>
          </Link>

          <div className="space-y-0">
            {[{ label: 'Latest', href: '/' }, { label: 'About', href: '/about' }, { label: 'Get Listed', href: '/contact' }].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center px-4 py-2.5 text-xs font-black uppercase tracking-widest transition-colors ${
                  isActive(item.href) ? 'text-[#E63946]' : 'text-gray-300 hover:text-white'
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
                      className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-black uppercase tracking-widest text-gray-300 hover:text-white transition-colors"
                    >
                      <span className={isActive(item.href) ? 'text-[#E63946]' : ''}>{item.label}</span>
                      <ChevronDown
                        size={12}
                        className={`text-gray-600 transition-transform duration-150 ${expandedMobile === item.label ? 'rotate-180 text-[#E63946]' : ''}`}
                      />
                    </button>
                    <div className={`overflow-hidden transition-all duration-150 ${expandedMobile === item.label ? 'max-h-64' : 'max-h-0'}`}>
                      <div className="ml-4 mb-1 border-l border-white/[0.08]">
                        <Link href={item.href} onClick={() => setMobileOpen(false)}
                          className="flex items-center px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-[#E63946] transition-colors">
                          All {item.label} →
                        </Link>
                        {item.children.map((child) => (
                          <Link key={child.label} href={child.href} onClick={() => setMobileOpen(false)}
                            className="flex items-center px-4 py-2 text-xs text-gray-500 hover:text-white transition-colors">
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <Link href={item.href} onClick={() => setMobileOpen(false)}
                    className={`flex items-center px-4 py-2.5 text-xs font-black uppercase tracking-widest transition-colors ${
                      isActive(item.href) ? 'text-[#E63946]' : 'text-gray-300 hover:text-white'
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
