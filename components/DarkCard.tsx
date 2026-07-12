import Link from 'next/link'
import Image from 'next/image'
import { urlFor } from '@/sanity/lib/image'
import type { PostCard as PostCardType } from '@/types'
import { CAT_COLORS, catColor } from '@/lib/categoryColors'

export { CAT_COLORS, catColor }

export function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function stripHtml(h: string) {
  return h.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim()
}

/** DarkCard — rounded, glass badge, hover lift + zoom. The site's standard post card. */
export default function DarkCard({ post, size = 'md' }: { post: PostCardType; size?: 'lg' | 'md' | 'sm' }) {
  const href  = post.fullPath || `/${post.slug}`
  const cat   = post.categories?.[0]
  const color = catColor(cat?.slug)
  const w     = size === 'lg' ? 900 : size === 'md' ? 600 : 400
  const h     = size === 'lg' ? 600 : size === 'md' ? 400 : 266
  const img   = post.featuredImage?.asset ? urlFor(post.featuredImage).width(w).height(h).fit('crop').url() : null
  return (
    <Link href={href} className="group flex flex-col h-full bg-[#1a1a1a] rounded-2xl overflow-hidden border border-white/[0.06] hover:border-white/[0.14] hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-black/40 transition-all duration-300">
      <div className="relative overflow-hidden" style={{ aspectRatio: '3/2' }}>
        {img
          ? <Image src={img} alt={post.title} fill className="object-cover group-hover:scale-110 transition-transform duration-500" priority={size === 'lg'} />
          : <div className="absolute inset-0 bg-[#262626]" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        {cat && (
          <span
            className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider text-white backdrop-blur-md shadow-lg"
            style={{ backgroundColor: `${color}dd` }}
          >
            {cat.name}
          </span>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 className={`text-white font-bold leading-snug group-hover:text-gray-200 transition-colors ${
          size === 'lg' ? 'text-[1.3rem] md:text-[1.55rem]' : size === 'sm' ? 'text-[0.88rem]' : 'text-[1.02rem]'
        }`}>{post.title}</h3>
        {post.excerpt && size !== 'sm' && (
          <p className="text-gray-400 text-[12.5px] leading-relaxed mt-2 line-clamp-2">{stripHtml(post.excerpt)}</p>
        )}
        <div className="flex items-center gap-2 text-gray-500 text-[10.5px] font-semibold mt-auto pt-3">
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          <time>{fmtDate(post.date)}</time>
        </div>
      </div>
    </Link>
  )
}
