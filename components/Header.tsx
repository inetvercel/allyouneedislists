'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { ChevronDown, Menu, X, Search } from 'lucide-react'

type NavChild = { label: string; href: string }
type NavItem = { label: string; href: string; children?: NavChild[] }

const NAV: NavItem[] = [
  {
    label: 'AI',
    href: '/category/ai',
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
    children: [
      { label: 'Marketing', href: '/category/marketing' },
      { label: 'SEO', href: '/category/seo' },
      { label: 'Finance', href: '/category/finance' },
      { label: 'Startups', href: '/category/startups' },
    ],
  },
  {
    label: 'Technology',
    href: '/category/technology',
    children: [
      { label: 'Software', href: '/category/software' },
      { label: 'Hardware', href: '/category/hardware' },
      { label: 'Programming', href: '/category/programming' },
      { label: 'Internet', href: '/category/internet' },
    ],
  },
  {
    label: 'Entertainment',
    href: '/category/entertainment',
    children: [
      { label: 'Movies', href: '/category/movies' },
      { label: 'TV', href: '/category/tv' },
      { label: 'Gaming', href: '/category/gaming' },
      { label: 'Music', href: '/category/music' },
    ],
  },
  { label: 'Travel', href: '/category/travel' },
  { label: 'Lifestyle', href: '/category/lifestyle' },
  { label: 'Statistics', href: '/category/statistics' },
  { label: 'Directories', href: '/category/directories' },
  { label: 'Latest', href: '/' },
  { label: 'About', href: '/about' },
]

export default function Header() {
  const pathname = usePathname()
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [expandedMobile, setExpandedMobile] = useState<string | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const openDropdown = useCallback((label: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setActiveDropdown(label)
  }, [])

  const scheduleClose = useCallback(() => {
    closeTimer.current = setTimeout(() => setActiveDropdown(null), 120)
  }, [])

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname?.startsWith(href) ?? false

  return (
    <header className="bg-brand-dark sticky top-0 z-50">
      {/* Signature red top line */}
      <div className="h-0.5 bg-brand-red" />

      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        <div className="flex items-center h-[60px] gap-6">

          {/* Logo */}
          <Link href="/" className="flex-shrink-0 flex items-center group">
            <Image
              src="https://cdn.sanity.io/images/1z2ohlkj/production/b369cbd326864947b294e4298083fdde378e27a3-876x588.png"
              alt="All You Need Is Lists"
              width={132}
              height={89}
              className="h-9 w-auto object-contain"
              priority
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-0 flex-1 min-w-0">
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
                    className={`flex items-center gap-[3px] px-2.5 py-2 text-[13px] font-semibold tracking-wide rounded-md transition-colors ${
                      active
                        ? 'text-brand-red'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {item.label}
                    {item.children && (
                      <ChevronDown
                        size={12}
                        className={`transition-transform duration-200 mt-px ${
                          activeDropdown === item.label ? 'rotate-180 text-white' : ''
                        }`}
                      />
                    )}
                    {active && (
                      <span className="absolute bottom-0 left-2.5 right-2.5 h-0.5 bg-brand-red rounded-full" />
                    )}
                  </Link>

                  {/* Dropdown */}
                  {item.children && (
                    <div
                      className={`absolute top-[calc(100%+4px)] left-0 transition-all duration-[180ms] ease-out ${
                        activeDropdown === item.label
                          ? 'opacity-100 translate-y-0 pointer-events-auto'
                          : 'opacity-0 -translate-y-1.5 pointer-events-none'
                      }`}
                      onMouseEnter={() => openDropdown(item.label)}
                      onMouseLeave={scheduleClose}
                    >
                      <div className="bg-[#111111] border border-white/[0.08] rounded-xl shadow-2xl shadow-black/60 overflow-hidden min-w-[168px]">
                        <div className="h-[2px] bg-gradient-to-r from-brand-red to-red-400" />
                        <div className="p-1.5">
                          <Link
                            href={item.href}
                            className="flex items-center gap-2 px-3 py-1.5 mb-0.5 text-[11px] font-bold uppercase tracking-widest text-gray-500 hover:text-brand-red transition-colors rounded-lg"
                          >
                            All {item.label}
                          </Link>
                          {item.children.map((child) => (
                            <Link
                              key={child.label}
                              href={child.href}
                              className="group flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-gray-300 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all"
                            >
                              <span className="w-1 h-1 rounded-full bg-brand-red flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
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

          {/* Desktop search icon */}
          <Link
            href="/search"
            className="hidden lg:flex items-center justify-center w-9 h-9 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all ml-auto flex-shrink-0"
            aria-label="Search"
          >
            <Search size={17} />
          </Link>

          {/* Mobile hamburger */}
          <button
            className="lg:hidden ml-auto flex items-center justify-center w-9 h-9 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-all"
            onClick={() => {
              setMobileOpen(!mobileOpen)
              if (mobileOpen) setExpandedMobile(null)
            }}
            aria-label="Toggle menu"
          >
            <div className={`transition-all duration-200 ${mobileOpen ? 'rotate-90 opacity-0 absolute' : 'rotate-0 opacity-100'}`}>
              <Menu size={20} />
            </div>
            <div className={`transition-all duration-200 ${mobileOpen ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0 absolute'}`}>
              <X size={20} />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`lg:hidden border-t border-white/[0.06] transition-all duration-300 ease-in-out overflow-hidden ${
          mobileOpen ? 'max-h-[85vh] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="bg-[#0a0a0a] px-4 py-3 overflow-y-auto max-h-[85vh]">
          <Link
            href="/search"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 px-4 py-3 mb-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-gray-400 hover:text-white transition-colors"
          >
            <Search size={15} />
            <span className="text-sm font-medium">Search 1,400+ lists…</span>
          </Link>
          <div className="space-y-0.5">
            {NAV.map((item) => (
              <div key={item.label}>
                {item.children ? (
                  <>
                    <button
                      onClick={() =>
                        setExpandedMobile(expandedMobile === item.label ? null : item.label)
                      }
                      className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold text-white hover:bg-white/[0.06] transition-colors"
                    >
                      <span>{item.label}</span>
                      <ChevronDown
                        size={15}
                        className={`text-gray-500 transition-transform duration-200 ${
                          expandedMobile === item.label ? 'rotate-180 text-brand-red' : ''
                        }`}
                      />
                    </button>

                    <div
                      className={`overflow-hidden transition-all duration-250 ${
                        expandedMobile === item.label ? 'max-h-56' : 'max-h-0'
                      }`}
                    >
                      <div className="mx-4 mb-2 bg-white/[0.03] rounded-xl overflow-hidden border border-white/[0.06]">
                        <div className="h-[2px] bg-gradient-to-r from-brand-red to-red-400" />
                        <div className="p-2 space-y-0.5">
                          <Link
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                            className="flex items-center px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-gray-500 hover:text-brand-red transition-colors rounded-lg"
                          >
                            All {item.label}
                          </Link>
                          {item.children.map((child) => (
                            <Link
                              key={child.label}
                              href={child.href}
                              onClick={() => setMobileOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/[0.05] rounded-lg transition-all"
                            >
                              <span className="w-1 h-1 rounded-full bg-brand-red flex-shrink-0" />
                              {child.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center px-4 py-3 rounded-xl text-sm font-bold transition-colors ${
                      isActive(item.href)
                        ? 'text-brand-red bg-red-950/30'
                        : 'text-white hover:bg-white/[0.06]'
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
