import type { MetadataRoute } from 'next'
import { client } from '@/sanity/lib/client'
import {
  getSitemapPostsQuery,
  getSitemapPostsCountQuery,
  getAllCategorySlugPathsQuery,
} from '@/sanity/lib/queries'

const SITE_URL = 'https://allyouneedislists.com'
const POSTS_PER_SITEMAP = 500

export async function generateSitemaps() {
  const total = await client
    .fetch<number>(getSitemapPostsCountQuery)
    .catch(() => 0)

  const count = Math.max(1, Math.ceil(total / POSTS_PER_SITEMAP))
  return Array.from({ length: count }, (_, i) => ({ id: i }))
}

export default async function sitemap({
  id,
}: {
  id: number
}): Promise<MetadataRoute.Sitemap> {
  const start = id * POSTS_PER_SITEMAP
  const end = start + POSTS_PER_SITEMAP

  const [posts, categories] = await Promise.all([
    client
      .fetch<{ fullPath: string; date: string; updatedAt?: string }[]>(getSitemapPostsQuery, { start, end })
      .catch(() => []),
    id === 0
      ? client
          .fetch<{ slug: string }[]>(getAllCategorySlugPathsQuery)
          .catch(() => [])
      : Promise.resolve([]),
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

  const staticEntries: MetadataRoute.Sitemap =
    id === 0
      ? [{ url: SITE_URL, changeFrequency: 'daily', priority: 1.0 }]
      : []

  return [...staticEntries, ...categoryEntries, ...postEntries]
}
