import type { Metadata } from 'next'
import { client } from '@/sanity/lib/client'
import { getLatestPostsQuery, getLatestPostsCountQuery } from '@/sanity/lib/queries'
import PostCard from '@/components/PostCard'
import Pagination from '@/components/Pagination'

const PER_PAGE = 18

export const metadata: Metadata = {
  title: 'All You Need Is Lists - The Best Lists on the Internet',
  description: 'Discover the best top 5s, top 10s, and curated lists on entertainment, lifestyle, technology, and more.',
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page || '1', 10))
  const start = (page - 1) * PER_PAGE
  const end = start + PER_PAGE

  const [posts, total] = await Promise.all([
    client.fetch(getLatestPostsQuery, { start, end }, { next: { revalidate: 300 } }).catch(() => []),
    client.fetch(getLatestPostsCountQuery, {}, { next: { revalidate: 300 } }).catch(() => 0),
  ])

  const totalPages = Math.ceil(total / PER_PAGE)
  const [featuredPost, ...restPosts] = posts

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* Hero / Featured */}
      {page === 1 && featuredPost && (
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-1 w-8 bg-brand-red rounded-full" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">Featured</h2>
          </div>
          <PostCard post={featuredPost} featured />
        </section>
      )}

      {/* Latest posts grid */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="h-1 w-8 bg-brand-red rounded-full" />
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">
            {page === 1 ? 'Latest Lists' : `Page ${page}`}
          </h2>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium">No posts yet.</p>
            <p className="text-sm mt-2">Run the import script to populate content from WordPress.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {(page === 1 ? restPosts : posts).map((post: Parameters<typeof PostCard>[0]['post']) => (
              <PostCard key={post._id} post={post} />
            ))}
          </div>
        )}

        <Pagination currentPage={page} totalPages={totalPages} basePath="/" />
      </section>
    </div>
  )
}
