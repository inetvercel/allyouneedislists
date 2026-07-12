import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { headers } from 'next/headers'
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
import { injectAffiliateLinks } from '@/lib/affiliates'
import TableOfContents from '@/components/TableOfContents'
import type { PostFull, Category } from '@/types'

const PER_PAGE = 18

function extractFaqs(html: string): { q: string; a: string }[] {
  const faqs: { q: string; a: string }[] = []
  const itemRe = /<div[^>]*class="faq-item"[^>]*>([\s\S]*?)<\/div>/gi
  let item
  while ((item = itemRe.exec(html)) !== null) {
    const inner = item[1]
    const qMatch = inner.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)
    const aMatch = inner.match(/<p[^>]*>([\s\S]*?)<\/p>/i)
    if (qMatch && aMatch) {
      const q = qMatch[1].replace(/<[^>]+>/g, '').trim()
      const a = aMatch[1].replace(/<[^>]+>/g, '').trim()
      if (q && a) faqs.push({ q, a })
    }
  }
  return faqs
}

function cleanWordPressHtml(html: string): string {
  let clean = html

  // ── Remove junk blocks ────────────────────────────────────────────────────
  clean = clean.replace(/<div[^>]*class="post-content"[^>]*>/gi, '')
  clean = clean.replace(/<div[^>]*class="[^"]*wp-socializer[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
  clean = clean.replace(/<div[^>]*class="[^"]*sharedaddy[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
  clean = clean.replace(/<div[^>]*class="[^"]*jp-relatedposts[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
  clean = clean.replace(/<div[^>]*class="[^"]*wpcnt[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
  clean = clean.replace(/<div[^>]*>[^<]*<script[^>]*>[\s\S]*?<\/script>[^<]*<\/div>/gi, '')
  clean = clean.replace(/<script[\s\S]*?<\/script>/gi, '')
  clean = clean.replace(/<style[\s\S]*?<\/style>/gi, '')
  clean = clean.replace(/<span[^>]*class="wpsr_floatbts_anchor"[^>]*><\/span>/gi, '')

  // ── WP shortcodes ─────────────────────────────────────────────────────────
  clean = clean.replace(/\[dropcap\](.*?)\[\/dropcap\]/gi, '$1')
  clean = clean.replace(
    /\[button[^\]]*link=["&#8221;]([^"&#8221;\]]+)["&#8221;][^\]]*\](.*?)\[\/button\]/gi,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="wp-btn-link">$2</a>'
  )
  clean = clean.replace(/\[caption[^\]]*\]([\s\S]*?)\[\/caption\]/gi, '$1')
  clean = clean.replace(/\[[^\]]+\]/g, '')

  // ── Gutenberg / WP block wrappers (unwrap, keep inner content) ────────────
  clean = clean.replace(/<figure[^>]*class="[^"]*wp-block[^"]*"[^>]*>([\s\S]*?)<\/figure>/gi, '$1')
  clean = clean.replace(/<div[^>]*class="[^"]*wp-block[^"]*"[^>]*>([\s\S]*?)<\/div>/gi, '$1')
  clean = clean.replace(/<div[^>]*class="[^"]*aligncenter[^"]*"[^>]*>([\s\S]*?)<\/div>/gi, '$1')

  // ── Strip legacy / inline presentation elements ───────────────────────────
  clean = clean.replace(/<font[^>]*>([\s\S]*?)<\/font>/gi, '$1')
  clean = clean.replace(/<center>([\s\S]*?)<\/center>/gi, '$1')
  clean = clean.replace(/<span\s+style="[^"]*"[^>]*>([\s\S]*?)<\/span>/gi, '$1')
  clean = clean.replace(/\s+style="[^"]*"/gi, '')

  // ── Fix WP special characters ─────────────────────────────────────────────
  clean = clean.replace(/&#8221;/g, '"').replace(/&#8220;/g, '"')
  clean = clean.replace(/&#8217;/g, "'").replace(/&#8216;/g, "'")
  clean = clean.replace(/&#8212;/g, '—').replace(/&#8211;/g, '–')
  clean = clean.replace(/&#8230;/g, '…')
  clean = clean.replace(/&nbsp;/g, ' ')

  // ── Secure all external links ─────────────────────────────────────────────
  // Add target="_blank" + rel="noopener noreferrer" to any outbound link
  clean = clean.replace(
    /<a\s([^>]*href="https?:\/\/(?!allyouneedislists\.com)[^"]*"[^>]*)>/gi,
    (match, attrs) => {
      const hasTarget = /target=/i.test(attrs)
      const hasRel = /rel=/i.test(attrs)
      let out = attrs
      if (!hasTarget) out += ' target="_blank"'
      if (!hasRel) out += ' rel="noopener noreferrer"'
      else out = out.replace(/rel="([^"]*)"/i, 'rel="noopener noreferrer $1"')
      return `<a ${out}>`
    }
  )

  // ── Images: lazy-load, remove dead WP CDN src ─────────────────────────────
  clean = clean.replace(/<img([^>]*)>/gi, (match, attrs) => {
    const isDead = /src="https?:\/\/(?!cdn\.sanity\.io)[^"]*allyouneedislists\.com[^"]*"/i.test(attrs)
    if (isDead) return ''
    const hasLazy = /loading=/i.test(attrs)
    return `<img${attrs}${hasLazy ? '' : ' loading="lazy"'}>`
  })
  clean = clean.replace(/<figure[^>]*>\s*<\/figure>/gi, '')

  // ── Empty elements ────────────────────────────────────────────────────────
  clean = clean.replace(/<p>\s*<\/p>/gi, '')
  clean = clean.replace(/<p>\s*<span>\s*<\/span>\s*<\/p>/gi, '')
  clean = clean.replace(/<h[1-6]>\s*<\/h[1-6]>/gi, '')
  clean = clean.replace(/<div>\s*<\/div>/gi, '')

  // ── Normalise whitespace ──────────────────────────────────────────────────
  clean = clean.replace(/\n{3,}/g, '\n\n')

  return clean.trim()
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatMonthYear(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function calcReadingTime(html: string): number {
  const text = html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
  const words = text.split(' ').filter(Boolean).length
  return Math.max(1, Math.ceil(words / 200))
}

function injectH2Ids(html: string): string {
  let i = 0
  return html.replace(/<h2([^>]*)>/gi, (_, attrs) => {
    i++
    if (/\bid\s*=/i.test(attrs)) return `<h2${attrs}>`
    return `<h2${attrs} id="section-${i}">`
  })
}

function injectAdSlots(html: string): string {
  let count = 0
  return html.replace(/<\/h2>/gi, () => {
    count++
    if (count === 3 || count === 7) {
      return `</h2><div class="ad-slot ad-slot-inline" aria-label="Advertisement"></div>`
    }
    return '</h2>'
  })
}

function extractToc(html: string): { id: string; text: string }[] {
  const items: { id: string; text: string }[] = []
  const re = /<h2[^>]*id="(section-\d+)"[^>]*>([\s\S]*?)<\/h2>/gi
  let m
  while ((m = re.exec(html)) !== null) {
    const raw = m[2].replace(/<[^>]*>/g, '').trim().replace(/^\d+\s*/, '')
    if (raw && !/frequently asked/i.test(raw)) items.push({ id: m[1], text: raw })
  }
  return items
}

function extractListItems(html: string, pagePath: string) {
  const items: { position: number; name: string; url: string }[] = []
  const re = /<h2[^>]*id="(section-\d+)"[^>]*>([\s\S]*?)<\/h2>/gi
  let m
  while ((m = re.exec(html)) !== null) {
    const raw = m[2].replace(/<[^>]*>/g, '').trim().replace(/^\d+\s*/, '')
    if (raw && !/frequently asked/i.test(raw)) {
      items.push({ position: items.length + 1, name: raw, url: `${pagePath}#${m[1]}` })
    }
  }
  return items
}

function getFreshnessDate(date: string, updatedAt?: string): string | null {
  if (!updatedAt) return null
  const published = new Date(date).getTime()
  const updated = new Date(updatedAt).getTime()
  if ((updated - published) < 1000 * 60 * 60 * 24 * 14) return null
  return updatedAt
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
        modifiedTime: post.updatedAt || post.date,
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

  // 301 redirect stub
  if (post?.redirectTo) {
    redirect(post.redirectTo)
  }

  if (post) {
    let cleanedContent = cleanWordPressHtml(post.content || '')
    // Wrap list-item numbers in h2 headings with a styled circle span
    cleanedContent = cleanedContent.replace(
      /<h2>(\d{1,2})\.[\s\u00A0]*/g,
      '<h2 class="numbered-h2"><span class="list-num">$1</span>'
    )
    // Detect visitor country for region-appropriate affiliate links (Vercel geo)
    const reqHeaders = await headers()
    const country = reqHeaders.get('x-vercel-ip-country') || ''
    // Inject anchor IDs, ad slots, then affiliate links
    cleanedContent = injectH2Ids(cleanedContent)
    cleanedContent = injectAdSlots(cleanedContent)
    cleanedContent = injectAffiliateLinks(cleanedContent, country)
    const toc = extractToc(cleanedContent)
    const listItems = extractListItems(cleanedContent, fullPath)
    const categoryIds = post.categories?.map((c) => c._id) || []
    const relatedPosts = categoryIds.length
      ? await client.fetch(getRelatedPostsQuery, { currentId: post._id, categoryIds }).catch(() => [])
      : []

    const imageUrl = post.featuredImage?.asset
      ? urlFor(post.featuredImage).width(1200).height(630).fit('crop').url()
      : null
    const readingTime = calcReadingTime(post.content || '')
    const freshnessDate = getFreshnessDate(post.date, post.updatedAt)

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

    const faqs = extractFaqs(cleanedContent)

    const jsonLd = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Article',
          headline: post.title,
          datePublished: post.date,
          dateModified: post.updatedAt || post.date,
          description: post.seoDescription || post.excerpt?.replace(/<[^>]*>/g, '').slice(0, 200),
          url: `https://allyouneedislists.com${fullPath}`,
          ...(imageUrl && {
            image: {
              '@type': 'ImageObject',
              url: imageUrl,
              width: 1200,
              height: 630,
            },
          }),
          author: {
            '@type': 'Person',
            name: 'AYNIL Editorial Team',
            url: 'https://allyouneedislists.com/about',
          },
          publisher: {
            '@type': 'Organization',
            name: 'All You Need Is Lists',
            url: 'https://allyouneedislists.com',
            logo: {
              '@type': 'ImageObject',
              url: 'https://allyouneedislists.com/logo.png',
            },
          },
          mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': `https://allyouneedislists.com${fullPath}`,
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
        ...(listItems.length >= 3
          ? [{
              '@type': 'ItemList',
              name: post.title,
              numberOfItems: listItems.length,
              itemListElement: listItems.map((item) => ({
                '@type': 'ListItem',
                position: item.position,
                name: item.name,
                url: `https://allyouneedislists.com${item.url}`,
              })),
            }]
          : []),
        ...(faqs.length > 0
          ? [{
              '@type': 'FAQPage',
              mainEntity: faqs.map(({ q, a }) => ({
                '@type': 'Question',
                name: q,
                acceptedAnswer: { '@type': 'Answer', text: a },
              })),
            }]
          : []),
      ],
    }

    return (
      <div className="article-page-wrapper">
        <article className="article-main">
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

        {/* Refreshed-from banner */}
        {post.originalPath && (
          <div className="flex items-center gap-2 mb-4 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5">
            <span className="text-base">🔄</span>
            <span>
              Updated from <span className="font-semibold">&ldquo;{post.originalTitle || post.originalPath}&rdquo;</span>
              {' '}—{' '}
              <Link href="/history" className="underline underline-offset-2 hover:text-amber-900">
                view all updates
              </Link>
            </span>
          </div>
        )}

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
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400 mb-8 pb-8 border-b border-gray-100">
          <div className="flex items-center gap-1.5">
            <Calendar size={14} />
            <time dateTime={post.date}>{formatDate(post.date)}</time>
          </div>
          <span className="text-gray-200">·</span>
          <span>{readingTime} min read</span>
          {freshnessDate && (
            <>
              <span className="text-gray-200">·</span>
              <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full">
                Updated {formatMonthYear(freshnessDate)}
              </span>
            </>
          )}
          <>
            <span className="text-gray-200">·</span>
            <Link
              href="/contact"
              className="inline-flex items-center gap-1 bg-[#E63946] text-white text-xs font-bold px-2.5 py-1 rounded-full hover:bg-[#c1121f] transition-colors"
            >
              Get Listed
            </Link>
          </>
        </div>

        {/* Mobile ToC — inside article, above content */}
        {toc.length >= 4 && (
          <TableOfContents items={toc} />
        )}

        {/* Featured Image */}
        {imageUrl && (
          <div className="relative w-full pb-[52%] rounded-2xl overflow-hidden mb-10 shadow-md">
            <Image
              src={imageUrl}
              alt={post.featuredImage?.alt || post.title}
              fill
              className="object-cover absolute inset-0"
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
                <Link
                  key={tag._id}
                  href={`/tag/${tag.slug}`}
                  className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full hover:bg-brand-red hover:text-white transition-colors"
                >
                  {tag.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Author box */}
        <div className="mt-10 pt-6 border-t border-gray-100 flex items-start gap-4">
          <div className="w-11 h-11 rounded-full bg-[#E63946] flex items-center justify-center flex-shrink-0">
            <span className="text-white font-black text-sm">AY</span>
          </div>
          <div>
            <p className="font-bold text-sm text-gray-900">AYNIL Editorial Team</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
              Researched and written by the All You Need Is Lists editorial team. Our lists are regularly reviewed and updated with the latest information.
            </p>
          </div>
        </div>

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

      {/* Sticky sidebar ToC — desktop only */}
      {toc.length >= 4 && (
        <TableOfContents items={toc} />
      )}
    </div>
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
