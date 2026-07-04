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

// ─── Content generation ────────────────────────────────────────────────────────
async function generateContent(topic, category) {
  console.log(`  📝 GPT-5.5 generating content...`)

  const system = `You are a senior editor at "All You Need Is Lists", a top-ranked web publication specialising in expert listicle content. Your articles are:
- Well-researched with specific, accurate details and real examples
- Written in an engaging, direct second-person voice
- Structured for featured snippets (clear numbered items with H2 headings)  
- SEO-optimised with natural keyword integration
- 1,800–2,500 words, informative but scannable
- Formatted in clean HTML (no external CSS, no wrapper divs)`

  const user = `Write a complete, publication-ready listicle about: "${topic}"
${category ? `Suggested category: ${category}` : ''}

Return ONLY valid JSON with exactly these fields (no markdown, no code fences):
{
  "title": "Engaging, punchy title under 65 characters. Do NOT include the year in the title.",
  "slug": "3-5 word slug, NO year, NO stop words (the/a/an/for/in/of/to/by), e.g. best-budget-laptops-students",
  "excerpt": "Compelling 150-160 character meta description that makes people want to click",
  "seoTitle": "SEO page title under 60 characters including target keyword",
  "seoDescription": "Meta description 145-155 characters with natural keyword usage",
  "content": "Full HTML article. Start with a compelling 2-sentence intro paragraph. Then use numbered <h2> headings for each list item (e.g. '<h2>1. Item Name</h2>'). Under each heading write 2-3 <p> paragraphs with specific details. Use <strong> for key terms. End with a short conclusion paragraph. No wrapper divs.",
  "imagePrompt": "Specific, vivid DALL-E 3 prompt describing a photorealistic hero image that captures the essence of this topic. Be specific about subject, setting, lighting, mood. No text in image.",
  "suggestedCategory": "One of exactly: ai, business, technology, entertainment, travel, lifestyle, statistics, directories",
  "tags": ["5 to 8 specific lowercase tags relevant to this topic, no spaces"]
}`

  const raw = await callOpenAI([
    { role: 'system', content: system },
    { role: 'user', content: user },
  ], true)

  const parsed = JSON.parse(raw)
  // Post-process: enforce clean slug regardless of what GPT returned
  parsed.slug = cleanSlug(parsed.slug || parsed.title)
  return parsed
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

  // 4. Publish to Sanity
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
