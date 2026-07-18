import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Eye } from 'lucide-react'
import { client } from '@/sanity/lib/client'
import {
  getLatestPostsQuery,
  getLatestPostsCountQuery,
  getHomepageSectionsQuery,
} from '@/sanity/lib/queries'
import { urlFor } from '@/sanity/lib/image'
import Pagination from '@/components/Pagination'
import DarkCard, { catColor, fmtDate as fmt, stripHtml as strip } from '@/components/DarkCard'
import type { PostCard as PostCardType } from '@/types'

const PER_PAGE = 18
const W = 'max-w-[1380px]'

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}): Promise<Metadata> {
  const { page } = await searchParams
  return {
    title: 'All You Need Is Lists — The Best Curated Lists on the Internet',
    description: 'Discover top 10s, best-of lists and expert picks across AI, tech, business, entertainment, travel and more.',
    alternates: { canonical: page && page !== '1' ? `/?page=${page}` : '/' },
  }
}

// ── Section header ─────────────────────────────────────────────────────────────
function SectionHead({ label, href }: { label: string; href: string }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h2 className="text-[15px] font-black tracking-tight text-gray-900">{label}</h2>
      <Link href={href} className="flex items-center gap-1 text-[11px] font-bold text-[#E63946] hover:text-red-700 uppercase tracking-wide transition-colors group">
        View more <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
      </Link>
    </div>
  )
}

// ── HorizontalStory — rounded, text left / image right ────────────────────────
function HorizontalStory({ post }: { post: PostCardType }) {
  const href  = post.fullPath || `/${post.slug}`
  const cat   = post.categories?.[0]
  const color = catColor(cat?.slug)
  const img   = post.featuredImage?.asset ? urlFor(post.featuredImage).width(220).height(160).fit('crop').url() : null
  return (
    <Link href={href} className="group flex bg-[#1a1a1a] rounded-2xl overflow-hidden border border-white/[0.06] hover:border-white/[0.14] hover:shadow-xl hover:shadow-black/30 transition-all duration-300 mb-3 last:mb-0">
      <div className="flex-1 p-4 flex flex-col justify-center min-w-0">
        {cat && <span className="text-[9px] font-black uppercase tracking-wider mb-1" style={{ color }}>{cat.name}</span>}
        <h3 className="text-white font-bold text-[1rem] leading-snug line-clamp-2 group-hover:text-gray-200 transition-colors">{post.title}</h3>
        {post.excerpt && <p className="text-gray-400 text-[12px] leading-relaxed mt-1.5 line-clamp-2">{strip(post.excerpt)}</p>}
        <time className="text-gray-500 text-[10px] font-semibold mt-2.5 block">{fmt(post.date)}</time>
      </div>
      {img && (
        <div className="relative w-[150px] sm:w-[190px] flex-shrink-0 overflow-hidden">
          <Image src={img} alt={post.title} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
        </div>
      )}
    </Link>
  )
}

// ── HeroRow — compact rounded row ──────────────────────────────────────────────
function HeroRow({ post }: { post: PostCardType }) {
  const href  = post.fullPath || `/${post.slug}`
  const cat   = post.categories?.[0]
  const color = catColor(cat?.slug)
  const img   = post.featuredImage?.asset ? urlFor(post.featuredImage).width(90).height(64).fit('crop').url() : null
  return (
    <Link href={href} className="group flex gap-3 items-center bg-[#1a1a1a] rounded-xl overflow-hidden border border-white/[0.06] hover:border-white/[0.14] transition-all duration-200 p-2.5 mb-2 last:mb-0">
      <div className="relative flex-shrink-0 w-[52px] h-[38px] rounded-lg overflow-hidden bg-[#262626]">
        {img && <Image src={img} alt={post.title} fill className="object-cover" />}
      </div>
      <div className="flex-1 min-w-0">
        <span className="w-1.5 h-1.5 rounded-full inline-block mr-1.5" style={{ backgroundColor: color }} />
        <h4 className="text-gray-200 text-[0.8rem] font-bold leading-snug line-clamp-2 inline group-hover:text-white transition-colors">{post.title}</h4>
      </div>
    </Link>
  )
}

