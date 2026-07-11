#!/usr/bin/env node
/**
 * Bulk Import Post — All You Need Is Lists
 *
 * Reads a JSON input file and generates a fully formatted post from user-provided
 * content/notes + links. Publishes to Sanity with hero image.
 *
 * Usage (internal — called by the Studio Bulk Importer):
 *   node scripts/bulk-import-post.mjs --input=/tmp/bulk-xxx.json
 *
 * Input JSON format:
 * {
 *   "title": "Best JavaScript Frameworks",
 *   "category": "technology",
 *   "rawContent": "React is a UI library...\nVue is progressive...",
 *   "links": ["https://react.dev", "https://vuejs.org"]
 * }
 */

import OpenAI from 'openai'
import { createClient } from '@sanity/client'
import { readFileSync, existsSync, unlinkSync } from 'fs'
import { resolve } from 'path'

// ─── Load .env.local ──────────────────────────────────────────────────────────
const envPath = resolve(process.cwd(), '.env.local')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf-8').replace(/^\uFEFF/, '').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) { const k = m[1].trim(), v = m[2].trim().replace(/^["']|["']$/g, ''); if (!process.env[k]) process.env[k] = v }
  }
}

// ─── Args ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const inputFile = args.find(a => a.startsWith('--input='))?.split('=')[1]
if (!inputFile || !existsSync(inputFile)) {
  console.error('❌ --input=<path> required and file must exist'); process.exit(1)
}

const input = JSON.parse(readFileSync(inputFile, 'utf-8'))
const { title, category = '', rawContent = '', links = [] } = input

// Clean up temp file
try { unlinkSync(inputFile) } catch {}

// ─── Env ──────────────────────────────────────────────────────────────────────
const OPENAI_KEY = process.env.OPENAI_API_KEY
const IDEOGRAM_KEY = process.env.IDEOGRAM_API_KEY
const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY
const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
const TOKEN = process.env.SANITY_WRITE_TOKEN

if (!OPENAI_KEY) { console.error('❌ OPENAI_API_KEY missing'); process.exit(1) }
if (!PROJECT_ID || !TOKEN) { console.error('❌ Sanity env vars missing'); process.exit(1) }

// ─── Clients ──────────────────────────────────────────────────────────────────
const openai = new OpenAI({ apiKey: OPENAI_KEY })
const sanity = createClient({ projectId: PROJECT_ID, dataset: DATASET, token: TOKEN, apiVersion: '2024-01-01', useCdn: false })

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STOP_WORDS = new Set(['the','a','an','and','or','in','on','at','to','for','of','by','with','from','is','are','was'])
function cleanSlug(raw) {
  return raw.toLowerCase().replace(/\b20\d{2}\b/g,'').replace(/[^a-z0-9\s-]/g,'')
    .split(/[\s-]+/).filter(w => w && !STOP_WORDS.has(w)).slice(0,6).join('-')
}

const CATEGORY_MAP = {
  ai: ['ai','ai-tools','ai-models','chatgpt','productivity'],
  business: ['business','marketing','seo','finance','startups'],
  technology: ['technology','software','hardware','programming','internet'],
  entertainment: ['entertainment','movies','tv','gaming','music'],
  travel: ['travel'], lifestyle: ['lifestyle'], statistics: ['statistics'], directories: ['directories'],
}

