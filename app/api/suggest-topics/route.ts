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

  const existing = await sanityClient.fetch(`*[_type == "post"][0...1000] { title }`)
  const existingTitles = existing.map((p: { title: string }) => p.title).filter(Boolean)

  const catLine = category
    ? `Focus ONLY on the "${category}" category.`
    : `Spread ideas evenly across: ai, technology, business, entertainment, travel, lifestyle.`

  const response = await openai.chat.completions.create({
    model: 'gpt-5.5',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are a content strategist for "All You Need Is Lists", a high-traffic listicle website. 
You identify high-search-volume topic gaps — topics people actively search for that the site doesn't cover yet.`,
      },
      {
        role: 'user',
        content: `Suggest exactly ${count} fresh listicle topic ideas. ${catLine}

Requirements:
- High search volume or strongly trending in 2026
- Formats: "Best X", "Top N X", "X for Y", "X vs Y", "How to X"
- Specific and actionable — not vague or generic
- NOT similar to any existing title below

EXISTING TITLES — do not duplicate or closely paraphrase:
${existingTitles.slice(0, 400).join('\n')}

Return ONLY valid JSON:
{"topics":[{"title":"...","category":"ai|technology|business|entertainment|travel|lifestyle","searchIntent":"informational|commercial|navigational"}]}`,
      },
    ],
  })

  const data = JSON.parse(response.choices[0].message.content!)
  return Response.json(data)
}
