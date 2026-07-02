#!/usr/bin/env node
/**
 * WordPress → Sanity Import Script
 *
 * Imports all 1,486 posts from allyouneedislists.com into Sanity, including:
 *  - Categories (with parent relationships)
 *  - Tags
 *  - Posts (with HTML content, dates, exact URL paths)
 *  - Featured images (downloaded and uploaded to Sanity CDN)
 *  - SEO meta (Yoast title/description if available)
 *
 * Usage:
 *   SANITY_PROJECT_ID=xxx SANITY_WRITE_TOKEN=xxx node scripts/import-from-wordpress.mjs
 *
 * Or with a .env.local file set:
 *   node scripts/import-from-wordpress.mjs
 *
 * Options:
 *   --skip-images    Skip image uploads (faster, images can be re-imported later)
 *   --start-page N   Start from WP page N (useful for resuming)
 */

import { createClient } from '@sanity/client'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// Load .env.local if present
const envPath = resolve(process.cwd(), '.env.local')
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim().replace(/^["']|["']$/g, '')
      if (!process.env[key]) process.env[key] = value
    }
  }
  console.log('📄 Loaded .env.local')
}

const SKIP_IMAGES = process.argv.includes('--skip-images')
const START_PAGE = parseInt((process.argv.find(a => a.startsWith('--start-page=')) || '').replace('--start-page=', '') || '1', 10) || 1
const WP_BASE = 'https://allyouneedislists.com/wp-json/wp/v2'
const BATCH_SIZE = 5
const DELAY_MS = 600

const PROJECT_ID = process.env.SANITY_PROJECT_ID || process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const DATASET = process.env.SANITY_DATASET || process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
const TOKEN = process.env.SANITY_WRITE_TOKEN

if (!PROJECT_ID) {
  console.error('\n❌ SANITY_PROJECT_ID not set. Add it to .env.local or pass as env var.\n')
  process.exit(1)
}
if (!TOKEN) {
  console.error('\n❌ SANITY_WRITE_TOKEN not set. Create a write token in your Sanity dashboard.\n')
  process.exit(1)
}