// ─── Content generation from user notes ───────────────────────────────────────
async function generateFromUserContent() {
  console.log(`  📝 GPT formatting your content...`)

  const linksBlock = links.length
    ? `\n\nEXTERNAL LINKS TO INCLUDE (work these in naturally as references across 4–5 items):\n${links.map(l => `- ${l}`).join('\n')}`
    : ''

  const hasContent = rawContent.trim().length > 50

  const userPrompt = hasContent
    ? `Transform the following user-provided research/notes into a polished, publication-ready listicle about: "${title}"
Category: ${category || 'auto-detect'}

USER'S RESEARCH/NOTES (use this as your primary source — expand, enrich, and structure it properly):
---
${rawContent.slice(0, 8000)}
---${linksBlock}

Your job: take this content and make it a world-class article. Expand each point with real details, stats, prices, and examples. Do NOT invent information that contradicts the user's notes.

CRITICAL TITLE RULE: Never include a specific number in the title unless your content actually contains exactly that many entries.

Return ONLY valid JSON — no markdown, no code fences:
{
  "title": "Polished title under 65 chars that accurately reflects the content",
  "slug": "3-5 word slug, no stop words, no year",
  "excerpt": "Compelling 150-160 character summary",
  "seoTitle": "SEO title under 60 chars",
  "seoDescription": "Meta description 145-155 chars with call to action",
  "content": "<full article HTML — 2,500-4,000 words, following structure below>",
  "imagePrompt": "25-word photorealistic scene for hero image",
  "suggestedCategory": "${category || 'auto-detect — one of: ai, business, technology, entertainment, travel, lifestyle, statistics, directories'}",
  "tags": ["6 to 8 specific lowercase hyphenated tags"]
}`
    : `Write a complete, publication-ready listicle about: "${title}"
Category: ${category || 'auto-detect'}${linksBlock}

CRITICAL TITLE RULE: Never include a specific number in the title unless your content actually contains exactly that many entries.

Return ONLY valid JSON — no markdown, no code fences:
{
  "title": "Punchy, benefit-driven title under 65 chars",
  "slug": "3-5 word slug, no stop words, no year",
  "excerpt": "Compelling 150-160 character summary",
  "seoTitle": "SEO title under 60 chars",
  "seoDescription": "Meta description 145-155 chars with call to action",
  "content": "<full article HTML — 2,500-4,000 words>",
  "imagePrompt": "25-word photorealistic scene for hero image",
  "suggestedCategory": "${category || 'auto-detect — one of: ai, business, technology, entertainment, travel, lifestyle, statistics, directories'}",
  "tags": ["6 to 8 specific lowercase hyphenated tags"]
}`

  const HTML_STRUCTURE = `
HTML CONTENT STRUCTURE (follow exactly):
1. QUICK PICKS box (first element):
<div class="quick-picks"><strong>⚡ Quick Picks</strong><ul>
<li>🥇 <strong>Best Overall:</strong> [Item] — [reason]</li>
<li>💰 <strong>Best Value:</strong> [Item] — [reason]</li>
[one li per remaining item]
</ul></div>

2. INTRO — 2-3 sentences.

3. LIST ITEMS (10-12, each as its own numbered entry — do NOT group):
<h2>N. [Item Name]</h2>
<p class="best-for"><strong>Best for:</strong> [ideal reader/use case]</p>
<p>[What it is, why it stands out, specific differentiator]</p>
<p>[Features, real specs/prices/data, named examples]</p>

After item 4 and after item 8, insert:
<!-- IMAGE: [25-word photorealistic prompt] -->

4. CONCLUSION — 2-3 sentences.

5. FAQ:
<div class="faq-section"><h2>Frequently Asked Questions</h2>
<div class="faq-item"><h3>[Question?]</h3><p>[Answer 2-3 sentences]</p></div>
[6-8 faq-items]
</div>`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a senior editor at "All You Need Is Lists". Write 2,500-4,000 word articles with specific real details, prices, stats, named examples. Direct second-person voice. E-E-A-T quality.

LINKING RULES:
- Internal links: <a href="/path">text</a>
- External links: <a href="URL" target="_blank" rel="noopener noreferrer">text</a>
- 4-5 external links spread across different items (use user-provided links where given)

${HTML_STRUCTURE}`,
      },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
  })

  const raw = response.choices[0].message.content
  const parsed = JSON.parse(raw)
  parsed.slug = cleanSlug(parsed.slug || title)
  return parsed
}

// ─── Image generation ─────────────────────────────────────────────────────────
async function getHeroImage(imagePrompt, postTitle) {
  if (IDEOGRAM_KEY) {
    console.log(`  🎨 Ideogram generating thumbnail...`)
    const prompt = `"${postTitle}" — bold clean typography over a ${imagePrompt}. Professional editorial thumbnail, dark background with vibrant accent colours, magazine quality, 16:9 web banner.`
    const res = await fetch('https://api.ideogram.ai/generate', {
      method: 'POST',
      headers: { 'Api-Key': IDEOGRAM_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_request: { prompt, model: 'V_2', aspect_ratio: 'ASPECT_16_9', style_type: 'DESIGN' } }),
    })
    if (!res.ok) throw new Error(`Ideogram ${res.status}: ${await res.text()}`)
    const data = await res.json()
    return { url: data.data?.[0]?.url }
  }

  if (UNSPLASH_KEY) {
    console.log(`  📷 Unsplash searching for photo...`)
    const q = encodeURIComponent(postTitle.split(' ').slice(0, 3).join(' '))
    const res = await fetch(`https://api.unsplash.com/search/photos?query=${q}&per_page=5&orientation=landscape`, {
      headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` }
    })
    if (!res.ok) throw new Error(`Unsplash ${res.status}`)
    const data = await res.json()
    if (!data.results?.length) throw new Error('No Unsplash results')
    const best = data.results.sort((a, b) => b.downloads - a.downloads)[0]
    return { url: best.urls.regular }
  }

  console.log(`  🤖 OpenAI generating image...`)
  const prompt = `${imagePrompt} Editorial photography, 16:9, cinematic lighting, high quality, no text, no logos.`
  for (const model of ['gpt-image-2', 'gpt-image-1']) {
    try {
      const r = await openai.images.generate({ model, prompt, size: '1024x1024', quality: 'medium', n: 1 })
      if (r.data[0].b64_json) return { b64: r.data[0].b64_json }
      return { url: r.data[0].url }
    } catch (err) {
      if (model === 'gpt-image-2' && (err.message?.includes('does not exist') || err.status === 400 || err.status === 404)) continue
      throw err
    }
  }
}

async function uploadImageToSanity(imageResult, filename) {
  console.log(`  ☁️  Uploading to Sanity CDN...`)
  let buffer
  if (imageResult.b64) {
    buffer = Buffer.from(imageResult.b64, 'base64')
  } else {
    const res = await fetch(imageResult.url)
    if (!res.ok) throw new Error(`Fetch image failed: ${res.status}`)
    buffer = Buffer.from(await res.arrayBuffer())
  }
  const asset = await sanity.assets.upload('image', buffer, { filename, contentType: 'image/png' })
  return { _type: 'image', asset: { _type: 'reference', _ref: asset._id } }
}

// ─── Sanity helpers ───────────────────────────────────────────────────────────
async function resolveCategoryRefs(suggestedCategory) {
  const key = category || suggestedCategory
  const slugs = CATEGORY_MAP[key] || [key]
  const cats = await sanity.fetch(`*[_type == "category" && slug.current in $slugs] { _id }`, { slugs })
  return cats.map(c => ({ _type: 'reference', _ref: c._id, _key: c._id }))
}

async function resolveTagRefs(tags) {
  const refs = []
  for (const tagName of (tags || [])) {
    const slug = tagName.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'').slice(0,60)
    if (!slug) continue
    const docId = `tag-${slug}`
    await sanity.createIfNotExists({ _id: docId, _type: 'tag', name: tagName, slug: { _type: 'slug', current: slug } }).catch(() => {})
    refs.push({ _type: 'reference', _ref: docId, _key: docId })
  }
  return refs
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n📋 Bulk import: "${title}"`)

  // 1. Generate content
  const content = await generateFromUserContent()
  console.log(`  ✅ Title: "${content.title}"`)

  // 2. Hero image
  let featuredImage = null
  try {
    const imgResult = await getHeroImage(content.imagePrompt, content.title)
    if (imgResult) {
      featuredImage = await uploadImageToSanity(imgResult, `${content.slug}-hero.png`)
      console.log(`  ✅ Image uploaded`)
    }
  } catch (err) {
    console.warn(`  ⚠️  Image failed: ${err.message} — continuing without`)
  }

  // 3. Categories + tags
  const [categoryRefs, tagRefs] = await Promise.all([
    resolveCategoryRefs(content.suggestedCategory),
    resolveTagRefs(content.tags),
  ])

  // 4. Publish
  const now = new Date().toISOString()
  const catKey = category || content.suggestedCategory || 'lifestyle'
  const fullPath = `/${catKey}/${content.slug}`
  const docId = `ai-${Date.now()}-${Math.random().toString(36).slice(2,7)}`

  await sanity.createOrReplace({
    _id: docId, _type: 'post',
    title: content.title,
    slug: { _type: 'slug', current: content.slug },
    fullPath, date: now, updatedAt: now,
    excerpt: content.excerpt,
    seoTitle: content.seoTitle,
    seoDescription: content.seoDescription,
    content: content.content,
    aiGenerated: true,
    ...(featuredImage && { featuredImage }),
    ...(categoryRefs.length > 0 && { categories: categoryRefs }),
    ...(tagRefs.length > 0 && { tags: tagRefs }),
  })

  console.log(`  ✅ Published: ${docId}`)
  console.log(`     URL: https://allyouneedislists.com${fullPath}`)
}

main().catch(err => { console.error('❌', err.message); process.exit(1) })
