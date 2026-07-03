import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { client } from '@/sanity/lib/client'
import {
  getTagBySlugQuery,
  getPostsByTagQuery,
  getPostsByTagCountQuery,
  getAllTagSlugPathsQuery,
} from '@/sanity/lib/queries'
import PostCard from '@/components/PostCard'
import Pagination from '@/components/Pagination'

const PER_PAGE = 18

interface Tag {
  _id: string
  name: string
  slug: string
  count: number
}

export async function generateStaticParams() {
  const tags = await client.fetch<{ slug: string }[]>(getAllTagSlugPathsQuery).catch(() => [])
  return tags.map((t) => ({ slug: t.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const tag = await client.fetch<Tag | null>(getTagBySlugQuery, { slug }).catch(() => null)
  if (!tag) return { title: 'Not Found' }

  const title = `${tag.name} Lists`
  const description = `Browse ${tag.count} curated lists tagged with "${tag.name}" on All You Need Is Lists.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: `/og?title=${encodeURIComponent(title)}&category=Tag`,
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default async function TagPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { slug } = await params
  const sp = await searchParams

  const tag = await client.fetch<Tag | null>(getTagBySlugQuery, { slug }).catch(() => null)
  if (!tag) notFound()

  const page = Math.max(1, parseInt(sp.page || '1', 10))
  const start = (page - 1) * PER_PAGE
  const end = start + PER_PAGE

  const [posts, total] = await Promise.all([
    client.fetch(getPostsByTagQuery, { slug, start, end }).catch(() => []),
    client.fetch(getPostsByTagCountQuery, { slug }).catch(() => 0),
  ])

  const totalPages = Math.ceil(total / PER_PAGE)

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="mb-10 pb-8 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-red/10 text-brand-red text-xs font-bold uppercase tracking-widest">
            # Tag
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-3">{tag.name}</h1>
        <p className="text-sm text-gray-400 font-medium">
          {total} {total === 1 ? 'list' : 'lists'}
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium">No posts with this tag yet.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post: Parameters<typeof PostCard>[0]['post']) => (
              <PostCard key={post._id} post={post} />
            ))}
          </div>
          <Pagination currentPage={page} totalPages={totalPages} basePath={`/tag/${slug}`} />
        </>
      )}
    </div>
  )
}
