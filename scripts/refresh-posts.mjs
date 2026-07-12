/**
 * refresh-posts.mjs
 *
 * Re-generates content for AI-authored posts older than N days using Grok + web search.
 * Updates the post's content, seoDescription, updatedAt in Sanity.
 *
 * Usage:
 *   node scripts/refresh-posts.mjs                    # Refresh posts older than 90 days (up to 10)
 *   node scripts/refresh-posts.mjs --days=60          # Posts older than 60 days
 *   node scripts/refresh-posts.mjs --limit=5          # Refresh up to 5 posts
 *   node scripts/refresh-posts.mjs --category=ai      # Only this category
 *   node scripts/refresh-posts.mjs --slug=my-post     # Refresh a specific post by slug
 *   node scripts/refresh-posts.mjs --dry-run          # Preview which posts would be refreshed
 */

import { createClient } from '@sanity/client'
import OpenAI from 'openai'
import 'dotenv/config'

const args = process.argv.slice(2)
const daysOld    = parseInt(args.find(a => a.startsWith('--days='))?.split('=')[1]   || '90', 10)
const limit      = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1]  || '10', 10)
const onlySlug   = args.find(a => a.startsWith('--slug='))?.split('=')[1]
const onlyCat    = args.find(a => a.startsWith('--category='))?.split('=')[1]
const dryRun     = args.includes('--dry-run')

// ─── Env ──────────────────────────────────────────────────────────────────────
const GROK_KEY     = process.env.GROK_API_KEY || process.env.XAI_API_KEY
const PROJECT_ID   = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID
const DATASET      = process.env.NEXT_PUBLIC_SANITY_DATASET    || process.env.SANITY_DATASET || 'production'
const WRITE_TOKEN  = process.env.SANITY_WRITE_TOKEN

if (!GROK_KEY)    { console.error('❌ GROK_API_KEY required'); process.exit(1) }
if (!PROJECT_ID)  { console.error('❌ NEXT_PUBLIC_SANITY_PROJECT_ID required'); process.exit(1) }
if (!WRITE_TOKEN) { console.error('❌ SANITY_WRITE_TOKEN required'); process.exit(1) }

const grokClient = new OpenAI({ baseURL: 'https://api.x.ai/v1', apiKey: GROK_KEY })
const grokModel  = process.env.GROK_MODEL || 'grok-4'

const sanity = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  token: WRITE_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
})

// ─── Helpers ──────────────────────────────────────────────────────────────────
function extractGrokText(response) {
  if (Array.isArray(response.output)) {
    let lastText = ''
    for (const item of response.output) {
      if (item.type === 'message') {
        for (const c of (item.content || [])) {
          if (c.type === 'output_text' && c.text) lastText = c.text
        }
      }
    }
    if (lastText) return lastText
  }
  if (response.output_text) return String(response.output_text)
  return ''
}

function extractJson(text) {
  const start = text.indexOf('{')
  if (start === -1) throw new Error('No JSON object found')
  let depth = 0, end = -1
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++
    else if (text[i] === '}') { depth--; if (depth === 0) { end = i; break } }
  }
  if (end === -1) throw new Error('JSON block not closed')
  return text.slice(start, end + 1)
}

// ─── Fetch posts due for refresh ──────────────────────────────────────────────
async function getPostsToRefresh() {
  const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString()

  const slugFilter = onlySlug ? `&& slug.current == "${onlySlug}"` : ''
  const catFilter  = onlyCat  ? `&& references(*[_type=="category" && slug.current == "${onlyCat}"]._id)` : ''

  const query = `
    *[_type == "post"
      && !(_id in path("drafts.**"))
      && aiGenerated == true
      && !defined(redirectTo)
      && (updatedAt < "${cutoff}" || (!defined(updatedAt) && date < "${cutoff}"))
      ${slugFilter}
      ${catFilter}
    ] | order(date asc) [0...${limit}] {
      _id, title, slug, fullPath, date, updatedAt,
      "category": categories[0]->slug.current,
      content, excerpt, seoDescription
    }
  `
  return sanity.fetch(query).catch(() => [])
}

// ─── Refresh a single post via Grok ───────────────────────────────────────────
async function refreshPost(post) {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const system = `Today's date: ${today}
You have web_search and x_search tools. BEFORE rewriting, search for the most current information about this topic to ensure all facts, prices, rankings, and stats are up to date as of today.

You are refreshing an existing article for "All You Need Is Lists". Keep the same structure and list format, but:
- Update any outdated facts, prices, statistics, or rankings with current data you find via search
- Add any important new entries that didn't exist when the article was first written  
- Replace dead external links with current working ones you find via search
- Keep the same HTML structure (quick-picks box, numbered h2 items, faq-section)
- Do NOT change the title unless it contains a specific year that is now outdated

Return ONLY valid JSON — no markdown, no code fences:
{"content":"<refreshed full article HTML>","seoDescription":"Updated meta description 145-155 chars","changes":"1-2 sentence summary of what was updated"}`

  const response = await grokClient.responses.create({
    model: grokModel,
    input: [
      { role: 'system', content: system },
      { role: 'user', content: `Refresh this article: "${post.title}"\nCategory: ${post.category || 'general'}\n\nCurrent content:\n${(post.content || '').slice(0, 6000)}` },
    ],
    tools: [{ type: 'web_search' }, { type: 'x_search' }],
  })

  const raw = extractGrokText(response)
  const json = extractJson(raw)
  return JSON.parse(json)
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🔄 Content Refresh Pipeline`)
  console.log(`   Posts older than: ${daysOld} days`)
  console.log(`   Limit: ${limit}`)
  if (onlySlug) console.log(`   Slug filter: ${onlySlug}`)
  if (onlyCat)  console.log(`   Category filter: ${onlyCat}`)
  if (dryRun)   console.log(`   DRY RUN — no changes will be saved`)
  console.log()

  const posts = await getPostsToRefresh()

  if (posts.length === 0) {
    console.log('✅ No posts due for refresh.')
    return
  }

  console.log(`Found ${posts.length} post(s) to refresh:\n`)
  for (const p of posts) {
    const age = Math.floor((Date.now() - new Date(p.updatedAt || p.date).getTime()) / (1000 * 60 * 60 * 24))
    console.log(`  • ${p.title} (${age} days old)`)
  }
  console.log()

  if (dryRun) {
    console.log('Dry run complete — no posts updated.')
    return
  }

  let success = 0, failed = 0

  for (const post of posts) {
    console.log(`\n📝 Refreshing: "${post.title}"`)
    try {
      const refreshed = await refreshPost(post)

      await sanity.patch(post._id).set({
        content: refreshed.content,
        seoDescription: refreshed.seoDescription || post.seoDescription,
        updatedAt: new Date().toISOString(),
      }).commit()

      console.log(`  ✅ Updated — ${refreshed.changes || 'content refreshed'}`)
      success++
    } catch (err) {
      console.error(`  ❌ Failed: ${err.message}`)
      failed++
    }
  }

  console.log(`\n✨ Refresh complete: ${success} updated, ${failed} failed`)
}

main().catch(err => { console.error(err); process.exit(1) })
