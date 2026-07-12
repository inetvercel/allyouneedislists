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
import SidebarPanel from '@/components/SidebarPanel'
import HelpfulWidget from '@/components/HelpfulWidget'
import { LogoMark } from '@/components/Logo'
import { catColor } from '@/lib/categoryColors'
import type { PostFull, Category } from '@/types'

const PER_PAGE = 18

// Decodes HTML entities left over after stripping tags from AI-generated content
// (e.g. "&ldquo;", "&rsquo;", "&amp;") so plain-text UI (ToC, FAQs, structured data)
// shows real characters instead of literal entity codes.
const HTML_ENTITY_MAP: Record<string, string> = {
  ldquo: '\u201C', rdquo: '\u201D', lsquo: '\u2018', rsquo: '\u2019',
  amp: '&', quot: '"', apos: "'", nbsp: ' ', mdash: '\u2014', ndash: '\u2013',
  hellip: '\u2026', lt: '<', gt: '>',
}
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&(ldquo|rdquo|lsquo|rsquo|amp|quot|apos|nbsp|mdash|ndash|hellip|lt|gt);/gi,
      (_, name) => HTML_ENTITY_MAP[name.toLowerCase()] ?? _)
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
}

function extractFaqs(html: string): { q: string; a: string }[] {
  const faqs: { q: string; a: string }[] = []
  const itemRe = /<div[^>]*class="faq-item"[^>]*>([\s\S]*?)<\/div>/gi
  let item
  while ((item = itemRe.exec(html)) !== null) {
    const inner = item[1]
    const qMatch = inner.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)
    const aMatch = inner.match(/<p[^>]*>([\s\S]*?)<\/p>/i)
    if (qMatch && aMatch) {
      const q = decodeHtmlEntities(qMatch[1].replace(/<[^>]+>/g, '').trim())
      const a = decodeHtmlEntities(aMatch[1].replace(/<[^>]+>/g, '').trim())
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
  return html.replace(/<h2/gi, (match) => {
    count++
    if (count === 3 || count === 7) {
      return `<div class="ad-slot ad-slot-inline" aria-label="Advertisement"></div><h2`
    }
    return match
  })
}

function extractToc(html: string): { id: string; text: string }[] {
  const items: { id: string; text: string }[] = []
  const re = /<h2[^>]*id="(section-\d+)"[^>]*>([\s\S]*?)<\/h2>/gi
  let m
  while ((m = re.exec(html)) !== null) {
    const raw = decodeHtmlEntities(m[2].replace(/<[^>]*>/g, '').trim().replace(/^\d+\s*/, ''))
    if (raw && !/frequently asked/i.test(raw)) items.push({ id: m[1], text: raw })
  }
  return items
}

function extractListItems(html: string, pagePath: string) {
  const items: { position: number; name: string; url: string }[] = []
  const re = /<h2[^>]*id="(section-\d+)"[^>]*>([\s\S]*?)<\/h2>/gi
  let m
  while ((m = re.exec(html)) !== null) {
    const raw = decodeHtmlEntities(m[2].replace(/<[^>]*>/g, '').trim().replace(/^\d+\s*/, ''))
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
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        {/* ── FLOATING MODERN HERO ─────────────────────────────────────────────── */}
        <div className="max-w-[1380px] mx-auto px-4 lg:px-8 pt-2">
          <div className="relative overflow-hidden rounded-3xl bg-[#151515] border border-white/[0.06] shadow-2xl shadow-black/30">
            {/* Ambient category-colored glow */}
            <div
              className="absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full opacity-[0.15] blur-3xl pointer-events-none"
              style={{ backgroundColor: catColor(post.categories?.[0]?.slug) }}
            />

            <div className="relative px-5 md:px-8 lg:px-10 pt-6 pb-8 lg:pb-10">
              {/* Breadcrumb */}
              <nav className="flex items-center gap-1.5 text-xs text-gray-500 pb-5 flex-wrap">
                {breadcrumbs.map((crumb, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    {i < breadcrumbs.length - 1 ? (
                      <>
                        <Link href={crumb.href} className="hover:text-gray-300 transition-colors">{crumb.label}</Link>
                        <ChevronRight size={11} className="text-gray-700" />
                      </>
                    ) : (
                      <span className="text-gray-600 line-clamp-1">{crumb.label}</span>
                    )}
                  </span>
                ))}
              </nav>

              {/* Split: title (left) + image (right) */}
              <div className={`grid gap-7 lg:gap-10 items-center ${imageUrl ? 'grid-cols-1 lg:grid-cols-[1fr_440px]' : 'grid-cols-1 max-w-3xl'}`}>

                {/* Left: categories + title + meta */}
                <div>
                  {post.categories && post.categories.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {post.categories.slice(0, 3).map((cat) => {
                        const color = catColor(cat.slug)
                        return (
                          <Link key={cat._id} href={`/category/${cat.slug}`}
                            className="text-[10px] font-black uppercase tracking-widest text-white px-2.5 py-1 rounded-full shadow-lg transition-opacity hover:opacity-80"
                            style={{ backgroundColor: color, boxShadow: `0 3px 12px ${color}55` }}>
                            {cat.name}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                  <h1 className="text-3xl md:text-4xl lg:text-[2.7rem] font-black text-white leading-[1.1] mb-5">
                    {post.title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] text-gray-300 font-semibold">
                      <Calendar size={12} className="text-gray-500" />
                      <time dateTime={post.date}>{formatDate(post.date)}</time>
                    </span>
                    <span className="px-3 py-1.5 rounded-full bg-white/[0.06] text-gray-300 font-semibold">
                      {readingTime} min read
                    </span>
                    {freshnessDate && (
                      <span className="px-3 py-1.5 rounded-full bg-[#4ade80]/10 text-[#4ade80] font-bold">
                        Updated {formatMonthYear(freshnessDate)}
                      </span>
                    )}
                    <Link href="/contact"
                      className="px-3 py-1.5 rounded-full bg-gradient-to-r from-[#E63946] to-[#ff8a5c] text-white font-bold hover:shadow-[0_4px_16px_rgba(230,57,70,0.5)] transition-shadow">
                      Get Listed
                    </Link>
                  </div>
                </div>

              {/* Right: featured image */}
              {imageUrl && (
                <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/60" style={{ aspectRatio: '16/9' }}>
                  <Image src={imageUrl} alt={post.featuredImage?.alt || post.title} fill
                    className="object-cover" priority />
                </div>
              )}
              </div>
            </div>
          </div>
        </div>

        {/* ── CONTENT GRID ────────────────────────────────────────────────────── */}
        <div className="article-page-wrapper">
        <article className="article-main">

        {/* Mobile ToC — inside article, collapsible. Hidden on desktop (sidebar handles it there) */}
        {toc.length >= 4 && (
          <div className="lg:hidden mb-6 mt-6">
            <TableOfContents items={toc} variant="mobile" />
          </div>
        )}

        {/* Sentinel: JS in SidebarPanel reads this to align TOC with content start */}
        <div id="content-start" aria-hidden="true" />

        {/* Affiliate disclosure — required near affiliate links, not just buried in Terms */}
        <p className="text-[11px] text-gray-400 italic mb-5 pb-4 border-b border-gray-100">
          This post may contain affiliate links. As an Amazon Associate, we earn from qualifying purchases at no extra cost to you. See our{' '}
          <Link href="/terms" className="underline hover:text-gray-600">Terms</Link>.
        </p>

        {/* Content */}
        <div
          className="post-content-body"
          dangerouslySetInnerHTML={{ __html: cleanedContent }}
        />

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-10 pt-6 border-t border-gray-300">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Tags:</span>
              {post.tags.map((tag) => (
                <Link
                  key={tag._id}
                  href={`/tag/${tag.slug}`}
                  className="text-xs bg-white text-gray-600 border border-gray-200 px-2.5 py-1 rounded-full hover:bg-[#E63946] hover:text-white hover:border-[#E63946] transition-colors"
                >
                  {tag.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Author box */}
        <div className="mt-10 pt-6 border-t border-gray-300 flex items-start gap-4">
          <LogoMark size={44} />
          <div>
            <p className="font-bold text-sm text-gray-900">AYNIL Editorial Team</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
              Researched and written by the All You Need Is Lists editorial team. Our lists are regularly reviewed and updated with the latest information.
            </p>
          </div>
        </div>

        {/* Was this helpful — after reading, not before */}
        <HelpfulWidget />

        {/* Related posts */}
        {relatedPosts.length > 0 && (
          <section className="mt-16">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-1 w-8 bg-gradient-to-r from-[#E63946] to-[#ff8a5c] rounded-full" />
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

      {/* Sticky sidebar panel — desktop only */}
      <div className="hidden lg:block toc-sidebar-wrapper">
        <SidebarPanel
          items={toc}
          title={post.title}
          url={`https://allyouneedislists.com${fullPath}`}
          relatedPosts={relatedPosts}
        />
      </div>
      </div>{/* end article-page-wrapper */}
      </>
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

    const catAccent = catColor(category.slug)

    return (
      <div className="max-w-[1380px] mx-auto px-4 py-10">
        {/* Category header */}
        <div className="mb-10">
          {category.parent && (
            <Link
              href={`/category/${category.parent.slug}`}
              className="text-xs font-bold uppercase tracking-widest hover:opacity-75 mb-2 inline-block transition-opacity"
              style={{ color: catAccent }}
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
          <div className="flex items-center gap-2 mt-3">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: catAccent }} />
            <p className="text-sm text-gray-400">{total} lists</p>
          </div>
        </div>

        {categoryPosts.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p>No posts in this category yet.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
