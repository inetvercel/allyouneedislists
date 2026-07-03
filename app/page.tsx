import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { client } from '@/sanity/lib/client'
import {
  getLatestPostsQuery,
  getLatestPostsCountQuery,
  getHomepageSectionsQuery,
} from '@/sanity/lib/queries'
import PostCard from '@/components/PostCard'
import Pagination from '@/components/Pagination'
import type { PostCard as PostCardType } from '@/types'

const PER_PAGE = 18

export const metadata: Metadata = {
  title: 'All You Need Is Lists - The Best Lists on the Internet',
  description: 'Discover the best top 5s, top 10s, and curated lists on AI, tech, business, entertainment, travel, and more.',
}

const SECTIONS = [
  { key: 'ai', label: 'AI', href: '/category/ai' },
  { key: 'technology', label: 'Technology', href: '/category/technology' },
  { key: 'business', label: 'Business', href: '/category/business' },
  { key: 'entertainment', label: 'Entertainment', href: '/category/entertainment' },
  { key: 'lifestyle', label: 'Lifestyle', href: '/category/lifestyle' },
  { key: 'travel', label: 'Travel', href: '/category/travel' },
] as const

function SectionHeader({ label, href }: { label: string; href: string }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className="h-1 w-8 bg-brand-red rounded-full" />
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">{label}</h2>
      </div>
      <Link
        href={href}
        className="flex items-center gap-1.5 text-xs font-bold text-brand-red hover:text-red-700 transition-colors uppercase tracking-wide"
      >
        View all <ArrowRight size={13} />
      </Link>
    </div>
  )
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
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
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-1 w-8 bg-brand-red rounded-full" />
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">Latest Lists — Page {page}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post: PostCardType) => (
            <PostCard key={post._id} post={post} />
          ))}
        </div>
        <Pagination currentPage={page} totalPages={totalPages} basePath="/" />
      </div>
    )
  }

  const [featured, sections, total] = await Promise.all([
    client.fetch(getLatestPostsQuery, { start: 0, end: 1 }, { next: { revalidate: 300 } }).catch(() => []),
    client.fetch(getHomepageSectionsQuery, {}, { next: { revalidate: 300 } }).catch(() => ({})),
    client.fetch(getLatestPostsCountQuery, {}, { next: { revalidate: 300 } }).catch(() => 0),
  ])

  const featuredPost: PostCardType | null = featured[0] ?? null
  const totalPages = Math.ceil(total / PER_PAGE)

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 space-y-14">

      {/* Hero */}
      {featuredPost && (
        <section>
          <div className="flex items-center gap-3 mb-5">
            <div className="h-1 w-8 bg-brand-red rounded-full" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">Featured</h2>
          </div>
          <PostCard post={featuredPost} featured />
        </section>
      )}

      {/* Category sections */}
      {SECTIONS.map(({ key, label, href }) => {
        const posts: PostCardType[] = (sections as Record<string, PostCardType[]>)[key] ?? []
        if (posts.length === 0) return null
        return (
          <section key={key}>
            <SectionHeader label={label} href={href} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <PostCard key={post._id} post={post} />
              ))}
            </div>
          </section>
        )
      })}

      {/* Latest / see more */}
      {totalPages > 1 && (
        <section className="text-center pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-500 mb-4">
            Browse all {total.toLocaleString()} lists in the archive
          </p>
          <Link
            href="/?page=2"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-dark text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-colors"
          >
            Browse Latest Lists <ArrowRight size={15} />
          </Link>
        </section>
      )}
    </div>
  )
}
