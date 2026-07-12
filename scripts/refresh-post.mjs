#!/usr/bin/env node
/**
 * refresh-post.mjs — Regenerate a thin/old post with full AI content on a clean new URL.
 *
 * Workflow:
 *   1. Generates a new full AI post (3000+ words, Top 10, proper structure)
 *   2. Sets redirectTo on ALL old posts that share the old URL (handles duplicates)
 *   3. Optionally deletes the old posts with --delete flag
 *
 * Usage:
 *   node scripts/refresh-post.mjs \
 *     --from="/lifestyle/5-places-to-visit-in-chicago-if-youre-a-sports-fan" \
 *     --topic="Best Places to Visit in Chicago as a Sports Fan" \
 *     --category=lifestyle
 *
 *   # Also delete old posts after redirect is set:
 *   node scripts/refresh-post.mjs --from="..." --topic="..." --delete
 *
 *   # Redirect multiple old paths to the same new post (duplicates):
 *   node scripts/refresh-post.mjs \
 *     --from="/lifestyle/5-places-to-visit-in-chicago-if-youre-a-sports-fan,/lifestyle/travel/5-places-to-visit-in-chicago-if-youre-a-sports-fan,/lifestyle/travel-leisure/5-places-to-visit-in-chicago-if-youre-a-sports-fan" \
 *     --topic="Best Places to Visit in Chicago as a Sports Fan" \
 *     --category=lifestyle \
 *     --delete
 */

import OpenAI from 'openai'
import { createClient } from '@sanity/client'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// ─── Load .env.local ──────────────────────────────────────────────────────────
const envPath = resolve(process.cwd(), '.env.local')
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8').replace(/^\uFEFF/, '')
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim().replace(/^["']|["']$/g, '')
      if (!process.env[key]) process.env[key] = value
    }
  }
}

// ─── Args ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const getArg = (name) => {
  const a = args.find(a => a.startsWith(`--${name}=`))
  return a ? a.split('=').slice(1).join('=') : null
}
const hasFlag = (name) => args.includes(`--${name}`)

const fromPaths   = (getArg('from') || '').split(',').map(s => s.trim()).filter(Boolean)
const topic       = getArg('topic')
const categoryArg = getArg('category') || 'lifestyle'
const shouldDelete = hasFlag('delete')
const useGrok      = hasFlag('grok')
const grokModel    = getArg('grok-model') || process.env.GROK_MODEL || 'grok-4'

if (!fromPaths.length || !topic) {
  console.error(`Usage: node scripts/refresh-post.mjs --from="/old/path" --topic="New Title" [--category=lifestyle] [--delete] [--grok]`)
  process.exit(1)
}

// ─── Env ──────────────────────────────────────────────────────────────────────
const OPENAI_KEY = process.env.OPENAI_API_KEY
const GROK_KEY   = process.env.GROK_API_KEY || process.env.XAI_API_KEY
const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const DATASET    = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
const TOKEN      = process.env.SANITY_WRITE_TOKEN

if (useGrok && !GROK_KEY) { console.error('❌ GROK_API_KEY not set'); process.exit(1) }
if (!useGrok && !OPENAI_KEY) { console.error('❌ OPENAI_API_KEY not set'); process.exit(1) }
if (!PROJECT_ID) { console.error('❌ NEXT_PUBLIC_SANITY_PROJECT_ID not set'); process.exit(1) }
if (!TOKEN)      { console.error('❌ SANITY_WRITE_TOKEN not set'); process.exit(1) }

// ─── Clients ──────────────────────────────────────────────────────────────────
const openai = OPENAI_KEY ? new OpenAI({ apiKey: OPENAI_KEY }) : null
const grokClient = GROK_KEY ? new OpenAI({ apiKey: GROK_KEY, baseURL: 'https://api.x.ai/v1' }) : null
const sanity  = createClient({ projectId: PROJECT_ID, dataset: DATASET, token: TOKEN, apiVersion: '2024-01-01', useCdn: false })

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STOP_WORDS = new Set(['the','a','an','and','or','in','on','at','to','for','of','by','with','from','is','are','was','were','how','what','why','when','where','who','will','can','you','your','we','our'])

