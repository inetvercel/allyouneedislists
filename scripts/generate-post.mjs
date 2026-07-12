#!/usr/bin/env node
/**
 * AI Post Generator — All You Need Is Lists
 *
 * Generates a full listicle post using GPT-4o for content and DALL-E 3 for hero images.
 * Automatically uploads to Sanity as a published or draft post.
 *
 * Usage:
 *   node scripts/generate-post.mjs "Top 10 Best AI Writing Tools in 2025"
 *   node scripts/generate-post.mjs "Best Budget Laptops for Students" --category=technology
 *   node scripts/generate-post.mjs "Top 10 Travel Hacks" --draft
 *   node scripts/generate-post.mjs --batch scripts/topics.txt
 *   node scripts/generate-post.mjs --batch scripts/topics.txt --draft --skip-images
 *
 * Required env vars (add to .env.local):
 *   OPENAI_API_KEY
 *   NEXT_PUBLIC_SANITY_PROJECT_ID
 *   NEXT_PUBLIC_SANITY_DATASET
 *   SANITY_WRITE_TOKEN
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
const batchFile = args.find(a => a.startsWith('--batch='))?.split('=')[1]
  || (args.includes('--batch') ? args[args.indexOf('--batch') + 1] : null)
const topicArg = args.find(a => !a.startsWith('--'))
const categoryArg = args.find(a => a.startsWith('--category='))?.split('=')[1] || null
const isDraft = args.includes('--draft')
const useGrok = args.includes('--grok')
const grokModel = args.find(a => a.startsWith('--grok-model='))?.split('=')[1] || process.env.GROK_MODEL || 'grok-4'
const skipImages = args.includes('--skip-images')
const useHD = args.includes('--hd')
const imageSource = args.find(a => a.startsWith('--image='))?.split('=')[1] || 'auto'
// imageSource: 'auto' | 'ideogram' | 'unsplash' | 'ai' | 'none'

if (!topicArg && !batchFile) {
  console.error(`
Usage:
  node scripts/generate-post.mjs "Your topic here"
  node scripts/generate-post.mjs "Topic" --category=ai --draft
  node scripts/generate-post.mjs --batch scripts/topics.txt

Options:
  --category=SLUG      Force a category (ai, technology, business, entertainment, travel, lifestyle)
  --draft              Save as Sanity draft instead of publishing immediately
  --skip-images        Skip all image generation
  --image=ideogram     Use Ideogram v2 (text-in-image, $0.08, needs IDEOGRAM_API_KEY)
  --image=unsplash     Use Unsplash real photos (free, needs UNSPLASH_ACCESS_KEY)
  --image=ai           Use OpenAI gpt-image-1 (needs OPENAI_API_KEY)
  --image=auto         Best available source: ideogram > unsplash > ai (default)
  --hd                 Higher quality for AI/Ideogram images
`)
  process.exit(1)
}

// ─── Validate env ─────────────────────────────────────────────────────────────
const OPENAI_KEY = process.env.OPENAI_API_KEY
const GROK_KEY = process.env.GROK_API_KEY || process.env.XAI_API_KEY
const IDEOGRAM_KEY = process.env.IDEOGRAM_API_KEY
const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY
const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET || process.env.SANITY_DATASET || 'production'
const TOKEN = process.env.SANITY_WRITE_TOKEN

if (useGrok && !GROK_KEY) { console.error('❌ GROK_API_KEY not set in .env.local'); process.exit(1) }
if (!useGrok && !OPENAI_KEY) { console.error('❌ OPENAI_API_KEY not set in .env.local'); process.exit(1) }
if (!PROJECT_ID) { console.error('❌ NEXT_PUBLIC_SANITY_PROJECT_ID not set'); process.exit(1) }
if (!TOKEN) { console.error('❌ SANITY_WRITE_TOKEN not set'); process.exit(1) }

if (useGrok) console.log(`✅ Grok API (${grokModel}) with web_search + x_search`)
if (IDEOGRAM_KEY) console.log('✅ Ideogram API key loaded')
if (UNSPLASH_KEY) console.log('✅ Unsplash API key loaded')

// ─── Clients ──────────────────────────────────────────────────────────────────
const openaiClient = OPENAI_KEY ? new OpenAI({ apiKey: OPENAI_KEY }) : null
const grokClient = GROK_KEY ? new OpenAI({ apiKey: GROK_KEY, baseURL: 'https://api.x.ai/v1' }) : null

const sanity = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  token: TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
})

// ─── Slug cleaner ─────────────────────────────────────────────────────────────
const STOP_WORDS = new Set(['the','a','an','and','or','in','on','at','to','for','of','by','with','from','is','are','was','were','how','what','why','when','where','who','will','can','you','your','we','our','its','i','do','be'])

function cleanSlug(raw) {
  return raw
    .toLowerCase()
    .replace(/\b20\d{2}\b/g, '')       // remove years e.g. 2024 2025 2026
    .replace(/[^a-z0-9\s-]/g, '')      // only letters, numbers, hyphens, spaces
    .split(/[\s-]+/)                   // split on hyphens and spaces
    .filter(w => w && !STOP_WORDS.has(w))  // remove stop words and empty strings
    .slice(0, 6)                       // max 6 segments
    .join('-')
}

const CATEGORY_MAP = {
  ai: ['ai', 'ai-tools', 'ai-models', 'chatgpt', 'productivity'],
  business: ['business', 'marketing', 'seo', 'finance', 'startups'],
  technology: ['technology', 'software', 'hardware', 'programming', 'internet'],
  entertainment: ['entertainment', 'movies', 'tv', 'gaming', 'music'],
  travel: ['travel'],
  lifestyle: ['lifestyle'],
  statistics: ['statistics'],
  directories: ['directories'],
}

// ─── OpenAI helpers ───────────────────────────────────────────────────────────
async function callOpenAI(messages, jsonMode = false) {
  const response = await openaiClient.chat.completions.create({
    model: 'gpt-5.5',
    messages,
    ...(jsonMode && { response_format: { type: 'json_object' } }),
  })
  return response.choices[0].message.content
}

// ─── Grok helper (web_search + x_search) ──────────────────────────────────────
async function callGrok(messages) {
  const response = await grokClient.chat.completions.create({
    model: grokModel,
    messages,
    tools: [
      { type: 'web_search' },
      { type: 'x_search' },
    ],
  })
  const content = response.choices[0].message.content
  // Extract JSON block in case Grok wraps it with text or citations
  const match = content.match(/\{[\s\S]+\}/)
  if (!match) throw new Error(`Grok did not return JSON. Response: ${content.slice(0, 300)}`)
  return match[0]
}

// ─── Ideogram image generation ────────────────────────────────────────────────
async function generateImageIdeogram(title, visualPrompt) {
  if (!IDEOGRAM_KEY) throw new Error('IDEOGRAM_API_KEY not set')

  // Craft a prompt that embeds the title as styled text in the image
  const prompt = `"${title}" — bold clean typography over a ${visualPrompt}. Professional editorial thumbnail, dark background with vibrant accent colours, magazine quality, 16:9 web banner, high contrast readable text`

  const res = await fetch('https://api.ideogram.ai/generate', {
    method: 'POST',
    headers: {
      'Api-Key': IDEOGRAM_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_request: {
        prompt,
        model: 'V_2',
        aspect_ratio: 'ASPECT_16_9',
        style_type: 'DESIGN',
        negative_prompt: 'blurry, low quality, watermark, ugly, distorted text, illegible',
        ...(useHD && { magic_prompt_option: 'ON' }),
      },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Ideogram API error ${res.status}: ${err}`)
  }

  const data = await res.json()
  const url = data.data?.[0]?.url
  if (!url) throw new Error('Ideogram returned no image URL')
  return { url }
}

// ─── Unsplash image search ─────────────────────────────────────────────────────
async function searchUnsplash(keywords) {
  if (!UNSPLASH_KEY) throw new Error('UNSPLASH_ACCESS_KEY not set')

  const query = encodeURIComponent(keywords.slice(0, 3).join(' '))
  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${query}&per_page=5&orientation=landscape&content_filter=high`,
    { headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` } }
  )

  if (!res.ok) throw new Error(`Unsplash API error ${res.status}`)
  const data = await res.json()
  if (!data.results?.length) throw new Error('No Unsplash results found')

  // Pick the highest-quality result (sort by downloads)
  const best = data.results.sort((a, b) => b.downloads - a.downloads)[0]
  return { url: best.urls.regular, unsplashCredit: `${best.user.name} on Unsplash` }
}

// ─── OpenAI image generation ──────────────────────────────────────────────────
async function generateImageAI(visualPrompt) {
  const fullPrompt = `${visualPrompt} Editorial photography style, 16:9 composition, cinematic lighting, high quality, no text, no watermarks, no logos.`

  // Try gpt-image-2 first (state-of-the-art), fall back to gpt-image-1
  for (const model of ['gpt-image-2', 'gpt-image-1']) {
    try {
      const response = await openaiClient.images.generate({
        model,
        prompt: fullPrompt,
        size: '1024x1024',
        quality: useHD ? 'high' : 'medium',
        n: 1,
      })
      if (response.data[0].b64_json) return { b64: response.data[0].b64_json }
      return { url: response.data[0].url }
    } catch (err) {
      if (model === 'gpt-image-2' && (err.message?.includes('does not exist') || err.status === 400 || err.status === 404)) {
        console.log(`  ↩️  gpt-image-2 unavailable, trying gpt-image-1...`)
        continue
      }
      throw err
    }
  }
}

// ─── Grok image finder (real web photo via search) ───────────────────────────
async function findImageWithGrokSearch(title, imagePrompt) {
  console.log(`  🔍 Grok searching for a real high-res photo...`)
  try {
    const response = await grokClient.chat.completions.create({
      model: grokModel,
      messages: [
        {
          role: 'system',
          content: 'You are an image search assistant. Use web_search to find freely usable high-resolution photos. Return only JSON.',
        },
        {
          role: 'user',
          content: `Search the web for the best freely usable high-resolution photograph for an article titled: "${title}"\nVisual description: ${imagePrompt}\n\nSearch these sites (in order):\n1. Unsplash.com — get the direct CDN URL: https://images.unsplash.com/photo-...\n2. Pexels.com — get the direct photo CDN URL\n3. Wikimedia Commons — for factual/historical topics\n\nRequirements: landscape orientation, 1920x1080 minimum, freely usable (CC0), no watermarks, directly downloadable URL.\n\nReturn ONLY this JSON (nothing else):\n{"imageUrl": "https://...", "credit": "Photo by Name on Site"}`,
        },
      ],
      tools: [{ type: 'web_search' }],
    })

    const content = response.choices[0].message.content || ''
    const match = content.match(/\{"imageUrl"[^}]+\}/)
    if (!match) throw new Error('No imageUrl in Grok response')

    const { imageUrl, credit } = JSON.parse(match[0])
    if (!imageUrl || !imageUrl.startsWith('http')) throw new Error('Invalid URL')

    // Verify the URL is actually a downloadable image
    const probe = await fetch(imageUrl, { method: 'HEAD' }).catch(() => null)
    if (!probe?.ok) throw new Error(`Not reachable (${probe?.status ?? 'network error'})`)
    const ct = probe.headers.get('content-type') || ''
    if (!ct.startsWith('image/')) throw new Error(`Not an image (${ct})`)

    console.log(`  ✅ Real photo found: ${credit || imageUrl.slice(0, 80)}`)
    return { url: imageUrl, credit }
  } catch (err) {
    console.warn(`  ⚠️  Grok image search failed: ${err.message} — falling back to next source`)
    return null
  }
}

// ─── Image router ──────────────────────────────────────────────────────────────
async function getImage(title, imagePrompt, tags) {
  const source = skipImages ? 'none' : imageSource

  if (source === 'none') return null

  // When using Grok mode in auto, first try to find a real web photo
  if (useGrok && source === 'auto') {
    const found = await findImageWithGrokSearch(title, imagePrompt)
    if (found) return found
    // fall through to next available source
  }

  if (source === 'ideogram') {
    console.log(`  🎨 Ideogram v2 generating branded thumbnail...`)
    return generateImageIdeogram(title, imagePrompt)
  }

  if (source === 'unsplash') {
    console.log(`  📷 Unsplash searching for real photo...`)
    return searchUnsplash(tags)
  }

  if (source === 'ai') {
    console.log(`  🤖 OpenAI generating image...`)
    return generateImageAI(imagePrompt)
  }

  // auto — try best available in order: ideogram > unsplash > ai
  if (IDEOGRAM_KEY) {
    console.log(`  🎨 [auto] Ideogram v2 generating branded thumbnail...`)
    return generateImageIdeogram(title, imagePrompt)
  }
  if (UNSPLASH_KEY) {
    console.log(`  📷 [auto] Unsplash searching for real photo...`)
    return searchUnsplash(tags)
  }
  console.log(`  🤖 [auto] OpenAI generating image (no Ideogram/Unsplash key found)...`)
  return generateImageAI(imagePrompt)
}

// ─── Fetch candidate posts for contextual internal linking ──────────────────
async function fetchLinksForPrompt(category) {
  const slugs = CATEGORY_MAP[category] || [category]
  // Only link to AI-generated posts — their URLs are stable.
  // Old WP posts will get new URLs when refreshed, making those links redirect hops.
  const posts = await sanity.fetch(
    `*[_type == "post" && !(_id in path("drafts.**")) && aiGenerated == true && !defined(redirectTo) && references(*[_type=="category" && slug.current in $slugs]._id)] | order(date desc) [0...15] { title, fullPath }`,
    { slugs }
  ).catch(() => [])
  return posts
}

// ─── Content generation ────────────────────────────────────────────────────────
async function generateContent(topic, category) {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  console.log(`  📝 ${useGrok ? `Grok ${grokModel} + web search` : 'GPT-5.5'} generating content...`)

  const relatedLinks = await fetchLinksForPrompt(category)
  const internalLinksBlock = relatedLinks.length
    ? `EXISTING ARTICLES ON OUR SITE (link to 2-3 of these naturally within the body if genuinely relevant — use exact URLs, internal links only, no target/_blank):
${relatedLinks.map(p => `- ${p.title} → https://allyouneedislists.com${p.fullPath}`).join('\n')}`
    : ''

  const isComprehensive = /^list of all|all \d+ .{2,30} (movies|films|albums|games|songs|seasons|episodes)|in (chronological|release) order|complete list of/i.test(topic)

  const grokSearchInstruction = useGrok ? `
Today's date: ${today}
You have web_search and x_search tools available. USE THEM NOW to find the most current information about this topic before writing — search for recent news, updated prices, new releases, current rankings, and fresh stats from the past few weeks. The content must reflect what is true as of today.
` : ''

  const system = `${grokSearchInstruction}You are a senior editor at "All You Need Is Lists", a top-ranked listicle publication. Every article you write:
- Is ${isComprehensive ? '4,000–6,000 words of comprehensive, reference-quality content' : '3,000–3,500 words of genuinely useful, expert-level content'}
- Contains specific real-world details, prices, stats, and named examples — never vague generalisations
- Uses a direct, confident second-person voice ("you", "your")
- Is structured for Google featured snippets and rich results
- Demonstrates E-E-A-T: cite real data, name real products/services/places with accurate details
- Follows a strict HTML structure (described below) — no deviation

LINKING RULES (follow exactly):
- Internal links: use plain <a href="/path">anchor text</a> — no target or rel attributes
- External links: always use <a href="URL" target="_blank" rel="noopener noreferrer">anchor text</a>

EXTERNAL LINKS (4–5 per article at this length):
- Destinations: Wikipedia for concepts/background, official brand or product pages, .gov/.edu for stats, or major publications (BBC, Forbes, Reuters) for studies/data
- Spread them across different list items — never two in the same paragraph
- 1 may appear in the intro or conclusion if citing a specific statistic
- Vary the destinations — do not link to Wikipedia more than twice
- Anchor text should be descriptive, not "click here" or the raw URL

INTERNAL LINKS (2–3 if related articles are provided):
- Only link where genuinely relevant to the item being described
- Do not force links — omit if nothing fits naturally`

  const contentStructure = isComprehensive
    ? `Structure the "content" field HTML EXACTLY like this (COMPREHENSIVE REFERENCE format):

1. INTRO — 2-3 sentences explaining what this list covers and why it matters.

2. LIST ENTRIES — list EVERY individual item as its OWN numbered entry (do NOT group multiple items into an era, category, or period — each entry = exactly one item). For each:
<h2>N. [Item Title] ([Year if applicable])</h2>
<p class="best-for"><strong>Key detail:</strong> [director/creator/party/role/artist etc.] &nbsp;|&nbsp; <strong>When:</strong> [year or period]</p>
<p>[2-3 sentences: what it is, why it matters, what makes it notable]</p>

IMAGE PLACEHOLDERS: After entry 4 and after entry 8, insert exactly this comment on its own line:
<!-- IMAGE: [25-word photorealistic prompt for a scene related to this section] -->

3. CONCLUSION — 2-3 sentences summing up the full series/collection.

4. FAQ SECTION (last element):
<div class="faq-section"><h2>Frequently Asked Questions</h2>
<div class="faq-item"><h3>[Question?]</h3><p>[Concise, helpful answer in 2-3 sentences]</p></div>
[6 to 8 faq-item divs covering the most common reader questions]
</div>`
    : `Structure the "content" field HTML EXACTLY like this — no exceptions:

1. QUICK PICKS BOX (very first element):
<div class="quick-picks"><strong>⚡ Quick Picks</strong><ul>
<li>🥇 <strong>Best Overall:</strong> [Item name] — [one-line reason]</li>
<li>💰 <strong>Best Value:</strong> [Item name] — [one-line reason]</li>
[one <li> per remaining item in the list]
</ul></div>

2. INTRO — 2-3 engaging sentences explaining why this topic matters right now.

3. LIST ITEMS — use however many items the topic genuinely needs (typically 10–12 for "best of" lists, but follow the natural scope of the subject — a topic with 7 clear winners needs 7, not padding to 10). For each item:
<h2>N. [Item Name]</h2>
<p class="best-for"><strong>Best for:</strong> [one sentence describing the ideal reader or use case]</p>
<p>[Paragraph 1 — what it is, why it stands out, specific differentiator]</p>
<p>[Paragraph 2 — features, real specs/prices/data, named examples]</p>
<p>[Paragraph 3 — practical tips, caveats, comparison context, or who should avoid it]</p>

IMAGE PLACEHOLDERS: After item 4 and after item 8, insert exactly this comment on its own line:
<!-- IMAGE: [25-word photorealistic prompt for a scene related to items in this section] -->

4. CONCLUSION — 2-3 sentence wrap-up.

5. FAQ SECTION (last element):
<div class="faq-section"><h2>Frequently Asked Questions</h2>
<div class="faq-item"><h3>[Question?]</h3><p>[Concise, helpful answer in 2-3 sentences]</p></div>
[6 to 8 faq-item divs covering the most common reader questions]
</div>`

  const user = `Write a complete, publication-ready ${isComprehensive ? 'reference article' : 'listicle'} about: "${topic}"
${category ? `Suggested category: ${category}` : ''}

${internalLinksBlock ? internalLinksBlock + '\n\n' : ''}${contentStructure}

CRITICAL TITLE RULE: Never include a specific number in the title (e.g. "All 44" or "25 Films") unless your content actually contains exactly that many individual entries. If unsure of the exact count, omit the number from the title.

Return ONLY valid JSON — no markdown, no code fences:
{
  "title": "Accurate title under 65 chars — must not promise a count the content doesn't deliver",
  "slug": "3-5 word slug — no year, no stop words (the/a/an/for/in/of/to/by). Example: best-budget-laptops-students",
  "excerpt": "Compelling 150-160 character summary that creates urgency to click",
  "seoTitle": "SEO title under 60 characters with primary keyword near the start",
  "seoDescription": "145-155 character meta description with natural keyword use and a call to action",
  "content": "[Full HTML following the structure above — 3,000-3,500 words]",
  "imagePrompt": "Detailed photorealistic image prompt: specific subject, environment, lighting, mood, camera angle. No text or logos.",
  "suggestedCategory": "One of: ai, business, technology, entertainment, travel, lifestyle, statistics, directories",
  "tags": ["6 to 8 specific lowercase hyphenated tags"]
}`

  const messages = [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]

  const raw = useGrok
    ? await callGrok(messages)
    : await callOpenAI(messages, true)

  const parsed = JSON.parse(raw)
  parsed.slug = cleanSlug(parsed.slug || parsed.title)
  return parsed
}

// ─── In-content image injection ───────────────────────────────────────────────
async function extractAndInjectContentImages(htmlContent, slug) {
  const placeholderRe = /<!--\s*IMAGE:\s*([^-][^>]*?)\s*-->/gi
  const matches = []
  let m
  while ((m = placeholderRe.exec(htmlContent)) !== null) {
    matches.push({ full: m[0], prompt: m[1].trim(), index: m.index })
  }
  if (matches.length === 0) return htmlContent

  // Cap at 2 in-content images
  const toGenerate = matches.slice(0, 2)
  console.log(`  🖼  Generating ${toGenerate.length} in-content image(s)...`)

  let result = htmlContent
  for (let i = 0; i < toGenerate.length; i++) {
    const { full, prompt } = toGenerate[i]
    try {
      const imgResult = await generateImageAI(prompt)
      let buf
      if (imgResult.b64) {
        buf = Buffer.from(imgResult.b64, 'base64')
      } else {
        const res = await fetch(imgResult.url)
        buf = Buffer.from(await res.arrayBuffer())
      }
      const asset = await sanity.assets.upload('image', buf, {
        filename: `${slug}-section-${i + 1}.png`,
        contentType: 'image/png',
      })
      const src = asset.url
      const figureHtml = `<figure class="content-image"><img src="${src}" alt="${prompt.slice(0, 80)}" loading="lazy"></figure>`
      result = result.replace(full, figureHtml)
      console.log(`     ✅ Section image ${i + 1} uploaded`)
    } catch (err) {
      console.warn(`     ⚠️  Section image ${i + 1} failed: ${err.message}`)
      result = result.replace(full, '')
    }
  }
  return result
}

// ─── Internal linking ──────────────────────────────────────────────────────────
async function findRelatedPosts(slug, categoryRefs) {
  if (!categoryRefs.length) return []
  const catIds = categoryRefs.map(r => r._ref)
  return sanity.fetch(
    `*[_type == "post" && !(_id in path("drafts.**")) && slug.current != $slug && count(categories[@._ref in $catIds]) > 0] | order(date desc) [0...5] { title, fullPath }`,
    { slug, catIds }
  ).catch(() => [])
}

function buildRelatedHTML(posts) {
  if (!posts.length) return ''
  const items = posts.map(p => `<li><a href="${p.fullPath}">${p.title}</a></li>`).join('\n    ')
  return `\n<div class="related-lists"><h2>Related Lists You'll Love</h2><ul>\n    ${items}\n  </ul></div>\n`
}

// ─── Sanity helpers ────────────────────────────────────────────────────────────
async function uploadImageToSanity(imageResult, filename) {
  console.log(`  ☁️  Uploading image to Sanity CDN...`)
  let buffer
  if (imageResult.b64) {
    buffer = Buffer.from(imageResult.b64, 'base64')
  } else {
    const res = await fetch(imageResult.url)
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`)
    buffer = Buffer.from(await res.arrayBuffer())
  }

  const asset = await sanity.assets.upload('image', buffer, {
    filename,
    contentType: 'image/png',
  })
  return { _type: 'image', asset: { _type: 'reference', _ref: asset._id } }
}

async function resolveCategoryRefs(suggestedCategory, override) {
  const key = override || suggestedCategory
  const slugs = CATEGORY_MAP[key] || [key]
  const cats = await sanity.fetch(
    `*[_type == "category" && slug.current in $slugs] { _id, "slug": slug.current }`,
    { slugs }
  )
  if (cats.length === 0) console.warn(`  ⚠️  No categories found for "${key}" — post will have no category`)
  return cats.map(c => ({ _type: 'reference', _ref: c._id, _key: c._id }))
}

async function resolveTagRefs(tags) {
  const refs = []
  for (const tagName of (tags || [])) {
    const slug = tagName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 60)
    if (!slug) continue
    const docId = `tag-${slug}`
    const existing = await sanity.fetch(`*[_type == "tag" && _id == $id][0]{_id}`, { id: docId })
    if (!existing) {
      await sanity.createIfNotExists({
        _id: docId,
        _type: 'tag',
        name: tagName,
        slug: { _type: 'slug', current: slug },
      }).catch(() => {})
    }
    refs.push({ _type: 'reference', _ref: docId, _key: docId })
  }
  return refs
}

async function createSanityPost({ content, featuredImage, categoryRefs, tagRefs, draft }) {
  const now = new Date().toISOString()
  const catKey = content.suggestedCategory || 'latest'
  const fullPath = `/${catKey}/${content.slug}`
  const baseId = `ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const docId = draft ? `drafts.${baseId}` : baseId

  const doc = {
    _id: docId,
    _type: 'post',
    title: content.title,
    slug: { _type: 'slug', current: content.slug },
    fullPath,
    date: now,
    updatedAt: now,
    excerpt: content.excerpt,
    seoTitle: content.seoTitle,
    seoDescription: content.seoDescription,
    content: content.content,
    aiGenerated: true,
    ...(featuredImage && { featuredImage }),
    ...(categoryRefs.length > 0 && { categories: categoryRefs }),
    ...(tagRefs.length > 0 && { tags: tagRefs }),
  }

  return sanity.createOrReplace(doc)
}

// ─── Main pipeline ─────────────────────────────────────────────────────────────
async function processOneTopic(topic, category) {
  console.log(`\n🚀 Generating: "${topic}"`)
  console.log(`   Category override: ${category || 'auto-detect'}`)
  const imgMode = skipImages ? 'skip' : `${imageSource}${useHD ? ' HD' : ''}`
  console.log(`   Model: ${useGrok ? `Grok ${grokModel} + search` : 'GPT-5.5'} | Mode: ${isDraft ? 'draft' : 'publish'} | Images: ${imgMode}`)

  // 1. Content
  const content = await generateContent(topic, category)
  console.log(`  ✅ Title: "${content.title}"`)
  console.log(`     Slug:  /${content.suggestedCategory}/${content.slug}`)
  console.log(`     Tags:  ${content.tags?.join(', ')}`)

  // 2a. In-content section images (replace placeholders GPT put in the HTML)
  if (!skipImages) {
    content.content = await extractAndInjectContentImages(content.content, content.slug)
  }

  // 2b. Hero image
  let featuredImage = null
  try {
    const imageResult = await getImage(content.title, content.imagePrompt, content.tags || [])
    if (imageResult) {
      featuredImage = await uploadImageToSanity(imageResult, `${content.slug}-hero.png`)
      const credit = imageResult.credit || imageResult.unsplashCredit
      if (credit) console.log(`  ✅ Hero image ready (credit: ${credit})`)
      else console.log(`  ✅ Hero image ready`)
    }
  } catch (err) {
    console.warn(`  ⚠️  Hero image failed: ${err.message} — continuing without image`)
  }

  // 3. Categories + tags
  const [categoryRefs, tagRefs] = await Promise.all([
    resolveCategoryRefs(content.suggestedCategory, category),
    resolveTagRefs(content.tags),
  ])
  console.log(`  ✅ ${categoryRefs.length} category ref(s), ${tagRefs.length} tag ref(s)`)

  // 4. Internal links — inject related posts section
  const relatedPosts = await findRelatedPosts(content.slug, categoryRefs)
  if (relatedPosts.length > 0) {
    content.content += buildRelatedHTML(relatedPosts)
    console.log(`  🔗 ${relatedPosts.length} internal link(s) injected`)
  }

  // 5. Publish to Sanity
  const post = await createSanityPost({ content, featuredImage, categoryRefs, tagRefs, draft: isDraft })
  console.log(`  ✅ Post ${isDraft ? 'draft' : 'published'}: ${post._id}`)
  console.log(`     Studio: https://allyouneedislists.com/studio`)
  console.log(`     URL:    https://allyouneedislists.com/${content.suggestedCategory}/${content.slug}`)

  return post
}

async function main() {
  let topics = []

  if (batchFile) {
    if (!existsSync(batchFile)) {
      console.error(`❌ Batch file not found: ${batchFile}`)
      process.exit(1)
    }
    topics = readFileSync(batchFile, 'utf-8')
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'))
    console.log(`📋 Batch mode: ${topics.length} topics from ${batchFile}`)
  } else {
    topics = [topicArg]
  }

  let success = 0
  let failed = 0

  for (const topic of topics) {
    try {
      await processOneTopic(topic, categoryArg)
      success++
      // Small delay between batch items to avoid rate limits
      if (topics.length > 1) await new Promise(r => setTimeout(r, 2000))
    } catch (err) {
      console.error(`  ❌ Failed "${topic}": ${err.message}`)
      failed++
    }
  }

  console.log(`\n✨ Done! ${success} published, ${failed} failed.`)
  if (failed > 0) process.exit(1)
}

main()
