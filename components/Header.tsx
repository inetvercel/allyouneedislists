'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, Menu, X, Search, ArrowUpRight } from 'lucide-react'
import { client } from '@/sanity/lib/client'
import SearchOverlay from './SearchOverlay'
import { LogoMark } from './Logo'

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
  const [searchOpen, setSearchOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ⌘K / Ctrl+K shortcut to open search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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
    <>
      {/* Floating glassmorphic pill nav */}
      <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1.5rem)] max-w-[1180px]">
        <div className="flex items-center h-[58px] px-2.5 gap-1 rounded-full bg-[#161616]/85 backdrop-blur-xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.5)]">

          {/* Logo */}
          <Link href="/" className="flex-shrink-0 flex items-center gap-2.5 pl-2 pr-3">
            <LogoMark size={32} />
            <span className="hidden sm:block text-[16px] font-extrabold tracking-tight whitespace-nowrap leading-none">
              <span className="text-white">AllYouNeedIs</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E63946] to-[#ff8a5c]">Lists</span>
            </span>
          </Link>

          <div className="w-px h-6 bg-white/[0.08] flex-shrink-0" />

          {/* Desktop Nav — pill items */}
          <nav className="hidden lg:flex items-center flex-1 min-w-0 gap-0.5 px-1">
            {NAV.map((item) => {
              const active = isActive(item.href)
              return (
                <div
                  key={item.label}
                  className="relative flex items-center"
                  onMouseEnter={() => item.children && openDropdown(item.label)}
                  onMouseLeave={() => item.children && scheduleClose()}
                >
                  <Link
                    href={item.href}
                    className={`flex items-center gap-1 px-3.5 py-2 rounded-full text-[12.5px] font-semibold tracking-tight transition-all duration-150 whitespace-nowrap ${
                      active
                        ? 'text-white bg-white/[0.1]'
                        : 'text-gray-400 hover:text-white hover:bg-white/[0.06]'
                    }`}
                  >
                    {item.label}
                    {item.children && <ChevronDown size={10} className="opacity-50" />}
                  </Link>

                  {/* Dropdown */}
                  {item.children && (
                    <div
                      className={`absolute top-[calc(100%+10px)] left-0 transition-all duration-[160ms] ease-out ${
                        activeDropdown === item.label
                          ? 'opacity-100 translate-y-0 pointer-events-auto'
                          : 'opacity-0 -translate-y-1 pointer-events-none'
                      }`}
                      onMouseEnter={() => openDropdown(item.label)}
                      onMouseLeave={scheduleClose}
                    >
                      <div className="bg-[#181818]/95 backdrop-blur-xl border border-white/[0.1] rounded-2xl shadow-2xl shadow-black/60 overflow-hidden min-w-[190px]">
                        <div className="py-2 px-2">
                          <Link
                            href={item.href}
                            className="flex items-center px-3 py-2 mb-1 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-[#E63946] rounded-xl transition-colors"
                          >
                            All {item.label} →
                          </Link>
                          <div className="h-px bg-white/[0.06] mx-2 mb-1" />
                          {item.children.map((child) => (
                            <Link
                              key={child.label}
                              href={child.href}
                              className="flex items-center px-3 py-2 text-[13px] font-medium text-gray-300 hover:text-white hover:bg-white/[0.07] rounded-xl transition-all"
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
          <div className="hidden lg:flex items-center gap-1.5 ml-auto flex-shrink-0 pr-1">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center justify-center w-9 h-9 rounded-full text-gray-400 hover:text-white hover:bg-white/[0.08] transition-all"
              aria-label="Search"
            >
              <Search size={15} />
            </button>
            <Link
              href="/contact"
              className="flex items-center gap-1.5 pl-3.5 pr-4 py-2 rounded-full bg-gradient-to-r from-[#E63946] to-[#ff6b5c] text-white text-[12.5px] font-bold tracking-tight hover:shadow-[0_4px_16px_rgba(230,57,70,0.5)] transition-shadow whitespace-nowrap"
            >
              Get Listed <ArrowUpRight size={13} />
            </Link>
          </div>

          {/* Mobile: Search + Hamburger */}
          <div className="lg:hidden ml-auto flex items-center gap-1 pr-1">
            <button onClick={() => setSearchOpen(true)} className="flex items-center justify-center w-9 h-9 rounded-full text-gray-400 hover:text-white hover:bg-white/[0.08] transition-all" aria-label="Search">
              <Search size={16} />
            </button>
            <button
              className="flex items-center justify-center w-9 h-9 rounded-full text-gray-300 hover:text-white hover:bg-white/[0.08] transition-all"
              onClick={() => { setMobileOpen(!mobileOpen); if (mobileOpen) setExpandedMobile(null) }}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>

        {/* Mobile menu — floats below the pill */}
        <div
          className={`lg:hidden overflow-hidden transition-all duration-200 ease-in-out ${
            mobileOpen ? 'max-h-[75vh] opacity-100 mt-2' : 'max-h-0 opacity-0 mt-0'
          }`}
        >
          <div className="bg-[#161616]/95 backdrop-blur-xl border border-white/[0.08] rounded-3xl shadow-2xl shadow-black/50 px-3 py-3 overflow-y-auto max-h-[75vh]">
            <button
              onClick={() => { setMobileOpen(false); setSearchOpen(true) }}
              className="w-full flex items-center gap-3 px-4 py-3 mb-2 rounded-2xl bg-white/[0.05] border border-white/[0.07] text-gray-400 hover:text-white transition-colors"
            >
              <Search size={14} />
              <span className="text-xs font-medium uppercase tracking-widest">Search lists…</span>
            </button>

            <div className="space-y-0.5">
              {[{ label: 'Latest', href: '/' }, { label: 'About', href: '/about' }, { label: 'Get Listed', href: '/contact' }].map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-colors ${
                    isActive(item.href) ? 'text-[#E63946] bg-white/[0.05]' : 'text-gray-300 hover:text-white hover:bg-white/[0.05]'
                  }`}
                >
                  {item.label}
                </Link>
              ))}

              <div className="h-px bg-white/[0.07] my-2 mx-2" />

              {NAV.map((item) => (
                <div key={item.label}>
                  {item.children ? (
                    <>
                      <button
                        onClick={() => setExpandedMobile(expandedMobile === item.label ? null : item.label)}
                        className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-300 hover:text-white hover:bg-white/[0.05] transition-colors"
                      >
                        <span className={isActive(item.href) ? 'text-[#E63946]' : ''}>{item.label}</span>
                        <ChevronDown
                          size={12}
                          className={`text-gray-600 transition-transform duration-150 ${expandedMobile === item.label ? 'rotate-180 text-[#E63946]' : ''}`}
                        />
                      </button>
                      <div className={`overflow-hidden transition-all duration-150 ${expandedMobile === item.label ? 'max-h-64' : 'max-h-0'}`}>
                        <div className="ml-4 mb-1 pl-3 border-l border-white/[0.08]">
                          <Link href={item.href} onClick={() => setMobileOpen(false)}
                            className="flex items-center px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-[#E63946] rounded-xl transition-colors">
                            All {item.label} →
                          </Link>
                          {item.children.map((child) => (
                            <Link key={child.label} href={child.href} onClick={() => setMobileOpen(false)}
                              className="flex items-center px-3 py-2 text-xs text-gray-500 hover:text-white rounded-xl transition-colors">
                              {child.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <Link href={item.href} onClick={() => setMobileOpen(false)}
                      className={`flex items-center px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-colors ${
                        isActive(item.href) ? 'text-[#E63946] bg-white/[0.05]' : 'text-gray-300 hover:text-white hover:bg-white/[0.05]'
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

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}
