import Link from 'next/link'
import Image from 'next/image'
import { Calendar } from 'lucide-react'
import { urlFor } from '@/sanity/lib/image'
import type { PostCard as PostCardType } from '@/types'

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
  const imageUrl = post.featuredImage?.asset
    ? urlFor(post.featuredImage).width(featured ? 1200 : 600).height(featured ? 630 : 340).fit('crop').url()
    : null

  if (featured) {
    return (
      <article className="group relative overflow-hidden rounded-2xl bg-white shadow-sm border border-gray-100 md:flex">
        <div className="relative md:w-3/5 aspect-video md:aspect-auto">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={post.featuredImage?.alt || post.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              priority
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-brand-dark to-gray-700 flex items-center justify-center min-h-[280px]">
              <span className="text-6xl font-black text-white/10">#</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent md:hidden" />
        </div>

        <div className="p-6 md:p-8 md:w-2/5 flex flex-col justify-center">
          {primaryCategory && (
            <Link
              href={`/category/${primaryCategory.slug}`}
              className="inline-block mb-3 text-xs font-bold uppercase tracking-widest text-brand-red hover:text-red-700"
            >
              {primaryCategory.name}
            </Link>
          )}

          <Link href={href}>
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight mb-3 group-hover:text-brand-red transition-colors">
              {post.title}
            </h2>
          </Link>

          {post.excerpt && (
            <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-3">
              {stripHtml(post.excerpt)}
            </p>
          )}

          <div className="flex items-center gap-1.5 text-gray-400 text-xs">
            <Calendar size={12} />
            <time dateTime={post.date}>{formatDate(post.date)}</time>
          </div>
        </div>
      </article>
    )
  }

  return (
    <article className="group bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col">
      <Link href={href} className="block relative aspect-[16/9] overflow-hidden bg-gray-100">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={post.featuredImage?.alt || post.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-brand-dark to-gray-700 flex items-center justify-center">
            <span className="text-4xl font-black text-white/10">#</span>
          </div>
        )}
      </Link>

      <div className="p-4 flex flex-col flex-1">
        {primaryCategory && (
          <Link
            href={`/category/${primaryCategory.slug}`}
            className="text-xs font-bold uppercase tracking-widest text-brand-red hover:text-red-700 mb-2 inline-block"
          >
            {primaryCategory.name}
          </Link>
        )}

        <Link href={href}>
          <h3 className="font-bold text-gray-900 leading-snug mb-2 line-clamp-2 group-hover:text-brand-red transition-colors">
            {post.title}
          </h3>
        </Link>

        {post.excerpt && (
          <p className="text-gray-500 text-sm leading-relaxed line-clamp-2 mb-3 flex-1">
            {stripHtml(post.excerpt)}
          </p>
        )}

        <div className="flex items-center gap-1.5 text-gray-400 text-xs mt-auto pt-2 border-t border-gray-50">
          <Calendar size={11} />
          <time dateTime={post.date}>{formatDate(post.date)}</time>
        </div>
      </div>
    </article>
  )
}