function cleanSlug(raw) {
  return raw.toLowerCase()
    .replace(/\b20\d{2}\b/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .split(/[\s-]+/)
    .filter(w => w && !STOP_WORDS.has(w))
    .slice(0, 6)
    .join('-')
}

const CATEGORY_MAP = {
  ai: ['ai', 'ai-tools', 'ai-models', 'chatgpt', 'productivity'],
  business: ['business', 'marketing', 'seo', 'finance', 'startups'],
  technology: ['technology', 'software', 'hardware', 'programming', 'internet'],
  entertainment: ['entertainment', 'movies', 'tv', 'gaming', 'music'],
  travel: ['travel'],
  lifestyle: ['lifestyle'],
}

// ─── Content-cluster internal link discovery ─────────────────────────────────
// Finds topically-related posts for heavy natural interlinking, regardless of
// category — a post about "busiest airports" should be able to link to "biggest
// airlines" or "longest runways" even if those live in a different category.
// Combines: (1) keyword match on title, cross-category, (2) same-category-cluster posts.
const LINK_STOP_WORDS = new Set([
  'the','a','an','and','or','of','in','on','at','to','for','by','with','from','is','are',
  'was','were','best','top','worst','most','all','every','things','that','this','these',
  'those','your','you','how','what','why','when','where','who','2025','2026','2027','yearly',
])
function extractKeywords(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !LINK_STOP_WORDS.has(w) && !/^\d+$/.test(w))
    .map(w => (w.length > 4 && w.endsWith('s') ? w.slice(0, -1) : w))
    .filter(Boolean)
    .slice(0, 6)
}

async function fetchTopicalLinkCandidates(topicTitle, category) {
  const keywords = extractKeywords(topicTitle)
  const patterns = keywords.map(k => `*${k}*`)
  const catSlugs = CATEGORY_MAP[category] || [category]

  const [byKeyword, byCategory] = await Promise.all([
    patterns.length
      ? sanity.fetch(
          `*[_type=="post" && !(_id in path("drafts.**")) && aiGenerated==true && !defined(redirectTo) && title match $patterns] | order(date desc)[0...15] { title, fullPath }`,
          { patterns }
        ).catch(() => [])
      : Promise.resolve([]),
    sanity.fetch(
      `*[_type=="post" && !(_id in path("drafts.**")) && aiGenerated==true && !defined(redirectTo) && references(*[_type=="category" && slug.current in $slugs]._id)] | order(date desc) [0...15] { title, fullPath }`,
      { slugs: catSlugs }
    ).catch(() => []),
  ])

  const merged = [...byKeyword, ...byCategory]
  const seen = new Set()
  const deduped = merged.filter(p => {
    if (seen.has(p.fullPath)) return false
    seen.add(p.fullPath)
    return true
  })
  return deduped.slice(0, 20)
}

async function resolveCategoryRefs(key) {
  // NOTE: only resolve the single chosen category — CATEGORY_MAP is for finding
  // related posts to link to, NOT for assigning every sibling category to the post.
  const cats = await sanity.fetch(`*[_type == "category" && slug.current == $slug] { _id, "slug": slug.current }`, { slug: key })
  return cats.map(c => ({ _type: 'reference', _ref: c._id, _key: c._id }))
}

async function resolveTagRefs(tags) {
  const refs = []
  for (const tagName of (tags || [])) {
    const slug = tagName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 60)
    if (!slug) continue
    const docId = `tag-${slug}`
    await sanity.createIfNotExists({ _id: docId, _type: 'tag', name: tagName, slug: { _type: 'slug', current: slug } }).catch(() => {})
    refs.push({ _type: 'reference', _ref: docId, _key: docId })
  }
  return refs
}

