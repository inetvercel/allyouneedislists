import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Calendar, Tag, ChevronRight } from 'lucide-react'
import { client } from '@/sanity/lib/client'
import { urlFor } from '@/sanity/lib/image'
import {
  getPostByPathQuery,
  getCategoryBySlugQuery,
  getPostsByCategoryQuery,
  getPostsByCategoryCountQuery,
  getRelatedPostsQuery,
} from '@/sanity/lib/queries'
import PostCard from '@/components/PostCard'
import Pagination from '@/components/Pagination'
import type { PostFull, Category } from '@/types'

const PER_PAGE = 18

function cleanWordPressHtml(html: string): string {
  let clean = html

  // Remove wrapping post-content div
  clean = clean.replace(/<div[^>]*class="post-content"[^>]*>/gi, '')

  // Remove social share buttons block
  clean = clean.replace(/<div[^>]*class="[^"]*wp-socializer[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')

  // Remove ad script blocks
  clean = clean.replace(/<div[^>]*>[^<]*<script[^>]*>[\s\S]*?<\/script>[^<]*<\/div>/gi, '')
  clean = clean.replace(/<script[\s\S]*?<\/script>/gi, '')

  // Remove wpsr anchor spans
  clean = clean.replace(/<span[^>]*class="wpsr_floatbts_anchor"[^>]*><\/span>/gi, '')

  // Convert [dropcap]X[/dropcap] shortcodes
  clean = clean.replace(/\[dropcap\](.*?)\[\/dropcap\]/gi, '$1')

  // Convert [button color="..." link="url" target="..."]Text[/button]
  clean = clean.replace(
    /\[button[^\]]*link=["&#8221;]([^"&#8221;\]]+)["&#8221;][^\]]*\](.*?)\[\/button\]/gi,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="wp-btn-link">$2</a>'
  )

  // Remove remaining shortcodes
  clean = clean.replace(/\[[^\]]+\]/g, '')

  // Fix encoded quotes in attributes
  clean = clean.replace(/&#8221;/g, '"').replace(/&#8220;/g, '"')

  // Remove empty paragraphs
  clean = clean.replace(/<p>\s*<\/p>/gi, '')
  clean = clean.replace(/<p>\s*<span>\s*<\/span>\s*<\/p>/gi, '')

  return clean.trim()
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>
}): Promise<Metadata> {
  const { slug } = await params
  const fullPath = '/' + slug.join('/')
  const lastSlug = slug[slug.length - 1]

  const post = await client.fetch<PostFull | null>(getPostByPathQuery, { path: fullPath }).catch(() => null)
  if (post) {
    const title = post.seoTitle || post.title
    const description = post.seoDescription || post.excerpt?.replace(/<[^>]*>/g, '').slice(0, 160)
    const category = post.categories?.[0]?.name || ''
    const ogImage = post.featuredImage?.asset
      ? urlFor(post.featuredImage).width(1200).height(630).url()
      : `/og?title=${encodeURIComponent(title)}&category=${encodeURIComponent(category)}`

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: [{ url: ogImage, width: 1200, height: 630 }],
        type: 'article',
        publishedTime: post.date,
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogImage],
      },
    }
  }

  const category = await client.fetch<Category | null>(getCategoryBySlugQuery, { slug: lastSlug }).catch(() => null)
  if (category) {
    return {
      title: `${category.name} Lists`,
      description: category.description || `Browse the best ${category.name} lists.`,
    }
  }

  return { title: 'Not Found' }
}

