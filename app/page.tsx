import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Calendar, TrendingUp } from 'lucide-react'
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

export const metadata: Metadata = {
  title: 'All You Need Is Lists — The Best Curated Lists on the Internet',
  description: 'Discover top 10s, best-of lists and expert picks across AI, tech, business, entertainment, travel and more.',
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function stripHtml(h: string) { return h.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim() }

// ── Components ─────────────────────────────────────────────────────────────────

function CatPill({ name, href }: { name: string; href?: string }) {
  const cls = 'inline-block px-2.5 py-[3px] bg-[#E63946] text-white text-[10px] font-black uppercase tracking-widest rounded-full'
  return href ? <Link href={href} className={cls}>{name}</Link> : <span className={cls}>{name}</span>
}

function SectionRule({ label, href }: { label: string; href: string }) {
  return (
    <div className="flex items-center justify-between mb-7 border-b-2 border-gray-900 pb-3">
      <h2 className="text-sm font-black uppercase tracking-widest text-gray-900">{label}</h2>
      <Link href={href} className="flex items-center gap-1 text-[11px] font-bold text-[#E63946] hover:text-red-700 uppercase tracking-wide transition-colors">
        See all <ArrowRight size={11} />
      </Link>
    </div>
  )
}

function HeroCard({ post }: { post: PostCardType }) {
  const href = post.fullPath || `/${post.slug}`
  const cat = post.categories?.[0]
  const img = post.featuredImage?.asset
    ? urlFor(post.featuredImage).width(1400).height(700).fit('crop').url()
    : null
  return (
    <Link href={href} className="group relative block overflow-hidden rounded-2xl shadow-xl" style={{ aspectRatio: '21/9' }}>
      {img
        ? <Image src={img} alt={post.title} fill className="object-cover group-hover:scale-[1.02] transition-transform duration-700" priority />
        : <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-700" />}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/5" />
      <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-12">
        {cat && <CatPill name={cat.name} />}
        <h1 className="mt-3 text-3xl md:text-5xl font-black text-white leading-tight mb-3 max-w-3xl group-hover:text-red-100 transition-colors">
          {post.title}
        </h1>
        {post.excerpt && (
          <p className="text-gray-300 text-sm md:text-base max-w-2xl line-clamp-2 mb-5">
            {stripHtml(post.excerpt)}
          </p>
        )}
        <span className="inline-flex items-center gap-2 text-sm font-bold text-white bg-[#E63946] px-5 py-2.5 rounded-xl w-fit group-hover:bg-red-700 transition-colors">
          Read the list <ArrowRight size={14} />
        </span>
      </div>
    </Link>
  )
}

function EditorialCard({ post, size = 'md' }: { post: PostCardType; size?: 'lg' | 'md' | 'sm' }) {
  const href = post.fullPath || `/${post.slug}`
  const cat = post.categories?.[0]
  const w = size === 'lg' ? 900 : size === 'md' ? 600 : 400
  const img = post.featuredImage?.asset
    ? urlFor(post.featuredImage).width(w).height(Math.round(w * 0.6)).fit('crop').url()
    : null
  return (
    <Link href={href} className="group flex flex-col overflow-hidden rounded-xl border border-gray-100 bg-white hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 h-full">
      <div className="relative overflow-hidden bg-gray-100" style={{ aspectRatio: '16/10' }}>
        {img
          ? <Image src={img} alt={post.title} fill className="object-cover group-hover:scale-[1.04] transition-transform duration-500" />
          : <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
              <span className="text-5xl font-black text-gray-400/40">#</span>
            </div>}
        {cat && (
          <div className="absolute top-3 left-3">
            <CatPill name={cat.name} />
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 className={`font-black text-gray-900 leading-snug mb-1.5 line-clamp-2 group-hover:text-[#E63946] transition-colors ${size === 'lg' ? 'text-xl' : 'text-base'}`}>
          {post.title}
        </h3>
        {post.excerpt && size !== 'sm' && (
          <p className="text-gray-500 text-sm leading-relaxed line-clamp-2 mb-3 flex-1">{stripHtml(post.excerpt)}</p>
        )}
        <div className="flex items-center gap-1.5 text-gray-400 text-xs mt-auto pt-2 border-t border-gray-50">
          <Calendar size={11} /><time>{formatDate(post.date)}</time>
        </div>
      </div>
    </Link>
  )
}

function RowCard({ post, index }: { post: PostCardType; index: number }) {
  const href = post.fullPath || `/${post.slug}`
  const cat = post.categories?.[0]
  const img = post.featuredImage?.asset
    ? urlFor(post.featuredImage).width(140).height(100).fit('crop').url()
    : null
  return (
    <Link href={href} className="group flex items-center gap-4 py-3.5 border-b border-gray-100 last:border-0 hover:bg-gray-50 px-2 -mx-2 rounded-lg transition-colors">
      <span className="text-3xl font-black text-gray-100 w-9 text-center flex-shrink-0 group-hover:text-[#E63946]/20 transition-colors tabular-nums">
        {String(index + 1).padStart(2, '0')}
      </span>
      <div className="relative flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden bg-gray-100 hidden sm:block">
        {img && <Image src={img} alt={post.title} fill className="object-cover" />}
      </div>
      <div className="flex-1 min-w-0">
        {cat && <span className="text-[10px] font-black uppercase tracking-widest text-[#E63946]">{cat.name}</span>}
        <h4 className="text-gray-900 text-sm font-bold leading-snug line-clamp-1 group-hover:text-[#E63946] transition-colors mt-0.5">
          {post.title}
        </h4>
      </div>
      <ArrowRight size={13} className="text-gray-300 group-hover:text-[#E63946] flex-shrink-0 transition-colors" />
    </Link>
  )
}

function InlineCard({ post }: { post: PostCardType }) {
  const href = post.fullPath || `/${post.slug}`
  const cat = post.categories?.[0]
  const img = post.featuredImage?.asset
    ? urlFor(post.featuredImage).width(200).height(140).fit('crop').url()
    : null
  return (
    <Link href={href} className="group flex gap-3 items-start py-3.5 border-b border-gray-100 last:border-0">
      <div className="relative flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden bg-gray-100">
        {img && <Image src={img} alt={post.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />}
      </div>
      <div className="flex-1 min-w-0">
        {cat && <span className="text-[10px] font-black uppercase tracking-widest text-[#E63946]">{cat.name}</span>}
        <h4 className="text-gray-900 text-sm font-bold leading-snug line-clamp-2 group-hover:text-[#E63946] transition-colors mt-0.5">
          {post.title}
        </h4>
      </div>
    </Link>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function HomePage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page || '1', 10))

  if (page > 1) {
    const start = (page - 1) * PER_PAGE
    const end = start + PER_PAGE
    const [posts, total] = await Promise.all([
      client.fetch(getLatestPostsQuery, { start, end }, { next: { revalidate: 300 } }).catch(() => []),
      client.fetch(getLatestPostsCountQuery, {}, { next: { revalidate: 300 } }).catch(() => 0),
    ])
    const totalPages = Math.ceil(total / PER_PAGE)
    return (
      <div className="bg-white min-h-screen">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="border-b-2 border-gray-900 pb-3 mb-7">
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-900">All Lists — Page {page}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post: PostCardType) => <PostCard key={post._id} post={post} />)}
          </div>
          <Pagination currentPage={page} totalPages={totalPages} basePath="/" />
        </div>
      </div>
    )
  }

  const [latest, sections, total] = await Promise.all([
    client.fetch(getLatestPostsQuery, { start: 0, end: 13 }, { next: { revalidate: 300 } }).catch(() => []),
    client.fetch(getHomepageSectionsQuery, {}, { next: { revalidate: 300 } }).catch(() => ({})),
    client.fetch(getLatestPostsCountQuery, {}, { next: { revalidate: 300 } }).catch(() => 0),
  ])

  const hero: PostCardType | null = latest[0] ?? null
  const freshGrid: PostCardType[] = latest.slice(1, 7)
  const trending: PostCardType[] = latest.slice(7, 13)
  const S = sections as Record<string, PostCardType[]>

  return (
    <div className="bg-white min-h-screen">

      {/* ── HERO ── */}
      {hero && (
        <section className="max-w-7xl mx-auto px-4 pt-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#E63946]">Featured</span>
          </div>
          <HeroCard post={hero} />
        </section>
      )}

      {/* ── FRESH PICKS + TRENDING ── */}
      <section className="max-w-7xl mx-auto px-4 pt-14">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Left: Fresh Picks 2-col grid */}
          <div className="lg:col-span-2">
            <SectionRule label="Fresh This Week" href="/latest" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {freshGrid.slice(0, 4).map((p, i) => (
                <EditorialCard key={p._id} post={p} size={i < 2 ? 'md' : 'sm'} />
              ))}
            </div>
          </div>
          {/* Right: Trending numbered list */}
          <div>
            <div className="flex items-center justify-between mb-7 border-b-2 border-gray-900 pb-3">
              <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-gray-900">
                <TrendingUp size={14} className="text-[#E63946]" /> Trending
              </h2>
            </div>
            <div>
              {trending.map((p, i) => <RowCard key={p._id} post={p} index={i} />)}
            </div>
          </div>
        </div>
      </section>

      {/* ── ENTERTAINMENT ── */}
      {(S.entertainment?.length ?? 0) > 0 && (
        <section className="bg-gray-50 mt-14 py-12">
          <div className="max-w-7xl mx-auto px-4">
            <SectionRule label="Entertainment" href="/category/entertainment" />
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3">
                {S.entertainment[0] && <EditorialCard post={S.entertainment[0]} size="lg" />}
              </div>
              <div className="lg:col-span-2">
                {S.entertainment.slice(1, 5).map(p => <InlineCard key={p._id} post={p} />)}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── TECHNOLOGY ── */}
      {(S.technology?.length ?? 0) > 0 && (
        <section className="max-w-7xl mx-auto px-4 pt-14">
          <SectionRule label="Technology" href="/category/technology" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {S.technology.map(p => <EditorialCard key={p._id} post={p} size="sm" />)}
          </div>
        </section>
      )}

      {/* ── AI — ranked list + card ── */}
      {(S.ai?.length ?? 0) > 0 && (
        <section className="bg-gray-50 mt-14 py-12">
          <div className="max-w-7xl mx-auto px-4">
            <SectionRule label="Artificial Intelligence" href="/category/ai" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div>
                {S.ai.map((p, i) => <RowCard key={p._id} post={p} index={i} />)}
              </div>
              <div className="hidden lg:block">
                {S.ai[0] && <EditorialCard post={S.ai[0]} size="lg" />}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── BUSINESS + LIFESTYLE ── */}
      <div className="max-w-7xl mx-auto px-4 pt-14">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {(S.business?.length ?? 0) > 0 && (
            <section>
              <SectionRule label="Business" href="/category/business" />
              {S.business.slice(0, 4).map(p => <InlineCard key={p._id} post={p} />)}
            </section>
          )}
          {(S.lifestyle?.length ?? 0) > 0 && (
            <section>
              <SectionRule label="Lifestyle" href="/category/lifestyle" />
              {S.lifestyle.slice(0, 4).map(p => <InlineCard key={p._id} post={p} />)}
            </section>
          )}
        </div>
      </div>

      {/* ── TRAVEL ── */}
      {(S.travel?.length ?? 0) > 0 && (
        <section className="bg-gray-50 mt-14 py-12">
          <div className="max-w-7xl mx-auto px-4">
            <SectionRule label="Travel" href="/category/travel" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {S.travel.map(p => <EditorialCard key={p._id} post={p} size="sm" />)}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="rounded-2xl bg-[#E63946] p-10 md:p-14 text-center">
          <p className="text-xs font-black uppercase tracking-widest text-red-200 mb-3">The Archive</p>
          <h2 className="text-3xl md:text-4xl font-black text-white mb-3">
            {total.toLocaleString()}+ Lists &amp; Counting
          </h2>
          <p className="text-red-100 mb-7 text-sm max-w-md mx-auto">From AI tools to travel spots — every list you&apos;ll ever need, all in one place.</p>
          <Link
            href="/?page=2"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-[#E63946] text-sm font-black rounded-xl hover:bg-red-50 transition-colors"
          >
            Browse All Lists <ArrowRight size={15} />
          </Link>
        </div>
      </section>

    </div>
  )
}
