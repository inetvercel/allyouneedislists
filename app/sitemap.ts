import type { MetadataRoute } from 'next'
import { client } from '@/sanity/lib/client'
import {
  getSitemapPostsQuery,
  getAllCategorySlugPathsQuery,
  getAllTagSlugPathsQuery,
} from '@/sanity/lib/queries'

const SITE_URL = 'https://allyouneedislists.com'
// Google's sitemap limit is 50,000 URLs per file — well above this site's post count,
// so a single sitemap.xml is used (generateSitemaps() is intentionally NOT used here:
// it causes Next.js to 404 the root /sitemap.xml instead of serving an index —
// see https://github.com/vercel/next.js/issues/77304).
const MAX_URLS = 45000

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, categories, tags] = await Promise.all([
    client
      .fetch<{ fullPath: string; date: string; updatedAt?: string }[]>(getSitemapPostsQuery, {
        start: 0,
        end: MAX_URLS,
      })
      .catch(() => []),
    client.fetch<{ slug: string }[]>(getAllCategorySlugPathsQuery).catch(() => []),
    client.fetch<{ slug: string }[]>(getAllTagSlugPathsQuery).catch(() => []),
  ])

  const postEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${SITE_URL}${post.fullPath}`,
    lastModified: new Date(post.updatedAt || post.date),
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  const categoryEntries: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${SITE_URL}/category/${cat.slug}`,
    changeFrequency: 'weekly',
    priority: 0.5,
  }))

  const tagEntries: MetadataRoute.Sitemap = tags.map((tag) => ({
    url: `${SITE_URL}/tag/${tag.slug}`,
    changeFrequency: 'weekly',
    priority: 0.4,
  }))

  const staticEntries: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE_URL}/about`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/contact`, changeFrequency: 'monthly', priority: 0.3 },
  ]

  return [...staticEntries, ...categoryEntries, ...tagEntries, ...postEntries]
}