async function uploadImageToSanity(imageResult, filename) {
  let buffer
  if (imageResult.b64) {
    buffer = Buffer.from(imageResult.b64, 'base64')
  } else {
    const res = await fetch(imageResult.url)
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
    buffer = Buffer.from(await res.arrayBuffer())
  }
  const asset = await sanity.assets.upload('image', buffer, { filename, contentType: 'image/png' })
  return { _type: 'image', asset: { _type: 'reference', _ref: asset._id } }
}

async function generateAIImage(prompt) {
  const fullPrompt = `${prompt}. Editorial photography style, 16:9 composition, cinematic lighting, high quality, no text, no watermarks.`
  for (const model of ['gpt-image-2', 'gpt-image-1']) {
    try {
      const response = await openai.images.generate({ model, prompt: fullPrompt, size: '1536x1024', quality: 'medium', n: 1 })
      const d = response.data[0]
      return d.b64_json ? { b64: d.b64_json } : { url: d.url }
    } catch (err) {
      if (model === 'gpt-image-2' && (err.status === 400 || err.status === 404 || err.message?.includes('does not exist'))) continue
      throw err
    }
  }
}

// ─── Grok helpers (Responses API + web_search/x_search) ──────────────────────
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

async function callGrok(messages) {
  const response = await grokClient.responses.create({
    model: grokModel,
    input: messages,
    tools: [{ type: 'web_search' }, { type: 'x_search' }],
  })
  const content = extractGrokText(response)
  const start = content.indexOf('{')
  if (start === -1) throw new Error(`Grok did not return JSON. Response: ${content.slice(0, 300)}`)
  let depth = 0, end = -1
  for (let i = start; i < content.length; i++) {
    if (content[i] === '{') depth++
    else if (content[i] === '}') { depth--; if (depth === 0) { end = i; break } }
  }
  if (end === -1) throw new Error(`Grok JSON block not closed. Response: ${content.slice(0, 300)}`)
  return content.slice(start, end + 1)
}

