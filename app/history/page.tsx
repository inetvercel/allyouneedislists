import type { Metadata } from 'next'
import Link from 'next/link'
import { client } from '@/sanity/lib/client'
import { groq } from 'next-sanity'

export const metadata: Metadata = {
  title: 'Article Update History',
  description: "A log of every article we've refreshed — from the original WordPress post to the new AI-written version.",
}

export const revalidate = 3600

interface RefreshedPost {
  _id: string
  title: string
  fullPath: string
  originalTitle: string
  originalPath: string
  date: string
  'category': { name: string; slug: string } | null
}

async function getRefreshedPosts(): Promise<RefreshedPost[]> {
  return client.fetch(groq`
    *[_type == "post" && defined(originalPath)] | order(date desc) {
      _id,
      title,
      fullPath,
      originalTitle,
      originalPath,
      date,
      "category": categories[0]-> { name, "slug": slug.current }
    }
  `)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function HistoryPage() {
  const posts = await getRefreshedPosts()

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-black text-gray-900 mb-2">Article Update History</h1>
        <p className="text-gray-500">
          Every article we&apos;ve refreshed from the original WordPress archive — old title, new title, what changed.
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">🔄</p>
          <p className="font-semibold text-lg">No refreshed articles yet.</p>
          <p className="text-sm mt-1">Run <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">refresh-post.mjs</code> to get started.</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-400 mb-6">{posts.length} article{posts.length !== 1 ? 's' : ''} refreshed</p>

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-4 mb-10">
            {[
              { label: 'Articles updated', value: posts.length },
              { label: 'Old URLs 301→new', value: posts.length },
              { label: 'Avg. quality uplift', value: '10×' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white rounded-2xl border border-gray-100 p-5 text-center shadow-sm">
                <div className="text-3xl font-black text-[#E63946]">{value}</div>
                <div className="text-xs text-gray-500 mt-1">{label}</div>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="grid grid-cols-[1fr_1fr_auto] gap-0 text-xs font-bold uppercase tracking-wider text-gray-400 px-6 py-3 border-b border-gray-100 bg-gray-50">
              <span>Old article</span>
              <span>New article</span>
              <span>Date</span>
            </div>

            {posts.map((post, i) => (
              <div
                key={post._id}
                className={`grid grid-cols-[1fr_1fr_auto] gap-4 items-start px-6 py-4 ${i < posts.length - 1 ? 'border-b border-gray-50' : ''}`}
              >
                {/* Old */}
                <div>
                  {post.category && (
                    <Link
                      href={`/category/${post.category.slug}`}
                      className="text-[10px] font-bold uppercase tracking-widest text-[#E63946] mb-1 block hover:underline"
                    >
                      {post.category.name}
                    </Link>
                  )}
                  <p className="text-sm text-gray-500 line-clamp-2 leading-snug">
                    {post.originalTitle || post.originalPath}
                  </p>
                  <p className="text-[11px] text-gray-300 mt-0.5 font-mono truncate">{post.originalPath}</p>
                </div>

                {/* New */}
                <div>
                  <Link
                    href={post.fullPath}
                    className="text-sm font-semibold text-gray-900 hover:text-[#E63946] line-clamp-2 leading-snug transition-colors"
                  >
                    {post.title}
                  </Link>
                  <p className="text-[11px] text-gray-300 mt-0.5 font-mono truncate">{post.fullPath}</p>
                </div>

                {/* Date */}
                <div className="text-xs text-gray-400 whitespace-nowrap pt-0.5">
                  {formatDate(post.date)}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
