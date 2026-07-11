#!/usr/bin/env node
/**
 * batch-refresh.mjs — Bulk refresh all WP posts that need a full AI rewrite.
 *
 * Uses the same scoring logic as audit-posts.mjs to decide what to skip.
 * Progress is saved to .batch-progress.json so it can be resumed if interrupted.
 *
 * Usage:
 *   node scripts/batch-refresh.mjs --dry-run               # Preview only — no writes
 *   node scripts/batch-refresh.mjs --category=technology   # One category at a time
 *   node scripts/batch-refresh.mjs --limit=50              # Cap at 50 posts
 *   node scripts/batch-refresh.mjs                         # Full run (all REFRESH posts)
 *   node scripts/batch-refresh.mjs --resume                # Skip already-processed IDs
 */

import { createClient } from '@sanity/client'
import { readFileSync, existsSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { execSync } from 'child_process'

// ─── Env ─────────────────────────────────────────────────────────────────────
const envPath = resolve(process.cwd(), '.env.local')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf-8').replace(/^\uFEFF/, '').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) { const k=m[1].trim(),v=m[2].trim().replace(/^["']|["']$/g,''); if(!process.env[k]) process.env[k]=v }
  }
}

// ─── Args ─────────────────────────────────────────────────────────────────────
const args    = process.argv.slice(2)
const getArg  = (n) => { const a=args.find(a=>a.startsWith(`--${n}=`)); return a?a.split('=').slice(1).join('='):null }
const hasFlag = (n) => args.includes(`--${n}`)

const dryRun       = hasFlag('dry-run')
const resumeMode   = hasFlag('resume')
const categoryFilter = getArg('category')     // e.g. --category=technology
const limitArg     = parseInt(getArg('limit') || '9999', 10)

const PROGRESS_FILE = resolve(process.cwd(), '.batch-progress.json')

// ─── Sanity ───────────────────────────────────────────────────────────────────
const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  token: process.env.SANITY_WRITE_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
})

// ─── Same scoring logic as audit-posts.mjs ────────────────────────────────────
const DELETE_PATTERNS = [
  /\b(q[1-4] 20(0[5-9]|1[0-5]))\b/i,
  /\b20(0[5-9]|1[0-4])\b.*\b(release|launch|announce|keynote)\b/i,
  /\b(release|launch|games?).*(q[1-4] 20|20(0[5-9]|1[0-4]))/i,
]
const KEEP_PATTERNS = [
  /^list of all/i,
  /complete list/i,
  /all .{3,30} (movies|films|episodes|seasons|games|songs|albums|flavou?rs|characters|villains)/i,
  /every .{3,30} (movie|film|game|song|album)/i,
  /in (chronological|release) order/i,
]
// More specific delete patterns
const EXTRA_DELETE_PATTERNS = [
  /flash game/i,
  /flappy bird/i,
  /wordpress (theme|plugin|site).*(20(0[5-9]|1[0-6]))/i,
  /(20(0[5-9]|1[0-6])).*(wordpress (theme|plugin))/i,
  /blog engage/i,
  /arras theme/i,
  /ipad wallpaper/i,
]

// Categories / path prefixes that are outdated / not worth refreshing
const SKIP_CATEGORIES = ['wallpaper-galleries', '2009', '2010', '2011', '2012', '2013', 'product']

function shouldSkip(post) {
  const title = post.title || ''
  const path  = post.fullPath || ''
  const chars = post.chars || 0
  const words = Math.round(chars / 5)
  const firstSeg = path.split('/').filter(Boolean)[0] || ''

  if (post.aiGenerated || post.redirectTo) return 'already done'
  if (chars < 500)                                           return 'too thin'
  if (DELETE_PATTERNS.some(r => r.test(title)))              return 'dated event'
  if (EXTRA_DELETE_PATTERNS.some(r => r.test(title)))        return 'dead/niche topic'
  if (EXTRA_DELETE_PATTERNS.some(r => r.test(path)))         return 'dead/niche topic'
  if (SKIP_CATEGORIES.includes(firstSeg))                    return `skip path (${firstSeg})`
  if (words >= 5000 && KEEP_PATTERNS.some(r => r.test(title))) return 'KEEP — high value'
  if (words >= 5000)                                         return 'KEEP — very long (review manually)'
  return null
}

// ─── Derive category from fullPath ────────────────────────────────────────────
function deriveCategory(fullPath) {
  const seg = (fullPath || '').split('/').filter(Boolean)[0] || ''
  const MAP = {
    technology: 'technology', lifestyle: 'lifestyle', entertainment: 'entertainment',
    gaming: 'gaming', 'world-business': 'world-business', design: 'design',
    health: 'health', finance: 'finance', education: 'education', sports: 'sports',
    ai: 'ai', science: 'science',
  }
  return MAP[seg] || 'lifestyle'
}

