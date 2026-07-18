import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { client } from '@/sanity/lib/client'
import {
  getCategoryBySlugQuery,
  getPostsByCategoryQuery,
  getPostsByCategoryCountQuery,
} from '@/sanity/lib/queries'
import DarkCard, { catColor } from '@/components/DarkCard'
import Pagination from '@/components/Pagination'
import type { Category } from '@/types'

const PER_PAGE = 18
const W = 'max-w-[1380px]'

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const { page } = await searchParams
  const category = await client.fetch<Category | null>(getCategoryBySlugQuery, { slug }).catch(() => null)
  if (!category) return { title: 'Not Found' }

  const canonicalPath = `/category/${slug}${page && page !== '1' ? `?page=${page}` : ''}`

  return {
    title: `${category.name} Lists`,
    description: category.description || `Browse the best ${category.name} lists on All You Need Is Lists.`,
    alternates: { canonical: canonicalPath },
  }
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { slug } = await params
  const sp = await searchParams

  const category = await client.fetch<Category | null>(getCategoryBySlugQuery, { slug }).catch(() => null)
  if (!category) notFound()

  const page = Math.max(1, parseInt(sp.page || '1', 10))
  const start = (page - 1) * PER_PAGE
  const end = start + PER_PAGE

  const [posts, total] = await Promise.all([
    client.fetch(getPostsByCategoryQuery, { slug, start, end }).catch(() => []),
    client.fetch(getPostsByCategoryCountQuery, { slug }).catch(() => 0),
  ])

  const totalPages = Math.ceil(total / PER_PAGE)
  const color = catColor(slug)

  return (
    <div className={`${W} mx-auto px-4 py-2`}>

      {/* Floating dark hero */}
      <div className="relative overflow-hidden rounded-3xl bg-[#151515] border border-white/[0.06] shadow-2xl shadow-black/30 px-6 md:px-10 py-9 md:py-11 mb-8">
        <div
          className="absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full opacity-[0.15] blur-3xl pointer-events-none"
          style={{ backgroundColor: color }}
        />
        <div className="relative max-w-2xl">
          {category.parent && (
            <Link
              href={`/category/${category.parent.slug}`}
              className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white mb-3 inline-block transition-colors"
            >
              ← {category.parent.name}
            </Link>
          )}
          <span className="text-[10px] font-black uppercase tracking-widest mb-3 block" style={{ color }}>
            Category
          </span>
          <h1 className="text-2xl md:text-4xl font-black text-white leading-tight mb-3 capitalize">
            {category.name}
          </h1>
          {category.description && (
            <p className="text-gray-400 text-sm md:text-base leading-relaxed mb-5 max-w-xl">{category.description}</p>
          )}
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] text-gray-300 text-xs font-bold">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
            {total.toLocaleString()} {total === 1 ? 'list' : 'lists'}
          </span>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-lg font-medium text-gray-700">No posts in this category yet.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
            {posts.map((post: Parameters<typeof DarkCard>[0]['post']) => (
              <DarkCard key={post._id} post={post} />
            ))}
          </div>
          <Pagination currentPage={page} totalPages={totalPages} basePath={`/category/${slug}`} />
        </>
      )}
    </div>
  )
}
