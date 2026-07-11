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

if (!fromPaths.length || !topic) {
  console.error(`Usage: node scripts/refresh-post.mjs --from="/old/path" --topic="New Title" [--category=lifestyle] [--delete]`)
  process.exit(1)
}

// ─── Env ──────────────────────────────────────────────────────────────────────
const OPENAI_KEY = process.env.OPENAI_API_KEY
const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const DATASET    = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
const TOKEN      = process.env.SANITY_WRITE_TOKEN

if (!OPENAI_KEY) { console.error('❌ OPENAI_API_KEY not set'); process.exit(1) }
if (!PROJECT_ID) { console.error('❌ NEXT_PUBLIC_SANITY_PROJECT_ID not set'); process.exit(1) }
if (!TOKEN)      { console.error('❌ SANITY_WRITE_TOKEN not set'); process.exit(1) }

// ─── Clients ──────────────────────────────────────────────────────────────────
const openai = new OpenAI({ apiKey: OPENAI_KEY })
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

async function resolveCategoryRefs(key) {
  const slugs = CATEGORY_MAP[key] || [key]
  const cats = await sanity.fetch(`*[_type == "category" && slug.current in $slugs] { _id, "slug": slug.current }`, { slugs })
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
      const response = await openai.images.generate({ model, prompt: fullPrompt, size: '1792x1024', quality: 'medium', n: 1 })
      const d = response.data[0]
      return d.b64_json ? { b64: d.b64_json } : { url: d.url }
    } catch (err) {
      if (model === 'gpt-image-2' && (err.status === 400 || err.status === 404 || err.message?.includes('does not exist'))) continue
      throw err
    }
  }
}

async function findRelatedPosts(slug, categoryRefs) {
  const catIds = categoryRefs.map(r => r._ref)
  if (!catIds.length) return []
  return sanity.fetch(
    `*[_type=="post" && slug.current != $slug && count((categories[]._ref)[@ in $catIds]) > 0] | order(date desc)[0...4] { title, fullPath }`,
    { slug, catIds }
  )
}

function buildRelatedHTML(posts) {
  if (!posts.length) return ''
  const items = posts.map(p => `<li><a href="https://allyouneedislists.com${p.fullPath}">${p.title}</a></li>`).join('\n')
  return `\n<div class="related-lists"><h3>📋 Related Lists You'll Love</h3><ul>${items}</ul></div>`
}

// ─── Main content generation ───────────────────────────────────────────────────
async function generateContent(topicTitle, category) {
  console.log(`  📝 GPT generating full content...`)

  const contentStructure = `Structure the "content" field HTML EXACTLY like this:

1. QUICK PICKS BOX (very first element):
<div class="quick-picks"><strong>⚡ Quick Picks</strong><ul>
<li>🥇 <strong>Best Overall:</strong> [Item] — [reason]</li>
<li>💰 <strong>Best Value:</strong> [Item] — [reason]</li>
[one <li> per remaining item]
</ul></div>

2. INTRO — 2-3 engaging sentences.

3. LIST ITEMS — exactly 10 items:
<h2>N. [Item Name]</h2>
<p class="best-for"><strong>Best for:</strong> [ideal reader/use case]</p>
<p>[what it is, why it stands out, specific differentiator]</p>
<p>[features, real data, named examples]</p>
<p>[tips, caveats, comparison context]</p>

4. CONCLUSION — 2-3 sentences.

5. FAQ:
<div class="faq-section"><h2>Frequently Asked Questions</h2>
<div class="faq-item"><h3>[Question?]</h3><p>[Answer in 2-3 sentences]</p></div>
[6-8 faq-items]
</div>`

  const messages = [
    {
      role: 'system',
      content: `You are a senior editor at "All You Need Is Lists". Write 3,000–3,500 word listicles with specific real-world details, prices, stats, and named examples. Direct, confident second-person voice.`,
    },
    {
      role: 'user',
      content: `Write a complete listicle about: "${topicTitle}"
${category ? `Category: ${category}` : ''}

${contentStructure}

Return ONLY valid JSON:
{
  "title": "Punchy title under 65 chars, no year",
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

  const response = await openai.chat.completions.create({
    model: 'gpt-5.5',
    messages,
    response_format: { type: 'json_object' },
  })

  const parsed = JSON.parse(response.choices[0].message.content)
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

  // 2. Generate new content
  console.log(`\n📝 Generating new content...`)
  const content = await generateContent(topic, categoryArg)
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

  // 6. Publish new post to Sanity
  const now = new Date().toISOString()
  const newFullPath = `/${categoryArg}/${content.slug}`
  const newDocId = `ai-refresh-${Date.now()}`

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
    console.log(`\n🗑️  Deleting ${oldPosts.length} old post(s)...`)
    for (const old of oldPosts) {
      await sanity.delete(old._id)
      console.log(`  ✅ Deleted ${old._id} (${old.fullPath})`)
    }
  } else {
    console.log(`\n💡 Old posts kept as redirect stubs. Run with --delete to remove them.`)
  }

  console.log(`\n✅ Done!`)
  console.log(`   New post: https://allyouneedislists.com${newFullPath}`)
  if (!shouldDelete) console.log(`   Old URLs will 301 → ${newFullPath}`)
}

main().catch(err => { console.error(err); process.exit(1) })
