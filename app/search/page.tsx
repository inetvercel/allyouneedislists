import type { Metadata } from 'next'
import { Search as SearchIcon } from 'lucide-react'
import { client } from '@/sanity/lib/client'
import { searchPostsQuery } from '@/sanity/lib/queries'
import DarkCard from '@/components/DarkCard'
import type { PostCard as PostCardType } from '@/types'

export const metadata: Metadata = {
  title: 'Search',
  description: 'Search 1,400+ curated lists on All You Need Is Lists.',
  robots: { index: false, follow: true },
}

const W = 'max-w-[1380px]'

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const query = (q || '').trim()

  const results: PostCardType[] = query.length >= 2
    ? await client.fetch(searchPostsQuery, { q: `${query}*` }, { next: { revalidate: 60 } }).catch(() => [])
    : []

  return (
    <div className={`${W} mx-auto px-4 py-2`}>

      {/* Floating dark hero */}
      <div className="relative overflow-hidden rounded-3xl bg-[#151515] border border-white/[0.06] shadow-2xl shadow-black/30 px-6 md:px-10 py-9 md:py-11 mb-8">
        <div className="absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full opacity-[0.12] blur-3xl pointer-events-none bg-[#E63946]" />
        <div className="relative max-w-2xl">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#E63946] mb-3 block">Search</span>
          <h1 className="text-2xl md:text-3xl font-black text-white leading-tight mb-6">
            Find your next favorite list
          </h1>
          <form method="GET" action="/search" className="relative">
            <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search lists, topics, ideas…"
              autoFocus
              autoComplete="off"
              className="w-full pl-12 pr-4 py-3.5 bg-white/[0.06] border border-white/[0.1] rounded-full text-white placeholder-gray-500 text-[15px] font-medium focus:outline-none focus:ring-2 focus:ring-[#E63946]/50 focus:border-[#E63946] transition-all"
            />
          </form>
        </div>
      </div>

      {/* Results */}
      {query.length < 2 ? (
        <div className="text-center py-20 text-gray-500">
          <SearchIcon size={36} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium text-gray-700">Start typing to search 1,400+ lists</p>
          <p className="text-sm mt-2 text-gray-500">Try topics like &quot;movies&quot;, &quot;travel&quot;, &quot;AI tools&quot;</p>
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-lg font-medium text-gray-700">No results for &ldquo;{query}&rdquo;</p>
          <p className="text-sm mt-2">Try a different keyword or browse by category</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 font-semibold mb-5">
            {results.length} result{results.length !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
            {results.map((post) => (
              <DarkCard key={post._id} post={post} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
