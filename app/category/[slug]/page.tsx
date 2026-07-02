import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { client } from '@/sanity/lib/client'
import {
  getCategoryBySlugQuery,
  getPostsByCategoryQuery,
  getPostsByCategoryCountQuery,
} from '@/sanity/lib/queries'
import PostCard from '@/components/PostCard'
import Pagination from '@/components/Pagination'
import type { Category } from '@/types'

const PER_PAGE = 18

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const category = await client.fetch<Category | null>(getCategoryBySlugQuery, { slug }).catch(() => null)
  if (!category) return { title: 'Not Found' }

  return {
    title: `${category.name} Lists`,
    description: category.description || `Browse the best ${category.name} lists on All You Need Is Lists.`,
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-10 pb-8 border-b border-gray-200">
        {category.parent && (
          <Link
            href={`/category/${category.parent.slug}`}
            className="text-xs font-bold uppercase tracking-widest text-brand-red hover:text-red-700 mb-2 inline-block"
          >
            ← {category.parent.name}
          </Link>
        )}
        <h1 className="text-4xl md:text-5xl font-black text-gray-900 capitalize mb-3">
          {category.name}
        </h1>
        {category.description && (
          <p className="text-gray-500 text-lg max-w-2xl">{category.description}</p>
        )}
        <p className="text-sm text-gray-400 mt-3 font-medium">
          {total} {total === 1 ? 'list' : 'lists'}
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium">No posts in this category yet.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post: Parameters<typeof PostCard>[0]['post']) => (
              <PostCard key={post._id} post={post} />
            ))}
          </div>
          <Pagination currentPage={page} totalPages={totalPages} basePath={`/category/${slug}`} />
        </>
      )}
    </div>
  )
}
