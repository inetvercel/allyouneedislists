import Link from 'next/link'
import Image from 'next/image'
import { urlFor } from '@/sanity/lib/image'
import type { PostCard as PostCardType } from '@/types'
import { catColor } from '@/lib/categoryColors'

interface PostCardProps {
  post: PostCardType
  featured?: boolean
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim()
}

export default function PostCard({ post, featured = false }: PostCardProps) {
  const href = post.fullPath || `/${post.slug}`
  const primaryCategory = post.categories?.[0]
  const color = catColor(primaryCategory?.slug)
  const imageUrl = post.featuredImage?.asset
    ? urlFor(post.featuredImage).width(featured ? 1200 : 600).height(featured ? 630 : 400).fit('crop').url()
    : null

  if (featured) {
    return (
      <article className="group relative overflow-hidden rounded-2xl bg-[#1a1a1a] border border-white/[0.06] hover:border-white/[0.14] hover:shadow-2xl hover:shadow-black/40 transition-all duration-300 md:flex">
        <div className="relative md:w-3/5 aspect-video md:aspect-auto overflow-hidden">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={post.featuredImage?.alt || post.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              priority
            />
          ) : (
            <div className="w-full h-full bg-[#262626] flex items-center justify-center min-h-[280px]">
              <span className="text-6xl font-black text-white/10">#</span>
            </div>
          )}
          {primaryCategory && (
            <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider text-white backdrop-blur-md shadow-lg" style={{ backgroundColor: `${color}dd` }}>
              {primaryCategory.name}
            </span>
          )}
        </div>

        <div className="p-6 md:p-8 md:w-2/5 flex flex-col justify-center">
          <Link href={href}>
            <h2 className="text-2xl md:text-3xl font-black text-white leading-tight mb-3 group-hover:text-gray-200 transition-colors">
              {post.title}
            </h2>
          </Link>

          {post.excerpt && (
            <p className="text-gray-400 text-sm leading-relaxed mb-4 line-clamp-3">
              {stripHtml(post.excerpt)}
            </p>
          )}

          <div className="flex items-center gap-2 text-gray-500 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <time dateTime={post.date}>{formatDate(post.date)}</time>
          </div>
        </div>
      </article>
    )
  }

  return (
    <article className="group bg-[#1a1a1a] rounded-2xl overflow-hidden border border-white/[0.06] hover:border-white/[0.14] hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-black/40 transition-all duration-300 flex flex-col h-full">
      <Link href={href} className="block relative aspect-[3/2] overflow-hidden bg-[#262626]">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={post.featuredImage?.alt || post.title}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-[#262626] flex items-center justify-center">
            <span className="text-4xl font-black text-white/10">#</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        {primaryCategory && (
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider text-white backdrop-blur-md shadow-lg" style={{ backgroundColor: `${color}dd` }}>
            {primaryCategory.name}
          </span>
        )}
      </Link>

      <div className="p-4 flex flex-col flex-1">
        <Link href={href}>
          <h3 className="font-bold text-white leading-snug mb-2 line-clamp-2 group-hover:text-gray-200 transition-colors">
            {post.title}
          </h3>
        </Link>

        {post.excerpt && (
          <p className="text-gray-400 text-sm leading-relaxed line-clamp-2 mb-3 flex-1">
            {stripHtml(post.excerpt)}
          </p>
        )}

        <div className="flex items-center gap-2 text-gray-500 text-[10.5px] font-semibold mt-auto pt-3">
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          <time dateTime={post.date}>{formatDate(post.date)}</time>
        </div>
      </div>
    </article>
  )
}