// ── MostRead sidebar — rounded, numbered ───────────────────────────────────────
function MostReadBox({ posts }: { posts: PostCardType[] }) {
  return (
    <div className="bg-[#1a1a1a] rounded-2xl border border-white/[0.06] overflow-hidden">
      <div className="flex items-center gap-2 px-4 pt-4 pb-3">
        <Eye size={13} className="text-[#E63946]" />
        <span className="text-[11px] font-black uppercase tracking-widest text-[#4ade80]">Most Read</span>
      </div>
      <div className="px-4 pb-4">
        {posts.map((p, i) => {
          const href = p.fullPath || `/${p.slug}`
          return (
            <Link key={p._id} href={href} className="group flex gap-3 items-start py-2.5 border-t border-white/[0.06] first:border-0">
              <span className="text-[13px] font-black text-[#4ade80] w-4 flex-shrink-0 tabular-nums">{i + 1}</span>
              <h4 className="text-gray-300 text-[0.8rem] font-semibold leading-snug line-clamp-2 group-hover:text-white transition-colors">{p.title}</h4>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

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
      <div className={`${W} mx-auto px-4 py-2`}>
        <div className="relative overflow-hidden rounded-3xl bg-[#151515] border border-white/[0.06] shadow-2xl shadow-black/30 px-6 md:px-10 py-9 md:py-11 mb-8">
          <div className="absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full opacity-[0.12] blur-3xl pointer-events-none bg-[#E63946]" />
          <span className="relative text-[10px] font-black uppercase tracking-widest text-[#E63946] mb-3 block">Browse</span>
          <h1 className="relative text-2xl md:text-4xl font-black text-white leading-tight">All Lists — Page {page}</h1>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
          {posts.map((post: PostCardType) => <DarkCard key={post._id} post={post} />)}
        </div>
        <Pagination currentPage={page} totalPages={Math.ceil(total / PER_PAGE)} basePath="/" />
      </div>
    )
  }

  const [latest, sections, total] = await Promise.all([
    client.fetch(getLatestPostsQuery, { start: 0, end: 18 }, { next: { revalidate: 300 } }).catch(() => []),
    client.fetch(getHomepageSectionsQuery, {}, { next: { revalidate: 300 } }).catch(() => ({})),
    client.fetch(getLatestPostsCountQuery, {}, { next: { revalidate: 300 } }).catch(() => 0),
  ])

  const grid3     = latest.slice(0, 3)   as PostCardType[]
  const heroRows  = latest.slice(3, 8)   as PostCardType[]
  const heroFeat  = (latest[8] ?? null)  as PostCardType | null
  const grid4     = latest.slice(9, 13)  as PostCardType[]
  const mostRead  = latest.slice(13, 18) as PostCardType[]
  const S = sections as Record<string, PostCardType[]>
  const featColor = catColor(heroFeat?.categories?.[0]?.slug)

  return (
    <div className={`${W} mx-auto px-4 py-6`}>

      {/* TOP 3-COL GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {grid3.map(p => <DarkCard key={p._id} post={p} />)}
      </div>

      {/* HERO ROWS (left) + FEATURED (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.6fr] gap-4 mb-8">
        <div className="flex flex-col">
          {heroRows.map(p => <HeroRow key={p._id} post={p} />)}
        </div>
        {heroFeat && (
          <Link href={heroFeat.fullPath || `/${heroFeat.slug}`} className="group relative block overflow-hidden rounded-2xl border border-white/[0.06] hover:border-white/[0.14] hover:shadow-2xl hover:shadow-black/40 transition-all duration-300" style={{ minHeight: '320px' }}>
            {heroFeat.featuredImage?.asset
              ? <Image src={urlFor(heroFeat.featuredImage).width(1000).height(650).fit('crop').url()} alt={heroFeat.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" priority />
              : <div className="absolute inset-0 bg-[#262626]" />}
            <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider text-white backdrop-blur-md shadow-lg" style={{ backgroundColor: `${featColor}dd` }}>
              Featured
            </span>
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <h2 className="text-white text-xl md:text-2xl font-black leading-tight mb-2">{heroFeat.title}</h2>
              {heroFeat.excerpt && <p className="text-gray-300 text-sm line-clamp-2 mb-2 hidden sm:block">{strip(heroFeat.excerpt)}</p>}
              <time className="text-gray-400 text-[11px]">{fmt(heroFeat.date)}</time>
            </div>
          </Link>
        )}
      </div>

      {/* 2x2 GRID + MOST READ SIDEBAR */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 mb-10">
        <div className="grid grid-cols-2 gap-4">
          {grid4.map(p => <DarkCard key={p._id} post={p} size="sm" />)}
        </div>
        <MostReadBox posts={mostRead} />
      </div>

      {/* TECHNOLOGY */}
      {(S.technology?.length ?? 0) > 0 && (
        <section className="mb-10">
          <SectionHead label="Technology" href="/category/technology" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {S.technology.map(p => <DarkCard key={p._id} post={p} size="sm" />)}
          </div>
        </section>
      )}

      {/* ENTERTAINMENT */}
      {(S.entertainment?.length ?? 0) > 0 && (
        <section className="mb-10">
          <SectionHead label="Entertainment" href="/category/entertainment" />
          <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4">
            <DarkCard post={S.entertainment[0]} size="lg" />
            <div className="flex flex-col">
              {S.entertainment.slice(1, 4).map(p => <HorizontalStory key={p._id} post={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* BUSINESS */}
      {(S.business?.length ?? 0) > 0 && (
        <section className="mb-10">
          <SectionHead label="Business" href="/category/business" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {S.business.slice(0, 3).map(p => <DarkCard key={p._id} post={p} size="sm" />)}
          </div>
        </section>
      )}

      {/* AI + LIFESTYLE */}
      {((S.ai?.length ?? 0) > 0 || (S.lifestyle?.length ?? 0) > 0) && (
        <section className="mb-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {(S.ai?.length ?? 0) > 0 && (
              <div>
                <SectionHead label="AI Tools" href="/category/ai" />
                <div className="flex flex-col">
                  {S.ai.slice(0, 4).map(p => <HorizontalStory key={p._id} post={p} />)}
                </div>
              </div>
            )}
            {(S.lifestyle?.length ?? 0) > 0 && (
              <div>
                <SectionHead label="Lifestyle" href="/category/lifestyle" />
                <div className="flex flex-col">
                  {S.lifestyle.slice(0, 4).map(p => <HorizontalStory key={p._id} post={p} />)}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* TRAVEL */}
      {(S.travel?.length ?? 0) > 0 && (
        <section className="mb-10">
          <SectionHead label="Travel" href="/category/travel" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {S.travel.map(p => <DarkCard key={p._id} post={p} size="sm" />)}
          </div>
        </section>
      )}

      {/* BROWSE BY CATEGORY */}
      <section className="mb-6">
        <SectionHead label="Browse by Category" href="/?page=2" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {[
            { slug: 'technology',    name: 'Technology',    emoji: '💻' },
            { slug: 'business',      name: 'Business',      emoji: '💼' },
            { slug: 'entertainment', name: 'Entertainment', emoji: '🎬' },
            { slug: 'ai',            name: 'AI Tools',      emoji: '🤖' },
            { slug: 'lifestyle',     name: 'Lifestyle',     emoji: '🌿' },
            { slug: 'travel',        name: 'Travel',        emoji: '✈️' },
          ].map(c => (
            <Link key={c.slug} href={`/category/${c.slug}`}
              className="flex flex-col items-center gap-2 py-5 px-3 rounded-2xl bg-[#1a1a1a] border border-white/[0.06] hover:border-white/[0.14] hover:-translate-y-1 transition-all duration-200 text-center group"
            >
              <span
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                style={{ backgroundColor: `${catColor(c.slug)}22` }}
              >
                {c.emoji}
              </span>
              <span className="text-[9px] font-black text-gray-400 group-hover:text-white uppercase tracking-wider">{c.name}</span>
            </Link>
          ))}
        </div>
        <div className="text-center">
          <Link href="/?page=2" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#1a1a1a] border border-white/[0.08] hover:border-white/[0.18] text-white text-xs font-bold transition-all duration-200 uppercase tracking-widest">
            Browse All Lists ({total.toLocaleString()}+) <ArrowRight size={12} />
          </Link>
        </div>
      </section>

    </div>
  )
}
