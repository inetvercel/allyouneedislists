import { client } from '@/sanity/lib/client'
import { getRssFeedPostsQuery } from '@/sanity/lib/queries'

const SITE_URL = 'https://allyouneedislists.com'

export async function GET() {
  const posts = await client
    .fetch(getRssFeedPostsQuery)
    .catch(() => [])

  const items = posts
    .map((post: { title: string; fullPath: string; date: string; excerpt?: string; category?: { name: string } }) => {
      const url = `${SITE_URL}${post.fullPath}`
      const description = post.excerpt
        ? post.excerpt.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim().slice(0, 300)
        : ''
      return `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      ${post.category ? `<category><![CDATA[${post.category.name}]]></category>` : ''}
      ${description ? `<description><![CDATA[${description}]]></description>` : ''}
    </item>`
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>All You Need Is Lists</title>
    <link>${SITE_URL}</link>
    <description>Your go-to destination for the best lists on the internet.</description>
    <language>en-us</language>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
