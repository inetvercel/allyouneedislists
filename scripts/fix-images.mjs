#!/usr/bin/env node
/**
 * fix-images.mjs — Backfill missing featured images on Sanity posts.
 *
 * Generates a tailored AI image (gpt-image-1) for each post that lacks a featuredImage.
 * Also optionally strips dead <img> tags from HTML content.
 *
 * Usage:
 *   node scripts/fix-images.mjs --id=wp-post-4705                       # one post by Sanity ID
 *   node scripts/fix-images.mjs --path=/lifestyle/5-places-chicago      # one post by fullPath
 *   node scripts/fix-images.mjs --all                                   # all missing images
 *   node scripts/fix-images.mjs --all --limit=20                        # first 20 missing
 *   node scripts/fix-images.mjs --all --clean-content                   # also strip dead body <img>
 *   node scripts/fix-images.mjs --dry-run                               # list posts only, no changes
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

const targetId     = getArg('id')
const targetPath   = getArg('path')
const limitStr     = getArg('limit')
const limit        = limitStr ? parseInt(limitStr, 10) : Infinity
const dryRun       = hasFlag('dry-run')
const fixAll       = hasFlag('all')
const cleanContent = hasFlag('clean-content')

if (!targetId && !targetPath && !fixAll && !dryRun) {
  console.error('Usage: node scripts/fix-images.mjs --id=<sanity-id>  OR  --path=/full/url/path  OR  --all  [--limit=N] [--clean-content] [--dry-run]')
  process.exit(1)
}

// ─── Env ──────────────────────────────────────────────────────────────────────
const OPENAI_KEY  = process.env.OPENAI_API_KEY
const PROJECT_ID  = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const DATASET     = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
const TOKEN       = process.env.SANITY_WRITE_TOKEN

if (!OPENAI_KEY) { console.error('❌ OPENAI_API_KEY not set'); process.exit(1) }
if (!PROJECT_ID) { console.error('❌ NEXT_PUBLIC_SANITY_PROJECT_ID not set'); process.exit(1) }
if (!TOKEN)      { console.error('❌ SANITY_WRITE_TOKEN not set'); process.exit(1) }

// ─── Clients ──────────────────────────────────────────────────────────────────
const openai = new OpenAI({ apiKey: OPENAI_KEY })

const sanity = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  token: TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
})

// ─── Build image prompt from post title (GPT-4o-mini, very cheap) ─────────────
async function buildImagePrompt(title) {
  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: `Write a short visual prompt (max 25 words) for a photorealistic editorial-style hero image for an article titled: "${title}". Describe the scene only — no text or overlays. Example: "Chicago skyline at dusk with Wrigley Field in foreground, sports fans, golden hour lighting"`,
      },
    ],
  })
  return res.choices[0].message.content.trim().replace(/^["']|["']$/g, '')
}

// ─── Generate image via gpt-image-1 ──────────────────────────────────────────
async function generateAIImage(prompt) {
  const fullPrompt = `${prompt}. Editorial photography style, 16:9 composition, cinematic lighting, high quality, no text, no watermarks.`

  for (const model of ['gpt-image-2', 'gpt-image-1']) {
    try {
      const response = await openai.images.generate({
        model,
        prompt: fullPrompt,
        size: '1792x1024',
        quality: 'medium',
        n: 1,
      })
      const d = response.data[0]
      if (d.b64_json) return { b64: d.b64_json }
      return { url: d.url }
    } catch (err) {
      if (model === 'gpt-image-2' && (err.status === 400 || err.status === 404 || err.message?.includes('does not exist'))) {
        console.log(`    ↩️  gpt-image-2 unavailable, trying gpt-image-1...`)
        continue
      }
      throw err
    }
  }
}

// ─── Upload image buffer to Sanity CDN ────────────────────────────────────────
async function uploadToSanity(imageResult, filename) {
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

// ─── Strip dead <img> tags from content HTML ──────────────────────────────────
function stripDeadImages(html) {
  if (!html) return html
  // Remove <img> tags that point to external domains (not Sanity CDN)
  return html.replace(/<img[^>]+src="(?!https:\/\/cdn\.sanity\.io)[^"]*"[^>]*\/?>/gi, '')
             .replace(/<figure[^>]*>\s*<\/figure>/gi, '') // clean up empty <figure> wrappers
             .replace(/\n{3,}/g, '\n\n') // normalise excess whitespace
}

// ─── Fix one post ─────────────────────────────────────────────────────────────
async function fixPost(post, index, total) {
  const label = `[${index}/${total}] "${post.title}"`

  if (dryRun) {
    console.log(`  📋 ${label}  (slug: ${post.slug?.current})`)
    return
  }

  const patch = {}

  // 1. Generate + upload featured image
  if (!post.featuredImage) {
    try {
      console.log(`\n🖼️  ${label}`)
      console.log(`    🤖 Building image prompt...`)
      const prompt = await buildImagePrompt(post.title)
      console.log(`    📝 Prompt: "${prompt}"`)
      console.log(`    🎨 Generating image...`)
      const imageResult = await generateAIImage(prompt)
      const slug = post.slug?.current || post._id
      const featuredImage = await uploadToSanity(imageResult, `${slug}-hero.png`)
      featuredImage.alt = post.title
      patch.featuredImage = featuredImage
      console.log(`    ✅ Image uploaded`)
    } catch (err) {
      console.warn(`    ⚠️  Image failed: ${err.message}`)
    }
  }

  // 2. Strip dead body images if requested
  if (cleanContent && post.content) {
    const cleaned = stripDeadImages(post.content)
    if (cleaned !== post.content) {
      patch.content = cleaned
      console.log(`    🧹 Stripped dead body images`)
    }
  }

  if (Object.keys(patch).length === 0) {
    console.log(`  ✅ Nothing to fix for "${post.title}"`)
    return
  }

  await sanity.patch(post._id).set(patch).commit()
  console.log(`    💾 Saved to Sanity`)
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🔧 fix-images.mjs`)
  console.log(`   Mode:          ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`   Target:        ${targetId ? `id="${targetId}"` : targetPath ? `path="${targetPath}"` : 'all missing images'}`)
  console.log(`   Limit:         ${limit === Infinity ? 'none' : limit}`)
  console.log(`   Clean content: ${cleanContent ? 'yes' : 'no'}\n`)

  let query, params = {}
  const cap = limit === Infinity ? 9999 : limit

  if (targetId) {
    query = `*[_type == "post" && _id == $id][0...1] { _id, title, slug, featuredImage, content }`
    params = { id: targetId }
  } else if (targetPath) {
    query = `*[_type == "post" && fullPath == $path][0...1] { _id, title, slug, featuredImage, content }`
    params = { path: targetPath }
  } else if (cleanContent) {
    // When cleaning content, grab all posts (even ones with images)
    query = `*[_type == "post"] | order(date desc) [0...${cap}] { _id, title, slug, featuredImage, content }`
  } else {
    // Default: all posts missing a featuredImage
    query = `*[_type == "post" && !defined(featuredImage)] | order(date desc) [0...${cap}] { _id, title, slug, featuredImage, content }`
  }

  const posts = await sanity.fetch(query, params)
  console.log(`📦 Found ${posts.length} post(s) to process\n`)

  if (posts.length === 0) {
    console.log('✅ Nothing to do.')
    return
  }

  if (dryRun) {
    console.log('Posts that would be fixed:')
    for (let i = 0; i < posts.length; i++) {
      await fixPost(posts[i], i + 1, posts.length)
    }
    console.log(`\n🔍 Dry run complete — no changes made.`)
    return
  }

  let success = 0, failed = 0
  for (let i = 0; i < posts.length; i++) {
    try {
      await fixPost(posts[i], i + 1, posts.length)
      success++
    } catch (err) {
      console.error(`  ❌ Failed: ${err.message}`)
      failed++
    }
    // Brief pause to avoid rate limits
    if (i < posts.length - 1) await new Promise(r => setTimeout(r, 500))
  }

  console.log(`\n✅ Done — ${success} fixed, ${failed} failed`)
}

main().catch(err => { console.error(err); process.exit(1) })
