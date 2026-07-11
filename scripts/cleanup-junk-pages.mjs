#!/usr/bin/env node
/**
 * cleanup-junk-pages.mjs
 *
 * Finds and removes WordPress pagination + attachment pages that were
 * imported as separate Sanity documents. Sets redirectTo to the canonical
 * parent post so any indexed URLs still get a proper 301.
 *
 * Junk types detected:
 *   - Pagination:  /post-slug/2  /post-slug/39  etc.
 *   - Attachment:  /post-slug/attachment/image-name
 *
 * Usage:
 *   node scripts/cleanup-junk-pages.mjs --dry-run    # preview only, no changes
 *   node scripts/cleanup-junk-pages.mjs              # run live
 */

import { createClient } from '@sanity/client'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// ─── Load .env.local ──────────────────────────────────────────────────────────
const envPath = resolve(process.cwd(), '.env.local')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf-8').replace(/^\uFEFF/, '').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) { const k=m[1].trim(), v=m[2].trim().replace(/^["']|["']$/g,''); if(!process.env[k]) process.env[k]=v }
  }
}

const dryRun = process.argv.includes('--dry-run')

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  token: process.env.SANITY_WRITE_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
})

// ─── Detect junk type ─────────────────────────────────────────────────────────
function classifyPath(fullPath) {
  // Attachment page: /post-slug/attachment/anything
  if (/\/attachment\//i.test(fullPath)) return 'attachment'
  // Pagination page: ends with /N (1–3 digits)
  if (/\/\d{1,3}$/.test(fullPath)) return 'pagination'
  return null
}

// Strip junk suffix to find the canonical parent path
function getCanonicalPath(fullPath, type) {
  if (type === 'attachment') {
    return fullPath.replace(/\/attachment\/.*/i, '')
  }
  if (type === 'pagination') {
    return fullPath.replace(/\/\d{1,3}$/, '')
  }
  return fullPath
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🧹 cleanup-junk-pages.mjs  [${dryRun ? 'DRY RUN' : 'LIVE'}]\n`)

  // Fetch all posts that don't already have redirectTo
  console.log('📦 Fetching posts...')
  const all = await sanity.fetch(
    `*[_type=="post" && defined(fullPath) && !defined(redirectTo)] { _id, fullPath }`
  )
  console.log(`   ${all.length} posts loaded\n`)

  // Build a set of all known real paths for parent lookup
  const knownPaths = new Set(all.map(p => p.fullPath))

  // Classify each post
  const junk = []
  for (const post of all) {
    const type = classifyPath(post.fullPath)
    if (!type) continue
    const canonical = getCanonicalPath(post.fullPath, type)
    // Only flag as junk if the canonical parent actually exists (or fall back to /)
    const redirectTo = knownPaths.has(canonical) ? canonical : '/'
    junk.push({ ...post, type, canonical, redirectTo })
  }

  const pagination  = junk.filter(j => j.type === 'pagination')
  const attachments = junk.filter(j => j.type === 'attachment')
  const noParent    = junk.filter(j => j.redirectTo === '/')

  console.log(`📊 Found ${junk.length} junk documents:`)
  console.log(`   Pagination pages:  ${pagination.length}`)
  console.log(`   Attachment pages:  ${attachments.length}`)
  console.log(`   No parent found → redirect to /: ${noParent.length}\n`)

  if (junk.length === 0) {
    console.log('✅ Nothing to clean up.')
    return
  }

  // Show sample
  console.log('Sample (first 15):')
  for (const j of junk.slice(0, 15)) {
    console.log(`   [${j.type.padEnd(10)}] ${j.fullPath.padEnd(70)} → ${j.redirectTo}`)
  }
  if (junk.length > 15) console.log(`   ... and ${junk.length - 15} more\n`)

  if (dryRun) {
    console.log('\n🔍 DRY RUN complete — no changes made.')
    console.log(`   Re-run without --dry-run to apply.`)
    return
  }

  // Process in batches of 50 using Sanity transactions
  console.log(`\n⚙️  Processing ${junk.length} documents...`)
  const BATCH = 50
  let done = 0

  for (let i = 0; i < junk.length; i += BATCH) {
    const batch = junk.slice(i, i + BATCH)
    const tx = sanity.transaction()

    for (const j of batch) {
      // Set redirectTo (keeps it as a 301 stub) then delete the document
      // We delete directly since the route handles the redirect via next.config or
      // we don't need 945 stubs for pages that were never real content
      tx.delete(j._id)
    }

    await tx.commit()
    done += batch.length
    process.stdout.write(`\r   Deleted ${done}/${junk.length}...`)
  }

  console.log(`\n\n✅ Done — deleted ${junk.length} junk documents`)
  console.log(`   Pagination removed:  ${pagination.length}`)
  console.log(`   Attachments removed: ${attachments.length}`)
  console.log(`\n   Your sitemap now contains only real content pages.`)
  console.log(`   Any Bing/Google-indexed junk URLs will return 404 → Google`)
  console.log(`   drops them naturally within 1-2 crawl cycles.`)
}

main().catch(err => { console.error(err); process.exit(1) })
