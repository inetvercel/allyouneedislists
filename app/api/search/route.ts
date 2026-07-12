import { NextRequest, NextResponse } from 'next/server'
import { client } from '@/sanity/lib/client'
import { groq } from 'next-sanity'

const QUICK_SEARCH_QUERY = groq`
  *[_type == "post" && !defined(redirectTo) && (title match $q || excerpt match $q)] | order(date desc) [0...8] {
    _id,
    title,
    "slug": slug.current,
    fullPath,
    excerpt,
    date,
    featuredImage { asset, alt },
    categories[]->{ _id, name, "slug": slug.current }
  }
`

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') || '').trim()

  if (q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  try {
    const results = await client.fetch(QUICK_SEARCH_QUERY, { q: `${q}*` })
    return NextResponse.json({ results })
  } catch {
    return NextResponse.json({ results: [] }, { status: 200 })
  }
}
