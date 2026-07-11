import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Calendar } from 'lucide-react'
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
  title: 'All You Need Is Lists - The Best Lists on the Internet',
  description: 'Discover the best top 5s, top 10s, and curated lists on AI, tech, business, entertainment, travel, and more.',
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function stripHtml(h: string) { return h.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim() }

// ── Card components ────────────────────────────────────────────────────────────

function HeroCard({ post }: { post: PostCardType }) {
  const href = post.fullPath || `/${post.slug}`
  const cat = post.categories?.[0]
  const img = post.featuredImage?.asset
    ? urlFor(post.featuredImage).width(1400).height(680).fit('crop').url()
    : null
  return (
    <Link href={href} className="group relative block overflow-hidden rounded-2xl" style={{ aspectRatio: '21/9' }}>
      {img
        ? <Image src={img} alt={post.title} fill className="object-cover group-hover:scale-105 transition-transform duration-700" priority />
        : <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-700" />}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
      <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-12">
        {cat && (
          <span className="inline-block mb-3 px-3 py-1 bg-brand-red text-white text-[11px] font-black uppercase tracking-widest rounded-full w-fit">
            {cat.name}
          </span>
        )}
        <h1 className="text-3xl md:text-5xl font-black text-white leading-tight mb-3 max-w-3xl group-hover:text-red-100 transition-colors">
          {post.title}
        </h1>
        {post.excerpt && (
          <p className="text-gray-300 text-sm md:text-base leading-relaxed max-w-2xl line-clamp-2 mb-4">
            {stripHtml(post.excerpt)}
          </p>
        )}
        <span className="inline-flex items-center gap-2 text-sm font-bold text-white bg-brand-red px-4 py-2 rounded-xl w-fit group-hover:bg-red-700 transition-colors">
          Read the list <ArrowRight size={14} />
        </span>
      </div>
    </Link>
  )
}

function WideCard({ post }: { post: PostCardType }) {
  const href = post.fullPath || `/${post.slug}`
  const cat = post.categories?.[0]
  const img = post.featuredImage?.asset
    ? urlFor(post.featuredImage).width(800).height(480).fit('crop').url()
    : null
  return (
    <Link href={href} className="group relative flex flex-col overflow-hidden rounded-2xl bg-[#111] border border-white/[0.07] hover:border-brand-red/40 transition-all h-full">
      <div className="relative overflow-hidden" style={{ aspectRatio: '16/10' }}>
        {img
          ? <Image src={img} alt={post.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
          : <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        {cat && (
          <span className="absolute top-3 left-3 px-2.5 py-1 bg-brand-red text-white text-[10px] font-black uppercase tracking-widest rounded-full">
            {cat.name}
          </span>
        )}
      </div>
      <div className="p-5 flex flex-col flex-1">
        <h3 className="text-white font-black text-lg leading-snug mb-2 group-hover:text-brand-red transition-colors line-clamp-2">
          {post.title}
        </h3>
        {post.excerpt && (
          <p className="text-gray-400 text-sm leading-relaxed line-clamp-2 flex-1">
            {stripHtml(post.excerpt)}
          </p>
        )}
        <div className="flex items-center gap-1.5 text-gray-600 text-xs mt-3 pt-3 border-t border-white/[0.06]">
          <Calendar size={11} /><time>{formatDate(post.date)}</time>
        </div>
      </div>
    </Link>
  )
}

function MiniCard({ post }: { post: PostCardType }) {
  const href = post.fullPath || `/${post.slug}`
  const cat = post.categories?.[0]
  const img = post.featuredImage?.asset
    ? urlFor(post.featuredImage).width(200).height(140).fit('crop').url()
    : null
  return (
    <Link href={href} className="group flex gap-3 items-start p-3 rounded-xl hover:bg-white/[0.04] transition-colors border border-transparent hover:border-white/[0.07]">
      <div className="relative flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden bg-gray-800">
        {img && <Image src={img} alt={post.title} fill className="object-cover group-hover:scale-110 transition-transform duration-300" />}
      </div>
      <div className="flex-1 min-w-0">
        {cat && <span className="text-[10px] font-black uppercase tracking-widest text-brand-red">{cat.name}</span>}
        <h4 className="text-white text-sm font-bold leading-snug line-clamp-2 group-hover:text-brand-red transition-colors mt-0.5">
          {post.title}
        </h4>
      </div>
    </Link>
  )
}

function ListCard({ post, index }: { post: PostCardType; index: number }) {
  const href = post.fullPath || `/${post.slug}`
  const cat = post.categories?.[0]
  const img = post.featuredImage?.asset
    ? urlFor(post.featuredImage).width(160).height(110).fit('crop').url()
    : null
  return (
    <Link href={href} className="group flex items-center gap-4 py-4 border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02] transition-colors px-2 rounded-xl">
      <span className="text-4xl font-black text-white/[0.08] w-10 text-center flex-shrink-0 group-hover:text-brand-red/30 transition-colors">
        {String(index + 1).padStart(2, '0')}
      </span>
      <div className="relative flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden bg-gray-800 hidden sm:block">
        {img && <Image src={img} alt={post.title} fill className="object-cover" />}
      </div>
      <div className="flex-1 min-w-0">
        {cat && <span className="text-[10px] font-black uppercase tracking-widest text-brand-red">{cat.name}</span>}
        <h4 className="text-white text-sm font-bold leading-snug line-clamp-1 group-hover:text-brand-red transition-colors">
          {post.title}
        </h4>
      </div>
      <ArrowRight size={14} className="text-gray-600 group-hover:text-brand-red flex-shrink-0 transition-colors" />
    </Link>
  )
}

function SectionHeader({ label, href, light = false }: { label: string; href: string; light?: boolean }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className="h-[3px] w-8 bg-brand-red rounded-full" />
        <h2 className={`text-xs font-black uppercase tracking-widest ${light ? 'text-gray-400' : 'text-gray-500'}`}>{label}</h2>
      </div>
      <Link href={href} className="flex items-center gap-1.5 text-xs font-bold text-brand-red hover:text-red-400 transition-colors uppercase tracking-wide">
        View all <ArrowRight size={12} />
      </Link>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function HomePage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page || '1', 10))

  // Paginated archive view
  if (page > 1) {
    const start = (page - 1) * PER_PAGE
    const end = start + PER_PAGE
    const [posts, total] = await Promise.all([
      client.fetch(getLatestPostsQuery, { start, end }, { next: { revalidate: 300 } }).catch(() => []),
      client.fetch(getLatestPostsCountQuery, {}, { next: { revalidate: 300 } }).catch(() => 0),
    ])
    const totalPages = Math.ceil(total / PER_PAGE)
    return (
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-[3px] w-8 bg-brand-red rounded-full" />
          <h2 className="text-xs font-black uppercase tracking-widest text-gray-500">Latest Lists — Page {page}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post: PostCardType) => <PostCard key={post._id} post={post} />)}
        </div>
        <Pagination currentPage={page} totalPages={totalPages} basePath="/" />
      </div>
    )
  }

  // Homepage
  const [latest, sections, total] = await Promise.all([
    client.fetch(getLatestPostsQuery, { start: 0, end: 7 }, { next: { revalidate: 300 } }).catch(() => []),
    client.fetch(getHomepageSectionsQuery, {}, { next: { revalidate: 300 } }).catch(() => ({})),
    client.fetch(getLatestPostsCountQuery, {}, { next: { revalidate: 300 } }).catch(() => 0),
  ])

  const hero: PostCardType | null = latest[0] ?? null
  const freshPicks: PostCardType[] = latest.slice(1, 7)
  const S = sections as Record<string, PostCardType[]>

  return (
    <div className="bg-[#0a0a0a] min-h-screen">

      {/* ── HERO ── */}
      {hero && (
        <section className="max-w-7xl mx-auto px-4 pt-8 pb-0">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-[3px] w-8 bg-brand-red rounded-full" />
            <span className="text-xs font-black uppercase tracking-widest text-gray-500">Featured</span>
          </div>
          <HeroCard post={hero} />
        </section>
      )}

      {/* ── FRESH PICKS ── */}
      {freshPicks.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 pt-12 pb-0">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-[3px] w-8 bg-brand-red rounded-full" />
            <span className="text-xs font-black uppercase tracking-widest text-gray-500">Fresh This Week</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left: 2-col-span wide card */}
            <div className="lg:col-span-2">
              {freshPicks[0] && <WideCard post={freshPicks[0]} />}
            </div>
            {/* Right: 2 stacked mini cards */}
            <div className="flex flex-col gap-4">
              {freshPicks.slice(1, 3).map(p => <WideCard key={p._id} post={p} />)}
            </div>
          </div>
          {/* Bottom row: 3 more */}
          {freshPicks.length > 3 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              {freshPicks.slice(3, 6).map(p => (
                <WideCard key={p._id} post={p} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── ENTERTAINMENT — Big + Grid ── */}
      {(S.entertainment?.length ?? 0) > 0 && (
        <section className="max-w-7xl mx-auto px-4 pt-14">
          <SectionHeader label="Entertainment" href="/category/entertainment" light />
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3">
              {S.entertainment[0] && <WideCard post={S.entertainment[0]} />}
            </div>
            <div className="lg:col-span-2 flex flex-col gap-3">
              {S.entertainment.slice(1, 4).map(p => <MiniCard key={p._id} post={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* ── TECHNOLOGY — 4-col grid ── */}
      {(S.technology?.length ?? 0) > 0 && (
        <section className="max-w-7xl mx-auto px-4 pt-14">
          <SectionHeader label="Technology" href="/category/technology" light />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {S.technology.map(p => <WideCard key={p._id} post={p} />)}
          </div>
        </section>
      )}

      {/* ── AI — numbered list + wide card ── */}
      {(S.ai?.length ?? 0) > 0 && (
        <section className="mt-14 bg-[#0f0f0f] border-y border-white/[0.06] py-12">
          <div className="max-w-7xl mx-auto px-4">
            <SectionHeader label="Artificial Intelligence" href="/category/ai" light />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                {S.ai.map((p, i) => <ListCard key={p._id} post={p} index={i} />)}
              </div>
              <div className="hidden lg:block">
                {S.ai[0] && <WideCard post={S.ai[0]} />}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── BUSINESS + LIFESTYLE — side by side ── */}
      <div className="max-w-7xl mx-auto px-4 pt-14">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {(S.business?.length ?? 0) > 0 && (
            <section>
              <SectionHeader label="Business" href="/category/business" light />
              <div className="space-y-3">
                {S.business.slice(0, 3).map(p => <MiniCard key={p._id} post={p} />)}
              </div>
            </section>
          )}
          {(S.lifestyle?.length ?? 0) > 0 && (
            <section>
              <SectionHeader label="Lifestyle" href="/category/lifestyle" light />
              <div className="space-y-3">
                {S.lifestyle.slice(0, 3).map(p => <MiniCard key={p._id} post={p} />)}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* ── TRAVEL — cinematic strip ── */}
      {(S.travel?.length ?? 0) > 0 && (
        <section className="max-w-7xl mx-auto px-4 pt-14">
          <SectionHeader label="Travel" href="/category/travel" light />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {S.travel.map(p => <WideCard key={p._id} post={p} />)}
          </div>
        </section>
      )}

      {/* ── BROWSE ALL CTA ── */}
      <section className="max-w-7xl mx-auto px-4 pt-16 pb-16">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-red/20 to-red-900/10 border border-brand-red/20 p-10 text-center">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(220,38,38,0.1)_0%,_transparent_70%)]" />
          <p className="text-xs font-black uppercase tracking-widest text-brand-red mb-3">Archive</p>
          <h2 className="text-2xl md:text-3xl font-black text-white mb-2">
            {total.toLocaleString()}+ Lists &amp; Counting
          </h2>
          <p className="text-gray-400 mb-6 text-sm">From AI tools to travel spots — every list you&apos;ll ever need.</p>
          <Link
            href="/?page=2"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-red hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-colors"
          >
            Browse All Lists <ArrowRight size={15} />
          </Link>
        </div>
      </section>

    </div>
  )
}
