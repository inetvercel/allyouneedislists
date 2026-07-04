import OpenAI from 'openai'
import { createClient } from '@sanity/client'

export const maxDuration = 30
export const runtime = 'nodejs'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category') || ''
  const count = Math.min(parseInt(searchParams.get('count') || '25'), 50)

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const sanityClient = createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
    apiVersion: '2024-01-01',
    useCdn: true,
  })

  // Fetch a sample of existing titles — enough for deduplication without slowing things down
  const existing = await sanityClient.fetch(`*[_type == "post"] | order(date desc) [0...200] { title }`)
  const existingTitles: string[] = existing.map((p: { title: string }) => p.title).filter(Boolean)

  const catLine = category
    ? `Focus ONLY on the "${category}" category.`
    : `Spread ideas evenly across: ai, technology, business, entertainment, travel, lifestyle.`

  const response = await openai.chat.completions.create({
    model: 'gpt-5.5',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are a content strategist for "All You Need Is Lists", a high-traffic listicle website. You identify high-search-volume topic gaps — topics people search for that the site doesn't cover.`,
      },
      {
        role: 'user',
        content: `Suggest exactly ${count} listicle topic ideas for 2026. ${catLine}

- High search volume, evergreen or trending
- Formats: "Best X", "Top N X", "X for Y", "X vs Y"
- Not similar to existing titles below

EXISTING (avoid):
${existingTitles.slice(0, 100).join('\n')}

JSON only: {"topics":[{"title":"...","category":"ai|technology|business|entertainment|travel|lifestyle","searchIntent":"informational|commercial"}]}`,
      },
    ],
  })

  const data = JSON.parse(response.choices[0].message.content!)
  return Response.json(data)
}
