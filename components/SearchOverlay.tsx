'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Search, X, ArrowRight, Loader2 } from 'lucide-react'
import { urlFor } from '@/sanity/lib/image'
import { catColor, stripHtml } from './DarkCard'

interface SearchResult {
  _id: string
  title: string
  slug: string
  fullPath?: string
  excerpt?: string
  date: string
  featuredImage?: { asset?: { _ref: string; _type: string }; alt?: string }
  categories?: { _id: string; name: string; slug: string }[]
}

export default function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [mounted, setMounted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()

  useEffect(() => setMounted(true), [])

  // Focus input + reset state on open
  useEffect(() => {
    if (open) {
      setActiveIndex(-1)
      const t = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(t)
    } else {
      setQuery('')
      setResults([])
    }
  }, [open])

  // Lock body scroll while open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [open])

  // Debounced fetch
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.trim().length < 2) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`)
        const data = await res.json()
        setResults(data.results || [])
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  const goTo = useCallback((path: string) => {
    onClose()
    router.push(path)
  }, [onClose, router])

  const submitFullSearch = useCallback(() => {
    if (query.trim().length >= 2) goTo(`/search?q=${encodeURIComponent(query.trim())}`)
  }, [query, goTo])

  // Keyboard nav
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, results.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, -1)) }
      if (e.key === 'Enter') {
        e.preventDefault()
        if (activeIndex >= 0 && results[activeIndex]) {
          const r = results[activeIndex]
          goTo(r.fullPath || `/${r.slug}`)
        } else {
          submitFullSearch()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, results, activeIndex, onClose, goTo, submitFullSearch])

  if (!mounted || !open) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[8vh] px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-[640px] bg-[#161616] border border-white/[0.1] rounded-3xl shadow-2xl shadow-black/60 overflow-hidden animate-[slideDown_0.18s_ease-out]">

        {/* Input row */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.07]">
          {loading
            ? <Loader2 size={18} className="text-[#E63946] flex-shrink-0 animate-spin" />
            : <Search size={18} className="text-gray-500 flex-shrink-0" />}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIndex(-1) }}
            placeholder="Search 1,400+ lists…"
            autoComplete="off"
            className="flex-1 bg-transparent text-white placeholder-gray-500 text-[15px] font-medium focus:outline-none"
          />
          <button
            onClick={onClose}
            aria-label="Close search"
            className="flex items-center justify-center w-7 h-7 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-gray-400 hover:text-white transition-all flex-shrink-0"
          >
            <X size={13} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {query.trim().length < 2 ? (
            <div className="px-6 py-10 text-center text-gray-500">
              <p className="text-sm">Start typing to search titles &amp; topics</p>
              <p className="text-xs mt-1.5 text-gray-600">Try &ldquo;AI tools&rdquo;, &ldquo;travel&rdquo;, &ldquo;productivity&rdquo;</p>
            </div>
          ) : !loading && results.length === 0 ? (
            <div className="px-6 py-10 text-center text-gray-500">
              <p className="text-sm">No results for &ldquo;{query}&rdquo;</p>
            </div>
          ) : (
            <div className="p-2">
              {results.map((r, i) => {
                const cat = r.categories?.[0]
                const color = catColor(cat?.slug)
                const img = r.featuredImage?.asset ? urlFor(r.featuredImage).width(120).height(80).fit('crop').url() : null
                const path = r.fullPath || `/${r.slug}`
                return (
                  <button
                    key={r._id}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => goTo(path)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-colors ${
                      activeIndex === i ? 'bg-white/[0.08]' : 'hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="relative w-14 h-10 rounded-lg overflow-hidden bg-[#262626] flex-shrink-0">
                      {img && <Image src={img} alt="" fill className="object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      {cat && (
                        <span className="text-[9px] font-black uppercase tracking-wider" style={{ color }}>{cat.name}</span>
                      )}
                      <h4 className="text-white text-[13.5px] font-bold leading-snug line-clamp-1">{r.title}</h4>
                      {r.excerpt && (
                        <p className="text-gray-500 text-[11.5px] line-clamp-1">{stripHtml(r.excerpt)}</p>
                      )}
                    </div>
                    <ArrowRight size={13} className="text-gray-600 flex-shrink-0" />
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer CTA */}
        {query.trim().length >= 2 && results.length > 0 && (
          <button
            onClick={submitFullSearch}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 border-t border-white/[0.07] text-[12.5px] font-bold text-[#E63946] hover:text-white hover:bg-white/[0.04] transition-colors uppercase tracking-wide"
          >
            View all results for &ldquo;{query}&rdquo; <ArrowRight size={12} />
          </button>
        )}
      </div>
    </div>,
    document.body
  )
}
