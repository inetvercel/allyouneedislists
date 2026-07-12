import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, TrendingUp, Flame } from 'lucide-react'
import { client } from '@/sanity/lib/client'
import {
  getLatestPostsQuery,
  getLatestPostsCountQuery,
  getHomepageSectionsQuery,
} from '@/sanity/lib/queries'
import { urlFor } from '@/sanity/lib/image'
import PostCard from '@/components/PostCard'
import Pagination from '@/components/Pagination'
import type { PostCard as PostCardType } from '@/types'

const PER_PAGE = 18
const W = 'max-w-[1380px]'

export const metadata: Metadata = {
  title: 'All You Need Is Lists — The Best Curated Lists on the Internet',
  description: 'Discover top 10s, best-of lists and expert picks across AI, tech, business, entertainment, travel and more.',
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function stripHtml(h: string) { return h.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim() }

// ── Shared UI ──────────────────────────────────────────────────────────────────

function SectionRule({ label, href, icon }: { label: string; href: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-6 border-b-2 border-gray-900 pb-3">
      <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-gray-900">
        {icon}{label}
      </h2>
      <Link href={href} className="flex items-center gap-1 text-[11px] font-bold text-[#E63946] hover:text-red-700 uppercase tracking-wide transition-colors">
        See all <ArrowRight size={11} />
      </Link>
    </div>
  )
}

// ── Dark hero (Ars Technica style) ────────────────────────────────────────────

function ArsStoryRow({ post }: { post: PostCardType }) {
  const href = post.fullPath || `/${post.slug}`
  const cat  = post.categories?.[0]
  const img  = post.featuredImage?.asset ? urlFor(post.featuredImage).width(160).height(110).fit('crop').url() : null
  return (
    <Link href={href} className="group flex gap-3.5 items-start py-3.5 border-b border-white/[0.07] last:border-0 -mx-2 px-2 rounded-lg hover:bg-white/[0.04] transition-colors">
      <div className="relative flex-shrink-0 w-[72px] h-[50px] rounded overflow-hidden bg-gray-800">
        {img && <Image src={img} alt={post.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />}
      </div>
      <div className="flex-1 min-w-0">
        {cat && <span className="text-[8px] font-black uppercase tracking-widest text-[#E63946]">{cat.name}</span>}
        <h4 className="text-[0.85rem] font-bold text-gray-200 leading-snug line-clamp-2 group-hover:text-white transition-colors mt-0.5">{post.title}</h4>
        <time className="text-[10px] text-gray-600 mt-0.5 block">{formatDate(post.date)}</time>
      </div>
    </Link>
  )
}

function ArsFeatured({ post }: { post: PostCardType }) {
  const href = post.fullPath || `/${post.slug}`
  const cat  = post.categories?.[0]
  const img  = post.featuredImage?.asset ? urlFor(post.featuredImage).width(900).height(600).fit('crop').url() : null
  return (
    <Link href={href} className="group relative flex overflow-hidden rounded-sm h-full min-h-[360px]">
      {img ? <Image src={img} alt={post.title} fill className="object-cover group-hover:scale-[1.02] transition-transform duration-700" priority /> : <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-700" />}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent" />
      <div className="absolute top-3 right-3">
        <span className="px-2 py-0.5 bg-[#E63946] text-white text-[8px] font-black uppercase tracking-widest rounded-sm">Featured</span>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-5 md:p-7">
        {cat && <span className="text-[9px] font-black uppercase tracking-widest text-[#E63946] mb-2 block">{cat.name}</span>}
        <h2 className="text-xl md:text-2xl lg:text-3xl font-black text-white leading-tight mb-2 group-hover:text-red-100 transition-colors">{post.title}</h2>
        {post.excerpt && <p className="text-white/60 text-sm line-clamp-2 mb-3 hidden md:block">{stripHtml(post.excerpt)}</p>}
        <time className="text-[11px] text-white/40">{formatDate(post.date)}</time>
      </div>
    </Link>
  )
}

// ── Full-bleed overlay card (Ars card grid) ────────────────────────────────────

function ArsCard({ post }: { post: PostCardType }) {
  const href = post.fullPath || `/${post.slug}`
  const cat  = post.categories?.[0]
  const img  = post.featuredImage?.asset ? urlFor(post.featuredImage).width(600).height(420).fit('crop').url() : null
  return (
    <Link href={href} className="group relative block overflow-hidden bg-gray-900" style={{ aspectRatio: '3/2' }}>
      {img ? <Image src={img} alt={post.title} fill className="object-cover group-hover:scale-[1.04] transition-transform duration-500" />
            : <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-700" />}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-4">
        {cat && <span className="text-[8px] font-black uppercase tracking-widest text-[#E63946] mb-1.5 block">{cat.name}</span>}
        <h3 className="text-white font-bold text-[0.9rem] leading-snug line-clamp-2 group-hover:text-red-200 transition-colors mb-1.5">{post.title}</h3>
        {post.excerpt && <p className="text-white/50 text-[11px] line-clamp-2 mb-2 hidden sm:block">{stripHtml(post.excerpt)}</p>}
        <time className="text-white/35 text-[10px]">{formatDate(post.date)}</time>
      </div>
    </Link>
  )
}

// ── Card components ────────────────────────────────────────────────────────────

function EditorialCard({ post, size = 'md' }: { post: PostCardType; size?: 'lg' | 'md' | 'sm' }) {
  const href = post.fullPath || `/${post.slug}`
  const cat  = post.categories?.[0]
  const w    = size === 'lg' ? 900 : size === 'md' ? 600 : 400
  const img  = post.featuredImage?.asset ? urlFor(post.featuredImage).width(w).height(Math.round(w * 0.6)).fit('crop').url() : null
  return (
    <Link href={href} className="group flex flex-col overflow-hidden rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow duration-200 h-full border border-gray-100">
      <div className="relative overflow-hidden bg-gray-100" style={{ aspectRatio: '16/9' }}>
        {img ? <Image src={img} alt={post.title} fill className="object-cover group-hover:scale-[1.03] transition-transform duration-500" />
              : <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200" />}
        {cat && <span className="absolute top-2.5 left-2.5 px-1.5 py-0.5 bg-[#E63946] text-white text-[8px] font-black uppercase tracking-[0.12em] rounded-sm">{cat.name}</span>}
      </div>
      <div className="p-3.5 flex flex-col flex-1">
        {cat && <span className="text-[9px] font-black uppercase tracking-[0.12em] text-[#E63946] mb-1">{cat.name}</span>}
        <h3 className={`font-bold text-gray-900 leading-snug line-clamp-2 group-hover:text-[#E63946] transition-colors ${size === 'lg' ? 'text-lg mb-2' : 'text-[0.9rem] mb-1'}`}>{post.title}</h3>
        {post.excerpt && size === 'lg' && <p className="text-gray-500 text-sm leading-relaxed line-clamp-2 mb-3 flex-1">{stripHtml(post.excerpt)}</p>}
        <time className="text-[10px] text-gray-400 mt-auto">{formatDate(post.date)}</time>
      </div>
    </Link>
  )
}

function RowCard({ post, index }: { post: PostCardType; index: number }) {
  const href = post.fullPath || `/${post.slug}`
  const cat  = post.categories?.[0]
  const img  = post.featuredImage?.asset ? urlFor(post.featuredImage).width(200).height(140).fit('crop').url() : null
  return (
    <Link href={href} className="group flex items-center gap-3 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors">
      <span className="text-[13px] font-black text-[#E63946] w-5 text-center flex-shrink-0 tabular-nums">{index + 1}</span>
      <div className="relative flex-shrink-0 w-[62px] h-[44px] rounded overflow-hidden bg-gray-100">
        {img && <Image src={img} alt={post.title} fill className="object-cover" />}
      </div>
      <div className="flex-1 min-w-0">
        {cat && <span className="text-[8px] font-black uppercase tracking-[0.12em] text-[#E63946]">{cat.name}</span>}
        <h4 className="text-[0.82rem] font-bold text-gray-800 leading-snug line-clamp-2 group-hover:text-[#E63946] transition-colors mt-0.5">{post.title}</h4>
      </div>
    </Link>
  )
}

function InlineCard({ post }: { post: PostCardType }) {
  const href = post.fullPath || `/${post.slug}`
  const cat  = post.categories?.[0]
  const img  = post.featuredImage?.asset ? urlFor(post.featuredImage).width(220).height(150).fit('crop').url() : null
  return (
    <Link href={href} className="group flex gap-3 items-center py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 -mx-1 px-1 rounded transition-colors">
      <div className="relative flex-shrink-0 w-[72px] h-[50px] rounded overflow-hidden bg-gray-100">
        {img && <Image src={img} alt={post.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />}
      </div>
      <div className="flex-1 min-w-0">
        {cat && <span className="text-[8px] font-black uppercase tracking-[0.12em] text-[#E63946]">{cat.name}</span>}
        <h4 className="text-[0.82rem] font-semibold text-gray-800 leading-snug line-clamp-2 group-hover:text-[#E63946] transition-colors mt-0.5">{post.title}</h4>
      </div>
    </Link>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function HomePage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams
  const page   = Math.max(1, parseInt(params.page || '1', 10))

  if (page > 1) {
    const start = (page - 1) * PER_PAGE
    const end   = start + PER_PAGE
    const [posts, total] = await Promise.all([
      client.fetch(getLatestPostsQuery, { start, end }, { next: { revalidate: 300 } }).catch(() => []),
      client.fetch(getLatestPostsCountQuery, {}, { next: { revalidate: 300 } }).catch(() => 0),
    ])
    return (
      <div className="bg-white min-h-screen">
        <div className={`${W} mx-auto px-4 py-10`}>
          <div className="border-b-2 border-gray-900 pb-3 mb-7">
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-900">All Lists — Page {page}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post: PostCardType) => <PostCard key={post._id} post={post} />)}
          </div>
          <Pagination currentPage={page} totalPages={Math.ceil(total / PER_PAGE)} basePath="/" />
        </div>
      </div>
    )
  }

  const [latest, sections, total] = await Promise.all([
    client.fetch(getLatestPostsQuery, { start: 0, end: 15 }, { next: { revalidate: 300 } }).catch(() => []),
    client.fetch(getHomepageSectionsQuery, {}, { next: { revalidate: 300 } }).catch(() => ({})),
    client.fetch(getLatestPostsCountQuery, {}, { next: { revalidate: 300 } }).catch(() => 0),
  ])

  const heroMain: PostCardType | null   = latest[0] ?? null
  const heroSubs: PostCardType[]        = latest.slice(1, 3)
  const freshLead: PostCardType | null  = latest[3] ?? null
  const freshSmall: PostCardType[]      = latest.slice(4, 7)
  const trending: PostCardType[]        = latest.slice(7, 13)
  const S = sections as Record<string, PostCardType[]>

  return (
    <div className="bg-white min-h-screen">

      {/* ── ARS-STYLE DARK HERO ── */}
      <section className="bg-[#0c0c0c]">
        <div className={`${W} mx-auto px-4 py-7`}>
          <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-0 lg:gap-6 min-h-[380px]">
            {/* Left: story list */}
            <div className="border-b lg:border-b-0 lg:border-r border-white/[0.08] pb-4 lg:pb-0 lg:pr-6 flex flex-col justify-center">
              <div className="text-[10px] font-black uppercase tracking-widest text-[#E63946] mb-3 flex items-center gap-1.5">
                <Flame size={10} /> Latest
              </div>
              {[heroMain, ...heroSubs, freshLead, ...freshSmall.slice(0, 1)].filter(Boolean).slice(0, 5).map(p =>
                p ? <ArsStoryRow key={p._id} post={p} /> : null
              )}
            </div>
            {/* Right: featured big story */}
            <div className="mt-4 lg:mt-0">
              {trending[0] && <ArsFeatured post={trending[0]} />}
            </div>
          </div>
        </div>
      </section>

      {/* ── FRESH THIS WEEK cards + TRENDING SIDEBAR ── */}
      <section className={`${W} mx-auto px-4 pt-10`}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2">
            <SectionRule label="Fresh This Week" href="/latest" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1">
              {[freshLead, ...freshSmall].filter(Boolean).slice(0, 3).map(p =>
                p ? <ArsCard key={p._id} post={p} /> : null
              )}
            </div>
          </div>
          <div>
            <SectionRule label="Trending" href="/latest" icon={<TrendingUp size={13} className="text-[#E63946]" />} />
            {trending.slice(1).map((p, i) => <RowCard key={p._id} post={p} index={i} />)}
          </div>
        </div>
      </section>

      {/* ── TECHNOLOGY — 4 equal cards ── */}
      {(S.technology?.length ?? 0) > 0 && (
        <section className={`${W} mx-auto px-4 pt-14`}>
          <SectionRule label="Technology" href="/category/technology" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {S.technology.map(p => <EditorialCard key={p._id} post={p} size="sm" />)}
          </div>
        </section>
      )}

      {/* ── ENTERTAINMENT — large + 3 inline ── */}
      {(S.entertainment?.length ?? 0) > 0 && (
        <section className="bg-gray-50 mt-14 py-12">
          <div className={`${W} mx-auto px-4`}>
            <SectionRule label="Entertainment" href="/category/entertainment" />
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3">
                {S.entertainment[0] && <EditorialCard post={S.entertainment[0]} size="lg" />}
              </div>
              <div className="lg:col-span-2 divide-y divide-gray-100">
                {S.entertainment.slice(1, 4).map(p => <InlineCard key={p._id} post={p} />)}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── BUSINESS — large lead + 2 smaller side by side ── */}
      {(S.business?.length ?? 0) > 0 && (
        <section className={`${W} mx-auto px-4 pt-14`}>
          <SectionRule label="Business" href="/category/business" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
            <div className="lg:col-span-2">
              {S.business[0] && <EditorialCard post={S.business[0]} size="lg" />}
            </div>
            <div className="flex flex-col gap-4">
              {S.business.slice(1, 3).map(p => <EditorialCard key={p._id} post={p} size="sm" />)}
            </div>
          </div>
        </section>
      )}

      {/* ── AI + LIFESTYLE — side by side ── */}
      <section className="bg-gray-50 mt-14 py-12">
        <div className={`${W} mx-auto px-4`}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {(S.ai?.length ?? 0) > 0 && (
              <div>
                <SectionRule label="Artificial Intelligence" href="/category/ai" />
                {S.ai.map((p, i) => <RowCard key={p._id} post={p} index={i} />)}
              </div>
            )}
            {(S.lifestyle?.length ?? 0) > 0 && (
              <div>
                <SectionRule label="Lifestyle" href="/category/lifestyle" />
                {S.lifestyle.slice(0, 4).map(p => <InlineCard key={p._id} post={p} />)}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── TRAVEL — 4 equal cards ── */}
      {(S.travel?.length ?? 0) > 0 && (
        <section className={`${W} mx-auto px-4 pt-14`}>
          <SectionRule label="Travel" href="/category/travel" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {S.travel.map(p => <EditorialCard key={p._id} post={p} size="sm" />)}
          </div>
        </section>
      )}

      {/* ── BROWSE BY CATEGORY ── */}
      <section className="mt-16 py-14 bg-gray-900">
        <div className={`${W} mx-auto px-4`}>
          <div className="flex items-center justify-between mb-8 border-b border-gray-700 pb-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-white">Browse by Category</h2>
            <span className="text-[11px] text-gray-400">{total.toLocaleString()}+ lists</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { slug: 'technology',   name: 'Technology',     emoji: '💻' },
              { slug: 'business',     name: 'Business',       emoji: '💼' },
              { slug: 'entertainment',name: 'Entertainment',  emoji: '🎬' },
              { slug: 'ai',           name: 'AI & Tools',     emoji: '🤖' },
              { slug: 'lifestyle',    name: 'Lifestyle',      emoji: '🌿' },
              { slug: 'travel',       name: 'Travel',         emoji: '✈️' },
            ].map(c => (
              <Link key={c.slug} href={`/category/${c.slug}`}
                className="flex flex-col items-center gap-2 py-5 px-3 rounded-xl bg-gray-800 hover:bg-[#E63946] text-center transition-colors group">
                <span className="text-2xl">{c.emoji}</span>
                <span className="text-xs font-bold text-gray-300 group-hover:text-white uppercase tracking-wide">{c.name}</span>
              </Link>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/?page=2" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-900 text-xs font-black rounded-lg hover:bg-gray-100 transition-colors uppercase tracking-widest">
              Browse All Lists <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}