// ─── Progress file ────────────────────────────────────────────────────────────
function loadProgress() {
  if (existsSync(PROGRESS_FILE)) {
    try { return JSON.parse(readFileSync(PROGRESS_FILE, 'utf-8')) } catch {}
  }
  return { done: [], failed: [], startedAt: new Date().toISOString() }
}
function saveProgress(progress) {
  writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2))
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🏭 batch-refresh.mjs  [${dryRun ? 'DRY RUN' : 'LIVE'}]`)
  if (categoryFilter) console.log(`   Category filter: ${categoryFilter}`)
  if (limitArg < 9999) console.log(`   Limit: ${limitArg} posts`)
  console.log()

  // Load progress
  const progress = loadProgress()
  if (resumeMode) console.log(`   Resuming — ${progress.done.length} already done, ${progress.failed.length} failed\n`)

  // Fetch all posts
  console.log('📊 Fetching posts from Sanity...')
  let posts = await sanity.fetch(
    `*[_type=="post"] | order(length(content) desc) { _id, title, fullPath, "chars": length(content), aiGenerated, redirectTo }`
  )
  console.log(`   ${posts.length} total posts\n`)

  // Filter + deduplicate by normalised title
  const queue = []
  const seenTitles = new Set()
  let skipped = 0

  for (const post of posts) {
    const skipReason = shouldSkip(post)
    if (skipReason) { skipped++; continue }
    if (resumeMode && progress.done.includes(post._id)) { skipped++; continue }
    if (categoryFilter && deriveCategory(post.fullPath) !== categoryFilter) { skipped++; continue }

    // Deduplicate: if we already queued a post with the same normalised title, skip this one
    const normTitle = (post.title || '').toLowerCase().replace(/[^a-z0-9]/g, '')
    if (seenTitles.has(normTitle)) {
      skipped++
      console.log(`  [dup]  ${post.fullPath}`)
      continue
    }
    seenTitles.add(normTitle)
    queue.push(post)
  }

  const toRun = queue.slice(0, limitArg)

  console.log(`📋 Queue: ${toRun.length} posts to refresh  (${skipped} skipped)`)
  console.log(`⏱  Est. time: ~${Math.round(toRun.length * 50 / 60)} minutes`)
  console.log(`💰 Est. cost: ~$${(toRun.length * 0.20).toFixed(0)} USD\n`)

  if (toRun.length === 0) {
    console.log('✅ Nothing to do.')
    return
  }

  if (dryRun) {
    console.log('🔍 DRY RUN — posts that would be refreshed:')
    for (const p of toRun) {
      const cat = deriveCategory(p.fullPath)
      console.log(`  [${cat.padEnd(16)}] ${p.fullPath}`)
      console.log(`                   "${p.title}"`)
    }
    console.log(`\n✅ Dry run complete. Run without --dry-run to proceed.`)
    return
  }

  // Confirmation prompt
  console.log(`⚠️  About to refresh ${toRun.length} posts. This will cost ~$${(toRun.length * 0.20).toFixed(0)}.`)
  console.log(`   Press Ctrl+C within 5 seconds to cancel...\n`)
  await new Promise(r => setTimeout(r, 5000))

  let passed = 0, failed = 0

  for (let i = 0; i < toRun.length; i++) {
    const post = toRun[i]
    const cat  = deriveCategory(post.fullPath)
    const pct  = Math.round(((i + 1) / toRun.length) * 100)

    console.log(`\n[${i + 1}/${toRun.length}] (${pct}%) ${post.fullPath}`)
    console.log(`  Topic: "${post.title}"  |  Category: ${cat}`)

    try {
      const cmd = [
        'node scripts/refresh-post.mjs',
        `"--from=${post.fullPath}"`,
        `"--topic=${post.title.replace(/"/g, '\\"')}"`,
        `"--category=${cat}"`,
      ].join(' ')

      execSync(cmd, { stdio: 'inherit', cwd: process.cwd() })

      progress.done.push(post._id)
      passed++
    } catch (err) {
      console.error(`  ❌ Failed: ${err.message}`)
      progress.failed.push({ id: post._id, path: post.fullPath, error: err.message })
      failed++
    }

    saveProgress(progress)

    // Small delay between posts to avoid rate limiting
    if (i < toRun.length - 1) await new Promise(r => setTimeout(r, 2000))
  }

  console.log(`\n${'═'.repeat(60)}`)
  console.log(`✅ Batch complete — ${passed} refreshed, ${failed} failed`)
  if (progress.failed.length > 0) {
    console.log(`\n⚠️  Failed posts saved in .batch-progress.json for retry.`)
  }
  console.log(`📄 Full progress log: .batch-progress.json`)
}

main().catch(err => { console.error(err); process.exit(1) })
