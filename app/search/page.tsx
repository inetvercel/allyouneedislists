import type { Metadata } from 'next'
import { Search } from 'lucide-react'
import { client } from '@/sanity/lib/client'
import { searchPostsQuery } from '@/sanity/lib/queries'
import PostCard from '@/components/PostCard'

export const metadata: Metadata = {
  title: 'Search',
  description: 'Search 1,400+ curated lists on All You Need Is Lists.',
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const query = (q || '').trim()

  const results = query.length >= 2
    ? await client.fetch(searchPostsQuery, { q: `${query}*` }, { next: { revalidate: 60 } }).catch(() => [])
    : []

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* Search header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-1 w-8 bg-brand-red rounded-full" />
          <h1 className="text-xs font-bold uppercase tracking-widest text-gray-500">Search</h1>
        </div>

        <form method="GET" action="/search" className="relative max-w-2xl">
          <div className="relative">
            <Search
              size={20}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search lists, topics, ideas…"
              autoFocus
              autoComplete="off"
              className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-400 text-base font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-red/40 focus:border-brand-red transition-all"
            />
          </div>
        </form>
      </div>

      {/* Results */}
      {query.length < 2 ? (
        <div className="text-center py-20 text-gray-400">
          <Search size={40} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Start typing to search 1,400+ lists</p>
          <p className="text-sm mt-2">Try topics like &quot;movies&quot;, &quot;travel&quot;, &quot;AI tools&quot;</p>
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium">No results for &ldquo;{query}&rdquo;</p>
          <p className="text-sm mt-2">Try a different keyword or browse by category</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 font-medium mb-6">
            {results.length} result{results.length !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((post: Parameters<typeof PostCard>[0]['post']) => (
              <PostCard key={post._id} post={post} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
