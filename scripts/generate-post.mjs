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

if (!topicArg && !batchFile) {
  console.error(`
Usage:
  node scripts/generate-post.mjs "Your topic here"
  node scripts/generate-post.mjs "Topic" --category=ai --draft
  node scripts/generate-post.mjs --batch scripts/topics.txt

Options:
  --category=SLUG   Force a category (ai, technology, business, entertainment, travel, lifestyle)
  --draft           Save as Sanity draft instead of publishing immediately
  --skip-images     Skip DALL-E image generation (faster, free)
  --hd              Use DALL-E 3 HD quality ($0.12/image vs $0.04 standard)
`)
  process.exit(1)
}

// ─── Validate env ─────────────────────────────────────────────────────────────
const OPENAI_KEY = process.env.OPENAI_API_KEY
const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET || process.env.SANITY_DATASET || 'production'
const TOKEN = process.env.SANITY_WRITE_TOKEN

if (!OPENAI_KEY) { console.error('❌ OPENAI_API_KEY not set in .env.local'); process.exit(1) }
if (!PROJECT_ID) { console.error('❌ NEXT_PUBLIC_SANITY_PROJECT_ID not set'); process.exit(1) }
if (!TOKEN) { console.error('❌ SANITY_WRITE_TOKEN not set'); process.exit(1) }

// ─── Clients ──────────────────────────────────────────────────────────────────
const openaiClient = new OpenAI({ apiKey: OPENAI_KEY })

const sanity = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  token: TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
})

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
    model: 'gpt-4o',
    messages,
    temperature: 0.75,
    ...(jsonMode && { response_format: { type: 'json_object' } }),
  })
  return response.choices[0].message.content
}

async function generateImage(prompt) {
  const fullPrompt = `${prompt} Editorial photography style, 16:9 composition, cinematic lighting, high quality, no text, no watermarks, no logos.`

  // Try dall-e-3 first, fall back to gpt-image-1 for newer project API keys
  let imageUrl
  try {
    const response = await openaiClient.images.generate({
      model: 'dall-e-3',
      prompt: fullPrompt,
      size: '1792x1024',
      quality: useHD ? 'hd' : 'standard',
      n: 1,
    })
    imageUrl = response.data[0].url
  } catch (err) {
    if (err.message?.includes('does not exist') || err.status === 400) {
      console.log('  ↩️  dall-e-3 unavailable, trying gpt-image-1...')
      const response = await openaiClient.images.generate({
        model: 'gpt-image-1',
        prompt: fullPrompt,
        size: '1024x1024',
        quality: useHD ? 'high' : 'medium',
        n: 1,
      })
      // gpt-image-1 returns base64, not a URL
      if (response.data[0].b64_json) {
        return { b64: response.data[0].b64_json }
      }
      imageUrl = response.data[0].url
    } else {
      throw err
    }
  }
  return { url: imageUrl }
}

// ─── Content generation ────────────────────────────────────────────────────────
async function generateContent(topic, category) {
  console.log(`  📝 GPT-4o generating content...`)

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
  "title": "Engaging, SEO-optimised title under 65 characters. Include the year if relevant.",
  "slug": "lowercase-hyphenated-url-slug-no-special-chars",
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

  return JSON.parse(raw)
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
  console.log(`   Mode: ${isDraft ? 'draft' : 'publish'} | Images: ${skipImages ? 'skip' : useHD ? 'DALL-E 3 HD' : 'DALL-E 3 standard'}`)

  // 1. Content
  const content = await generateContent(topic, category)
  console.log(`  ✅ Title: "${content.title}"`)
  console.log(`     Slug:  /${content.suggestedCategory}/${content.slug}`)
  console.log(`     Tags:  ${content.tags?.join(', ')}`)

  // 2. Image
  let featuredImage = null
  if (!skipImages) {
    try {
      console.log(`  🎨 DALL-E 3 generating image (${useHD ? 'HD $0.12' : 'standard $0.04'})...`)
      const imageResult = await generateImage(content.imagePrompt)
      featuredImage = await uploadImageToSanity(imageResult, `${content.slug}-hero.png`)
      console.log(`  ✅ Image ready`)
    } catch (err) {
      console.warn(`  ⚠️  Image failed: ${err.message} — continuing without image`)
    }
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