const sanity = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: '2024-01-01',
  token: TOKEN,
  useCdn: false,
})

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function wpFetch(path, params = {}) {
  const url = new URL(`${WP_BASE}${path}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v))

  let lastErr
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url.toString(), { signal: AbortSignal.timeout(30000) })
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
      return { data: await res.json(), headers: res.headers }
    } catch (err) {
      lastErr = err
      if (attempt < 3) await sleep(2000 * attempt)
    }
  }
  throw lastErr
}

async function fetchAllWpPages(path, fields = [], startPage = 1) {
  const items = []
  let page = startPage
  let totalPages = Infinity

  while (page <= totalPages) {
    const params = { per_page: 100, page }
    if (fields.length) params._fields = fields.join(',')

    try {
      const { data, headers } = await wpFetch(path, params)

      if (totalPages === Infinity) {
        totalPages = parseInt(headers.get('x-wp-totalpages') || '1', 10)
        const total = parseInt(headers.get('x-wp-total') || '0', 10)
        console.log(`     Found ${total} items across ${totalPages} pages`)
      }

      items.push(...data)
      process.stdout.write(`     Page ${page}/${totalPages} ✓\r`)

      page++
      if (page <= totalPages) await sleep(DELAY_MS)
    } catch (err) {
      console.warn(`\n     ⚠ Failed to fetch page ${page}: ${err.message}`)
      break
    }
  }

  console.log('')
  return items
}

async function uploadImageFromUrl(imageUrl, altText = '') {
  if (SKIP_IMAGES) return null

  try {
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(20000) })
    if (!res.ok) return null

    const contentType = res.headers.get('content-type') || 'image/jpeg'
    if (!contentType.startsWith('image/')) return null

    const buffer = Buffer.from(await res.arrayBuffer())
    const filename = imageUrl.split('/').pop()?.split('?')[0] || 'image.jpg'

    const asset = await sanity.assets.upload('image', buffer, {
      filename,
      contentType,
      label: altText,
    })

    return asset._id
  } catch {
    return null
  }
}

async function docExists(id) {
  const result = await sanity.fetch(`*[_id == $id][0]._id`, { id })
  return !!result
}

async function importCategories(categories) {
  const map = {}
  let created = 0
  let skipped = 0

  // Pass 1: create all categories WITHOUT parent refs (avoids ordering/orphan issues)
  for (const cat of categories) {
    const docId = `wp-cat-${cat.id}`
    map[cat.id] = docId

    if (await docExists(docId)) {
      skipped++
      continue
    }

    await sanity.createOrReplace({
      _id: docId,
      _type: 'category',
      name: cat.name,
      slug: { _type: 'slug', current: cat.slug },
      wpId: cat.id,
    })
    created++
  }

  // Pass 2: patch parent references (now all docs exist)
  for (const cat of categories) {
    if (!cat.parent || cat.parent === 0) continue
    const docId = `wp-cat-${cat.id}`
    const parentDocId = `wp-cat-${cat.parent}`

    // Only set parent if parent doc is in our map (skip orphaned refs)
    if (!map[cat.parent]) continue

    try {
      await sanity.patch(docId).set({ parent: { _type: 'reference', _ref: parentDocId } }).commit()
    } catch {
      // Silently skip if patch fails
    }
  }

  return { map, created, skipped }
}

async function importTags(tags) {
  const map = {}
  let created = 0
  let skipped = 0

  for (const tag of tags) {
    const docId = `wp-tag-${tag.id}`

    if (await docExists(docId)) {
      map[tag.id] = docId
      skipped++
      continue
    }

    await sanity.createOrReplace({
      _id: docId,
      _type: 'tag',
      name: tag.name,
      slug: { _type: 'slug', current: tag.slug },
      wpId: tag.id,
    })

    map[tag.id] = docId
    created++
  }

  return { map, created, skipped }
}

async function importPost(post, categoryMap, tagMap) {
  const docId = `wp-post-${post.id}`

  if (await docExists(docId)) return 'skipped'

  // Extract clean URL path from the full link
  let fullPath = ''
  try {
    const url = new URL(post.link)
    fullPath = url.pathname.replace(/\/$/, '') || `/${post.slug}`
  } catch {
    fullPath = `/${post.slug}`
  }

  const doc = {
    _id: docId,
    _type: 'post',
    title: post.title?.rendered || 'Untitled',
    slug: { _type: 'slug', current: post.slug },
    fullPath,
    date: post.date,
    content: post.content?.rendered || '',
    excerpt: post.excerpt?.rendered || '',
    wpId: post.id,
    wpFeaturedMediaId: post.featured_media || null,
  }

  // Yoast SEO fields
  if (post.yoast_head_json) {
    if (post.yoast_head_json.title) doc.seoTitle = post.yoast_head_json.title
    if (post.yoast_head_json.description) doc.seoDescription = post.yoast_head_json.description
  }

  // Categories
  const postCats = (post.categories || []).filter((id) => categoryMap[id])
  if (postCats.length) {
    doc.categories = postCats.map((id) => ({
      _type: 'reference',
      _ref: categoryMap[id],
      _key: `cat-${id}`,
    }))
  }

  // Tags
  const postTags = (post.tags || []).filter((id) => tagMap[id])
  if (postTags.length) {
    doc.tags = postTags.map((id) => ({
      _type: 'reference',
      _ref: tagMap[id],
      _key: `tag-${id}`,
    }))
  }

  // Featured image
  if (post.featured_media && post.featured_media > 0 && !SKIP_IMAGES) {
    try {
      const { data: media } = await wpFetch(`/media/${post.featured_media}`, {
        _fields: 'source_url,alt_text,title',
      })

      if (media?.source_url) {
        const assetId = await uploadImageFromUrl(
          media.source_url,
          media.alt_text || media.title?.rendered || '',
        )

        if (assetId) {
          doc.featuredImage = {
            _type: 'image',
            asset: { _type: 'reference', _ref: assetId },
            alt: media.alt_text || media.title?.rendered || doc.title,
          }
        }
      }
    } catch {
      // Silently skip failed image fetches
    }
  }

  await sanity.createOrReplace(doc)
  return 'created'
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════╗')
  console.log('║        WordPress → Sanity Import Script              ║')
  console.log('║        allyouneedislists.com                         ║')
  console.log('╚══════════════════════════════════════════════════════╝\n')
  console.log(`Project:  ${PROJECT_ID}/${DATASET}`)
  console.log(`Images:   ${SKIP_IMAGES ? 'SKIPPING' : 'uploading to Sanity'}`)
  if (START_PAGE > 1) console.log(`Starting from post page: ${START_PAGE}`)
  console.log('')

  // ─── Step 1: Categories ─────────────────────────────────────────
  console.log('━━━ Step 1/3: Categories ━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  const wpCategories = await fetchAllWpPages('/categories', ['id', 'name', 'slug', 'parent', 'count'])
  const { map: categoryMap, created: catCreated, skipped: catSkipped } = await importCategories(wpCategories)
  console.log(`✔ Categories: ${catCreated} created, ${catSkipped} already existed\n`)

  // ─── Step 2: Tags ────────────────────────────────────────────────
  console.log('━━━ Step 2/3: Tags ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  const wpTags = await fetchAllWpPages('/tags', ['id', 'name', 'slug'])
  const { map: tagMap, created: tagCreated, skipped: tagSkipped } = await importTags(wpTags)
  console.log(`✔ Tags: ${tagCreated} created, ${tagSkipped} already existed\n`)

  // ─── Step 3: Posts ───────────────────────────────────────────────
  console.log('━━━ Step 3/3: Posts (1,486 posts) ━━━━━━━━━━━━━━━━━━━')
  const postFields = [
    'id', 'date', 'slug', 'link', 'title', 'content', 'excerpt',
    'featured_media', 'categories', 'tags', 'yoast_head_json',
  ]
  const wpPosts = await fetchAllWpPages('/posts', postFields, START_PAGE)

  let created = 0
  let skipped = 0
  let errors = 0
  const startTime = Date.now()

  for (let i = 0; i < wpPosts.length; i += BATCH_SIZE) {
    const batch = wpPosts.slice(i, i + BATCH_SIZE)

    const results = await Promise.allSettled(
      batch.map((post) => importPost(post, categoryMap, tagMap))
    )

    for (const r of results) {
      if (r.status === 'fulfilled') {
        if (r.value === 'skipped') skipped++
        else created++
      } else {
        errors++
        console.error(`\n  ❌ ${r.reason?.message}`)
      }
    }

    // Progress line
    const processed = Math.min(i + BATCH_SIZE, wpPosts.length)
    const pct = Math.round((processed / wpPosts.length) * 100)
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
    const eta = elapsed > 0 ? Math.round((wpPosts.length - processed) / (processed / elapsed)) : '?'
    process.stdout.write(
      `  [${pct}%] ${processed}/${wpPosts.length} | ✔ ${created} created | ⏭ ${skipped} skipped | ❌ ${errors} errors | ETA ~${eta}s    \r`
    )

    if (i + BATCH_SIZE < wpPosts.length) await sleep(DELAY_MS)
  }

  console.log('\n')
  console.log('═══════════════════════════════════════════════════════')
  console.log('  IMPORT COMPLETE')
  console.log(`  ✔ Posts created:  ${created}`)
  console.log(`  ⏭ Already existed: ${skipped}`)
  console.log(`  ❌ Errors:        ${errors}`)
  console.log(`  ⏱ Total time:    ${Math.round((Date.now() - startTime) / 1000)}s`)
  console.log('═══════════════════════════════════════════════════════')
  console.log('\nNext steps:')
  console.log('  1. Visit your Sanity Studio: npm run dev → /studio')
  console.log('  2. Check posts were imported correctly')
  console.log('  3. Start Next.js: npm run dev\n')
}

main().catch((err) => {
  console.error('\n💥 Fatal error:', err.message)
  process.exit(1)
})