export default async function SlugPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string[] }>
  searchParams: Promise<{ page?: string }>
}) {
  const { slug } = await params
  const sp = await searchParams
  const fullPath = '/' + slug.join('/')
  const lastSlug = slug[slug.length - 1]

  // 1. Try post
  const post = await client.fetch<PostFull | null>(getPostByPathQuery, { path: fullPath }).catch(() => null)

  if (post) {
    const cleanedContent = cleanWordPressHtml(post.content || '')
    const categoryIds = post.categories?.map((c) => c._id) || []
    const relatedPosts = categoryIds.length
      ? await client.fetch(getRelatedPostsQuery, { currentId: post._id, categoryIds }).catch(() => [])
      : []

    const imageUrl = post.featuredImage?.asset
      ? urlFor(post.featuredImage).width(1200).height(630).fit('crop').url()
      : null

    const breadcrumbs = [
      { label: 'Home', href: '/' },
      ...(post.categories?.[0]?.parent
        ? [{ label: post.categories[0].parent.name, href: `/category/${post.categories[0].parent.slug}` }]
        : []),
      ...(post.categories?.[0]
        ? [{ label: post.categories[0].name, href: `/category/${post.categories[0].slug}` }]
        : []),
      { label: post.title, href: fullPath },
    ]

    const jsonLd = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Article',
          headline: post.title,
          datePublished: post.date,
          dateModified: post.date,
          description: post.seoDescription || post.excerpt?.replace(/<[^>]*>/g, '').slice(0, 200),
          url: `https://allyouneedislists.com${fullPath}`,
          ...(imageUrl && { image: { '@type': 'ImageObject', url: imageUrl } }),
          publisher: {
            '@type': 'Organization',
            name: 'All You Need Is Lists',
            url: 'https://allyouneedislists.com',
          },
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: breadcrumbs.map((crumb, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: crumb.label,
            item: `https://allyouneedislists.com${crumb.href}`,
          })),
        },
      ],
    }

    return (
      <article className="max-w-4xl mx-auto px-4 py-10">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-6 flex-wrap">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i < breadcrumbs.length - 1 ? (
                <>
                  <Link href={crumb.href} className="hover:text-brand-red transition-colors">
                    {crumb.label}
                  </Link>
                  <ChevronRight size={12} />
                </>
              ) : (
                <span className="text-gray-600 font-medium line-clamp-1">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>

        {/* Categories */}
        {post.categories && post.categories.length > 0 && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {post.categories.map((cat) => (
              <Link
                key={cat._id}
                href={`/category/${cat.slug}`}
                className="text-xs font-bold uppercase tracking-widest text-brand-red hover:text-red-700 bg-red-50 px-2.5 py-1 rounded-full"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        )}

        {/* Title */}
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 leading-tight mb-4">
          {post.title}
        </h1>

        {/* Meta */}
        <div className="flex items-center gap-4 text-sm text-gray-400 mb-8 pb-8 border-b border-gray-100">
          <div className="flex items-center gap-1.5">
            <Calendar size={14} />
            <time dateTime={post.date}>{formatDate(post.date)}</time>
          </div>
          {post.tags && post.tags.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Tag size={14} />
              <span>{post.tags.slice(0, 3).map((t) => t.name).join(', ')}</span>
            </div>
          )}
        </div>

        {/* Featured Image */}
        {imageUrl && (
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden mb-10 shadow-md">
            <Image
              src={imageUrl}
              alt={post.featuredImage?.alt || post.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        {/* Content */}
        <div
          className="post-content-body"
          dangerouslySetInnerHTML={{ __html: cleanedContent }}
        />

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-10 pt-6 border-t border-gray-100">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Tags:</span>
              {post.tags.map((tag) => (
                <span
                  key={tag._id}
                  className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Related posts */}
        {relatedPosts.length > 0 && (
          <section className="mt-16">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-1 w-8 bg-brand-red rounded-full" />
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">You Might Also Like</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {relatedPosts.slice(0, 4).map((p: Parameters<typeof PostCard>[0]['post']) => (
                <PostCard key={p._id} post={p} />
              ))}
            </div>
          </section>
        )}
      </article>
    )
  }

  // 2. Try category
  const category = await client.fetch<Category | null>(getCategoryBySlugQuery, { slug: lastSlug }).catch(() => null)

  if (category) {
    const page = Math.max(1, parseInt(sp.page || '1', 10))
    const start = (page - 1) * PER_PAGE
    const end = start + PER_PAGE

    const [categoryPosts, total] = await Promise.all([
      client.fetch(getPostsByCategoryQuery, { slug: lastSlug, start, end }).catch(() => []),
      client.fetch(getPostsByCategoryCountQuery, { slug: lastSlug }).catch(() => 0),
    ])

    const totalPages = Math.ceil(total / PER_PAGE)

    return (
      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* Category header */}
        <div className="mb-10">
          {category.parent && (
            <Link
              href={`/category/${category.parent.slug}`}
              className="text-xs font-bold uppercase tracking-widest text-brand-red hover:text-red-700 mb-2 inline-block"
            >
              {category.parent.name}
            </Link>
          )}
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-3 capitalize">
            {category.name}
          </h1>
          {category.description && (
            <p className="text-gray-500 max-w-2xl">{category.description}</p>
          )}
          <p className="text-sm text-gray-400 mt-2">{total} lists</p>
        </div>

        {categoryPosts.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p>No posts in this category yet.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {categoryPosts.map((p: Parameters<typeof PostCard>[0]['post']) => (
                <PostCard key={p._id} post={p} />
              ))}
            </div>
            <Pagination currentPage={page} totalPages={totalPages} basePath={fullPath} />
          </>
        )}
      </div>
    )
  }

  notFound()
}