const TRUSTED_IMAGE_PATTERNS = [
  /https:\/\/images\.unsplash\.com\/photo-[^\s"')>]+/,
  /https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/[^\s"')>]+\.(jpg|jpeg|png|webp)/i,
  /https:\/\/images\.pexels\.com\/photos\/[^\s"')>]+/,
  /https:\/\/live\.staticflickr\.com\/[^\s"')>]+\.(jpg|jpeg|png)/i,
  /https:\/\/cdn\.pixabay\.com\/photo\/[^\s"')>]+\.(jpg|jpeg|png)/i,
]

async function verifyImageUrl(url) {
  try {
    const res = await fetch(url, { headers: { Range: 'bytes=0-1023' } })
    if (res.status === 416) return true
    if (!res.ok && res.status !== 206) return false
    const ct = res.headers.get('content-type') || ''
    return ct.startsWith('image/')
  } catch {
    return false
  }
}

async function findImageWithGrokSearch(title, imagePrompt) {
  console.log(`  🔍 Grok searching for a real high-res photo...`)
  try {
    const response = await grokClient.responses.create({
      model: grokModel,
      input: [
        {
          role: 'system',
          content: `You are an image URL finder. Search the web and return ONLY a raw JSON object — no explanation, no markdown, no prose.
Preferred sources: Unsplash (images.unsplash.com), Wikimedia Commons (upload.wikimedia.org), Pexels (images.pexels.com).
The imageUrl must be a direct CDN link to the image file itself, not a web page.`,
        },
        {
          role: 'user',
          content: `Find the best freely usable, high-resolution photograph for: "${title}"\nVisual context: ${imagePrompt}\n\nOutput ONLY this JSON — nothing before or after:\n{"imageUrl":"DIRECT_IMAGE_CDN_URL","credit":"Photo by X on Site"}`,
        },
      ],
      tools: [{ type: 'web_search' }],
    })

    const raw = extractGrokText(response)
    let imageUrl = '', credit = ''
    const jsonMatch = raw.match(/\{[^{}]*"imageUrl"\s*:\s*"(https?:[^"]+)"[^{}]*\}/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0])
        imageUrl = parsed.imageUrl || ''
        credit = parsed.credit || ''
      } catch {
        imageUrl = jsonMatch[1]
      }
    }
    if (!imageUrl) {
      for (const pattern of TRUSTED_IMAGE_PATTERNS) {
        const m = raw.match(pattern)
        if (m) { imageUrl = m[0].replace(/[",)>]+$/, ''); break }
      }
    }
    if (!imageUrl) throw new Error(`No image URL found in response`)
    const ok = await verifyImageUrl(imageUrl)
    if (!ok) throw new Error(`URL did not return image content: ${imageUrl.slice(0, 80)}`)
    console.log(`  ✅ Real photo found: ${credit || imageUrl.slice(0, 80)}`)
    return { url: imageUrl, credit }
  } catch (err) {
    console.warn(`  ⚠️  Grok image search failed: ${err.message} — falling back to AI generation`)
    return null
  }
}

async function findRelatedPosts(slug, categoryRefs) {
  const catIds = categoryRefs.map(r => r._ref)
  if (!catIds.length) return []
  return sanity.fetch(
    `*[_type=="post" && aiGenerated == true && !defined(redirectTo) && slug.current != $slug && count((categories[]._ref)[@ in $catIds]) > 0] | order(date desc)[0...4] { title, fullPath }`,
    { slug, catIds }
  )
}

function buildRelatedHTML(posts) {
  if (!posts.length) return ''
  const items = posts.map(p => `<li><a href="https://allyouneedislists.com${p.fullPath}">${p.title}</a></li>`).join('\n')
  return `\n<div class="related-lists"><h3>📋 Related Lists You'll Love</h3><ul>${items}</ul></div>`
}

// Detect "list of all / in order / chronological" style topics
function isComprehensiveList(topic) {
  return /^list of all|all \d+ .{2,30} (movies|films|albums|games|songs|seasons|episodes)|in (chronological|release) order|complete list of/i.test(topic)
}

// ─── Main content generation ───────────────────────────────────────────────────
async function generateContent(topicTitle, category, linkCandidates = []) {
  console.log(`  📝 ${useGrok ? `Grok ${grokModel} + web search` : 'GPT'} generating full content...`)

  const comprehensive = isComprehensiveList(topicTitle)
  const internalLinkCandidates = linkCandidates.length > 0
    ? linkCandidates.map(p => `  - "${p.title}" → ${p.fullPath}`).join('\n')
    : null
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const grokSearchInstruction = useGrok ? `
Today's date: ${today}
You have web_search and x_search tools. BEFORE writing, use them to find the most current, accurate, verifiable data for this topic — official statistics, current rankings, current figures from authoritative sources (e.g. airport authorities, ACI, Wikipedia, government aviation bodies). Every number and ranking you state must be real and current, not estimated or invented. Also collect 3–5 REAL, currently-accessible source URLs to cite as external links — never invent a URL.
` : ''

  const contentStructure = comprehensive
    ? `Structure the "content" field HTML EXACTLY like this (COMPREHENSIVE REFERENCE format):

1. INTRO — 2-3 sentences explaining what this list covers and why it matters.

2. LIST ENTRIES — list EVERY individual item as its OWN numbered entry (do NOT group multiple items together into an era, category, or period — each entry = one item). For each:
<h2>N. [Item Title] ([Year if applicable])</h2>
<p class="best-for"><strong>Key detail:</strong> [director/creator/party/role/artist etc.] &nbsp;|&nbsp; <strong>When:</strong> [year or period]</p>
<p>[2-3 sentences: what it is, why it matters, what makes it notable]</p>

For 2-3 entries spread across the article, replace the plain paragraph with a "Did You Know?" fact card containing a surprising, specific, verifiable trivia detail (real number/date/ranking — never invented):
<div class="fact-card"><div><span class="fact-label">Did you know?</span><p>[Punchy specific fact — e.g. "Atlanta's airport handles more than 2,700 flights every day, making it one of the busiest aviation hubs in history."]</p></div></div>

IMAGE PLACEHOLDERS: After entry 4 and after entry 8, insert exactly this comment on its own line:
<!-- IMAGE: [25-word photorealistic prompt for a scene related to this section] -->

3. CONCLUSION — 2-3 sentences summing up the full series/collection.

4. FAQ:
<div class="faq-section"><h2>Frequently Asked Questions</h2>
<div class="faq-item"><h3>[Question?]</h3><p>[Answer in 2-3 sentences]</p></div>
[6-8 faq-items]
</div>`
    : `Structure the "content" field HTML EXACTLY like this:

1. QUICK PICKS BOX (very first element):
<div class="quick-picks"><strong>⚡ Quick Picks</strong><ul>
<li>🥇 <strong>Best Overall:</strong> [Item] — [reason]</li>
<li>💰 <strong>Best Value:</strong> [Item] — [reason]</li>
[one <li> per remaining item]
</ul></div>

2. INTRO — 2-3 engaging sentences.

3. LIST ITEMS — use however many items the topic genuinely needs (typically 10–12 for "best of" lists, but follow the natural scope of the subject — a topic with 7 clear winners needs 7, not forced padding). For each item:
<h2>N. [Item Name]</h2>
<p class="best-for"><strong>Best for:</strong> [ideal reader/use case]</p>
<p>[what it is, why it stands out, specific differentiator]</p>
<p>[features, real data, named examples]</p>
<p>[a practical tip, caveat, or comparison, written as natural flowing prose]</p>
CRITICAL: Never prefix a paragraph with a literal meta-label like "Tip:", "Context:", "Comparison:", "Caveat:", "Named example:", "Link:", or "External link example:". Write complete, natural sentences — the bracket instructions above describe the CONTENT of the sentence, not literal text to output.

For 2-3 items spread across the article, add a "Did You Know?" fact card with a surprising, specific, verifiable trivia detail (real number/date/ranking — never invented):
<div class="fact-card"><div><span class="fact-label">Did you know?</span><p>[Punchy specific fact — e.g. "Atlanta's airport handles more than 2,700 flights every day, making it one of the busiest aviation hubs in history."]</p></div></div>

IMAGE PLACEHOLDERS: After item 4 and after item 8, insert exactly this comment on its own line:
<!-- IMAGE: [25-word photorealistic prompt for a scene related to items in this section] -->

4. CONCLUSION — 2-3 sentences.

5. FAQ:
<div class="faq-section"><h2>Frequently Asked Questions</h2>
<div class="faq-item"><h3>[Question?]</h3><p>[Answer in 2-3 sentences]</p></div>
[6-8 faq-items]
</div>`

  const messages = [
    {
      role: 'system',
      content: `${grokSearchInstruction}You are a senior editor at "All You Need Is Lists". Write ${comprehensive ? '4,000–6,000 word comprehensive reference articles' : '3,000–3,500 word listicles'} with specific real-world details, prices, stats, and named examples. Direct, confident second-person voice. Demonstrates E-E-A-T.

LINKING RULES:
- Internal links: <a href="/path">text</a> — no target or rel
- External links: <a href="URL" target="_blank" rel="noopener noreferrer">text</a>
- External links (4–5 per article): Wikipedia, official brand/product pages, .gov/.edu, or major publications (BBC, Forbes, Reuters). Spread across different items, never two in one paragraph. Vary destinations, no more than 2 Wikipedia links. Descriptive anchor text only.
- Internal links — THIS IS A CONTENT CLUSTER SITE. Google rewards heavy topical interlinking between related articles. ${internalLinkCandidates
    ? `Embed 4–8 of these site links INLINE, spread naturally throughout different sections (not bunched together, not just at the end):\n${internalLinkCandidates}\n   • Only link where genuinely relevant to that sentence — never force an irrelevant link\n   • Format: <a href="/path">descriptive anchor text</a> (no domain, no target attribute)`
    : 'none available this time — skip'}`,
    },
    {
      role: 'user',
      content: `Write a complete ${comprehensive ? 'reference article' : 'listicle'} about: "${topicTitle}"
${category ? `Category: ${category}` : ''}

${contentStructure}

CRITICAL TITLE RULE: Never include a specific number in the title (e.g. "All 44" or "25 Films") unless your content actually contains exactly that many individual entries. If unsure of the exact count, use a non-numeric title.

Return ONLY valid JSON:
{
  "title": "Accurate title under 65 chars — must not promise a count the content doesn't deliver",
  "slug": "3-5 word slug, no stop words, no year",
  "excerpt": "2-sentence summary for SEO, under 160 chars",
  "content": "<full HTML>",
  "imagePrompt": "25-word visual description for hero image",
  "suggestedCategory": "${category || 'lifestyle'}",
  "tags": ["tag1","tag2","tag3","tag4","tag5"],
  "seoTitle": "SEO title under 60 chars",
  "seoDescription": "Meta description 140-160 chars"
}`,
    },
  ]

  const raw = useGrok
    ? await callGrok(messages)
    : await (async () => {
        const response = await openai.chat.completions.create({
          model: 'gpt-5.5',
          messages,
          response_format: { type: 'json_object' },
        })
        return response.choices[0].message.content
      })()

  const parsed = JSON.parse(raw)
  parsed.slug = cleanSlug(parsed.slug || parsed.title)
  return parsed
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🔄 refresh-post.mjs`)
  console.log(`   Topic:    "${topic}"`)
  console.log(`   Category: ${categoryArg}`)
  console.log(`   From:     ${fromPaths.join(', ')}`)
  console.log(`   Delete old: ${shouldDelete}\n`)

  // 1. Verify old posts exist
  const oldPosts = []
  for (const path of fromPaths) {
    const found = await sanity.fetch(`*[_type=="post" && fullPath==$p]{ _id, title, fullPath }`, { p: path })
    if (found.length === 0) {
      console.warn(`  ⚠️  No post found at ${path}`)
    } else {
      oldPosts.push(...found)
      console.log(`  ✅ Found ${found.length} post(s) at ${path}`)
    }
  }

  if (oldPosts.length === 0) {
    console.error('❌ No old posts found to redirect from. Check your --from= paths.')
    process.exit(1)
  }

  // 2. Find topically-related posts for heavy content-cluster interlinking (cross-category)
  const linkCandidates = await fetchTopicalLinkCandidates(topic, categoryArg)
  console.log(`  🔗 ${linkCandidates.length} candidate post(s) found for internal linking`)

  // 3. Generate new content
  console.log(`\n📝 Generating new content...`)
  const content = await generateContent(topic, categoryArg, linkCandidates)
  console.log(`  ✅ Title:    "${content.title}"`)
  console.log(`  ✅ Slug:     ${content.slug}`)

  // 3. Generate hero image
  console.log(`\n🎨 Generating hero image...`)
  let featuredImage = null
  try {
    const imageResult = await generateAIImage(content.imagePrompt)
    featuredImage = await uploadImageToSanity(imageResult, `${content.slug}-hero.png`)
    featuredImage.alt = content.title
    console.log(`  ✅ Image uploaded`)
  } catch (err) {
    console.warn(`  ⚠️  Image failed: ${err.message} — continuing without`)
  }

  // 4. Resolve categories + tags
  const [categoryRefs, tagRefs] = await Promise.all([
    resolveCategoryRefs(categoryArg),
    resolveTagRefs(content.tags),
  ])

  // 5. Internal links
  const relatedPosts = await findRelatedPosts(content.slug, categoryRefs)
  if (relatedPosts.length > 0) {
    content.content += buildRelatedHTML(relatedPosts)
    console.log(`  🔗 ${relatedPosts.length} internal link(s) added`)
  }

  // 5b. In-content section images
  const placeholderRe = /<!--\s*IMAGE:\s*([^-][^>]*?)\s*-->/gi
  const imgMatches = []; let im
  while ((im = placeholderRe.exec(content.content)) !== null) imgMatches.push({ full: im[0], prompt: im[1].trim() })
  for (const { full, prompt } of imgMatches.slice(0, 2)) {
    try {
      const r = await generateAIImage(prompt)
      let buf = r.b64 ? Buffer.from(r.b64, 'base64') : Buffer.from(await (await fetch(r.url)).arrayBuffer())
      const asset = await sanity.assets.upload('image', buf, { filename: `${content.slug}-sec.png`, contentType: 'image/png' })
      content.content = content.content.replace(full, `<figure class="content-image"><img src="${asset.url}" alt="${prompt.slice(0,80)}" loading="lazy"></figure>`)
      console.log(`  ✅ Section image uploaded`)
    } catch (e) {
      content.content = content.content.replace(full, '')
    }
  }

  // 6. Publish new post to Sanity
  const now = new Date().toISOString()
  const newFullPath = `/${categoryArg}/${content.slug}`
  const newDocId = `ai-refresh-${Date.now()}`

  // Collect original titles/paths for the history banner
  const originalTitle = oldPosts[0]?.title || ''
  const originalPath  = oldPosts[0]?.fullPath || ''

  const newPost = await sanity.createOrReplace({
    _id: newDocId,
    _type: 'post',
    title: content.title,
    slug: { _type: 'slug', current: content.slug },
    fullPath: newFullPath,
    date: now,
    updatedAt: now,
    excerpt: content.excerpt,
    seoTitle: content.seoTitle,
    seoDescription: content.seoDescription,
    content: content.content,
    aiGenerated: true,
    ...(originalTitle && { originalTitle }),
    ...(originalPath  && { originalPath }),
    ...(featuredImage && { featuredImage }),
    ...(categoryRefs.length > 0 && { categories: categoryRefs }),
    ...(tagRefs.length > 0 && { tags: tagRefs }),
  })
  console.log(`\n  ✅ New post published: ${newPost._id}`)
  console.log(`     URL: https://allyouneedislists.com${newFullPath}`)

  // 7. Set redirectTo on all old posts
  console.log(`\n🔀 Setting redirectTo on ${oldPosts.length} old post(s)...`)
  for (const old of oldPosts) {
    await sanity.patch(old._id).set({ redirectTo: newFullPath }).commit()
    console.log(`  ✅ ${old.fullPath} → ${newFullPath}`)
  }

  // 8. Optionally delete old posts
  if (shouldDelete) {
    console.log(`\n⚠️  Deleting old posts — redirectTo stubs will be gone.`)
    console.log(`   You MUST add these to next.config.ts redirects() manually or the old URLs will 404:`)
    for (const old of oldPosts) console.log(`     ${old.fullPath}  →  ${newFullPath}`)
    console.log()
    for (const old of oldPosts) {
      await sanity.delete(old._id)
      console.log(`  ✅ Deleted ${old._id} (${old.fullPath})`)
    }
  } else {
    console.log(`\n✅ Old posts kept as redirect stubs in Sanity (recommended).`)
    console.log(`   The 301 redirect is handled automatically by the route — no code change needed.`)
  }

  console.log(`\n✅ Done!`)
  console.log(`   New post: https://allyouneedislists.com${newFullPath}`)
  if (!shouldDelete) console.log(`   Old URLs will 301 → ${newFullPath}`)
}

main().catch(err => { console.error(err); process.exit(1) })
