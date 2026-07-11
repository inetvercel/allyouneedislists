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
const IDEOGRAM_KEY = process.env.IDEOGRAM_API_KEY
const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY
const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET || process.env.SANITY_DATASET || 'production'
const TOKEN = process.env.SANITY_WRITE_TOKEN

if (!OPENAI_KEY) { console.error('❌ OPENAI_API_KEY not set in .env.local'); process.exit(1) }
if (!PROJECT_ID) { console.error('❌ NEXT_PUBLIC_SANITY_PROJECT_ID not set'); process.exit(1) }
if (!TOKEN) { console.error('❌ SANITY_WRITE_TOKEN not set'); process.exit(1) }

if (IDEOGRAM_KEY) console.log('✅ Ideogram API key loaded')
if (UNSPLASH_KEY) console.log('✅ Unsplash API key loaded')

// ─── Clients ──────────────────────────────────────────────────────────────────
const openaiClient = new OpenAI({ apiKey: OPENAI_KEY })

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

// ─── Image router ──────────────────────────────────────────────────────────────
async function getImage(title, imagePrompt, tags) {
  const source = skipImages ? 'none' : imageSource

  if (source === 'none') return null

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
  console.log(`  📝 GPT-5.5 generating content...`)

  const relatedLinks = await fetchLinksForPrompt(category)
  const internalLinksBlock = relatedLinks.length
    ? `EXISTING ARTICLES ON OUR SITE (link to 2-3 of these naturally within the body if genuinely relevant — use exact URLs, internal links only, no target/_blank):
${relatedLinks.map(p => `- ${p.title} → https://allyouneedislists.com${p.fullPath}`).join('\n')}`
    : ''

  const system = `You are a senior editor at "All You Need Is Lists", a top-ranked listicle publication. Every article you write:
- Is 3,000–3,500 words of genuinely useful, expert-level content
- Contains specific real-world details, prices, stats, and named examples — never vague generalisations
- Uses a direct, confident second-person voice ("you", "your")
- Is structured for Google featured snippets and rich results
- Demonstrates E-E-A-T: cite real data, name real products/services/places with accurate details
- Follows a strict HTML structure (described below) — no deviation

LINKING RULES (follow exactly):
- Internal links: use plain <a href="/path">anchor text</a> — no target or rel attributes
- External links: always use <a href="URL" target="_blank" rel="noopener noreferrer">anchor text</a>
- External links must go to Wikipedia, official brand sites, .gov/.edu, or major publications only
- Include 2-3 external authority links naturally within item descriptions (not all in one place)
- Include 2-3 internal links to our related articles if provided — only where genuinely relevant`

  const contentStructure = `Structure the "content" field HTML EXACTLY like this — no exceptions:

1. QUICK PICKS BOX (very first element):
<div class="quick-picks"><strong>⚡ Quick Picks</strong><ul>
<li>🥇 <strong>Best Overall:</strong> [Item name] — [one-line reason]</li>
<li>💰 <strong>Best Value:</strong> [Item name] — [one-line reason]</li>
[one <li> per remaining item in the list]
</ul></div>

2. INTRO — 2-3 engaging sentences explaining why this topic matters right now.

3. LIST ITEMS — 10 to 12 items. For each item:
<h2>N. [Item Name]</h2>
<p class="best-for"><strong>Best for:</strong> [one sentence describing the ideal reader or use case]</p>
<p>[Paragraph 1 — what it is, why it stands out, specific differentiator]</p>
<p>[Paragraph 2 — features, real specs/prices/data, named examples]</p>
<p>[Paragraph 3 — practical tips, caveats, comparison context, or who should avoid it]</p>

4. CONCLUSION — 2-3 sentence wrap-up.

5. FAQ SECTION (last element):
<div class="faq-section"><h2>Frequently Asked Questions</h2>
<div class="faq-item"><h3>[Question?]</h3><p>[Concise, helpful answer in 2-3 sentences]</p></div>
[6 to 8 faq-item divs covering the most common reader questions]
</div>`

  const user = `Write a complete, publication-ready listicle about: "${topic}"
${category ? `Suggested category: ${category}` : ''}

${internalLinksBlock ? internalLinksBlock + '\n\n' : ''}${contentStructure}

Return ONLY valid JSON — no markdown, no code fences:
{
  "title": "Punchy, benefit-driven title under 65 characters. No year.",
  "slug": "3-5 word slug — no year, no stop words (the/a/an/for/in/of/to/by). Example: best-budget-laptops-students",
  "excerpt": "Compelling 150-160 character summary that creates urgency to click",
  "seoTitle": "SEO title under 60 characters with primary keyword near the start",
  "seoDescription": "145-155 character meta description with natural keyword use and a call to action",
  "content": "[Full HTML following the structure above — 3,000-3,500 words]",
  "imagePrompt": "Detailed photorealistic image prompt: specific subject, environment, lighting, mood, camera angle. No text or logos.",
  "suggestedCategory": "One of: ai, business, technology, entertainment, travel, lifestyle, statistics, directories",
  "tags": ["6 to 8 specific lowercase hyphenated tags"]
}`

  const raw = await callOpenAI([
    { role: 'system', content: system },
    { role: 'user', content: user },
  ], true)

  const parsed = JSON.parse(raw)
  parsed.slug = cleanSlug(parsed.slug || parsed.title)
  return parsed
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
  console.log(`   Mode: ${isDraft ? 'draft' : 'publish'} | Images: ${imgMode}`)

  // 1. Content
  const content = await generateContent(topic, category)
  console.log(`  ✅ Title: "${content.title}"`)
  console.log(`     Slug:  /${content.suggestedCategory}/${content.slug}`)
  console.log(`     Tags:  ${content.tags?.join(', ')}`)

  // 2. Image
  let featuredImage = null
  try {
    const imageResult = await getImage(content.title, content.imagePrompt, content.tags || [])
    if (imageResult) {
      featuredImage = await uploadImageToSanity(imageResult, `${content.slug}-hero.png`)
      if (imageResult.unsplashCredit) console.log(`  ✅ Image ready (credit: ${imageResult.unsplashCredit})`)
      else console.log(`  ✅ Image ready`)
    }
  } catch (err) {
    console.warn(`  ⚠️  Image failed: ${err.message} — continuing without image`)
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
