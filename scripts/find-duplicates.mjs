#!/usr/bin/env node
/**
 * find-duplicates.mjs — Find posts with identical or very similar titles in Sanity.
 *
 * Groups posts by normalised title, then ranks each group so you can decide:
 *   - Which is the CANONICAL post to keep
 *   - Which are DUPLICATES to refresh or delete
 *
 * Usage:
 *   node scripts/find-duplicates.mjs                    # list all duplicate groups
 *   node scripts/find-duplicates.mjs --min-group=3      # only groups with 3+ duplicates
 *   node scripts/find-duplicates.mjs --export=dupes.json  # save full list to JSON
 *
 * Google Search Console check:
 *   If you export indexed URLs from GSC (as a CSV with a "Top pages" report),
 *   pass it via --gsc=gsc-export.csv and this script will mark which posts
 *   are known to be indexed.
 *
 *   GSC export: Search Console → Search results → Pages → Export → CSV
 */

import { createClient } from '@sanity/client'
import { readFileSync, existsSync, writeFileSync } from 'fs'
import { resolve } from 'path'

// ─── Load .env.local ──────────────────────────────────────────────────────────
const envPath = resolve(process.cwd(), '.env.local')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf-8').replace(/^\uFEFF/, '').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) { const k=m[1].trim(), v=m[2].trim().replace(/^["']|["']$/g,''); if(!process.env[k]) process.env[k]=v }
  }
}

// ─── Args ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const getArg = (name) => { const a = args.find(a => a.startsWith(`--${name}=`)); return a ? a.split('=').slice(1).join('=') : null }
const minGroup  = parseInt(getArg('min-group') || '2', 10)
const exportFile = getArg('export')
const gscFile   = getArg('gsc')

// ─── Sanity client ────────────────────────────────────────────────────────────
const s = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  token: process.env.SANITY_WRITE_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
})

// ─── Normalise title for grouping ─────────────────────────────────────────────
const STOP = new Set(['the','a','an','and','or','in','on','at','to','for','of','by','with'])
const NUM_WORDS = ['one','two','three','four','five','six','seven','eight','nine','ten',
                   'eleven','twelve','thirteen','fourteen','fifteen','twenty','fifty','hundred']

function normaliseTitle(title) {
  return title
    .toLowerCase()
    .replace(/[''`]/g, '')              // smart quotes
    .replace(/[^a-z0-9\s]/g, ' ')      // strip punctuation
    .split(/\s+/)
    .filter(w => w && !STOP.has(w))
    .map(w => {
      // Replace number words AND digits with a placeholder so "5 places" == "five places"
      if (/^\d+$/.test(w) || NUM_WORDS.includes(w)) return '#'
      return w
    })
    .join(' ')
    .trim()
}

// ─── Load GSC indexed URLs if provided ───────────────────────────────────────
const indexedUrls = new Set()
if (gscFile && existsSync(gscFile)) {
  const csv = readFileSync(gscFile, 'utf-8')
  for (const line of csv.split('\n')) {
    // GSC CSV has full URLs like https://allyouneedislists.com/lifestyle/foo
    const match = line.match(/https?:\/\/[^,\s]+(\/[^,\s]*)/)
    if (match) indexedUrls.add(match[1])
  }
  console.log(`✅ Loaded ${indexedUrls.size} indexed URLs from GSC export`)
}

// ─── Fetch all WP-imported posts ──────────────────────────────────────────────
console.log('📦 Fetching posts from Sanity...')
const posts = await s.fetch(
  `*[_type=="post" && defined(wpId)] | order(date asc) {
    _id, title, fullPath, wpId, date,
    "wordCount": length(content),
    "hasImage": defined(featuredImage)
  }`
)
console.log(`   Found ${posts.length} WP-imported posts\n`)

// ─── Group by normalised title ────────────────────────────────────────────────
const groups = {}
for (const p of posts) {
  const key = normaliseTitle(p.title)
  if (!groups[key]) groups[key] = []
  groups[key].push(p)
}

// Keep only groups with duplicates
const dupeGroups = Object.entries(groups)
  .filter(([, g]) => g.length >= minGroup)
  .sort((a, b) => b[1].length - a[1].length)  // biggest groups first

const totalDupes = dupeGroups.reduce((sum, [, g]) => sum + g.length - 1, 0)

console.log(`📊 Summary`)
console.log(`   Groups with ${minGroup}+ similar titles: ${dupeGroups.length}`)
console.log(`   Total redundant posts to clean up:      ${totalDupes}`)
if (gscFile) console.log(`   GSC-indexed URLs loaded:               ${indexedUrls.size}`)
console.log()

// ─── Score each post to pick the canonical ────────────────────────────────────
function scorePost(p) {
  let score = 0
  if (p.wordCount > 2000) score += 3
  else if (p.wordCount > 500) score += 1
  if (p.hasImage) score += 2
  if (gscFile && indexedUrls.has(p.fullPath)) score += 10  // GSC-indexed = keep
  return score
}

// ─── Output ───────────────────────────────────────────────────────────────────
const results = []

for (const [normTitle, group] of dupeGroups) {
  const scored = group.map(p => ({ ...p, score: scorePost(p), gscIndexed: indexedUrls.has(p.fullPath) }))
  scored.sort((a, b) => b.score - a.score)

  const canonical = scored[0]
  const toRedirect = scored.slice(1)

  results.push({ normTitle, canonical, toRedirect })

  console.log(`📄 "${group[0].title}"  (${group.length} copies)`)
  for (const p of scored) {
    const indexed = p.gscIndexed ? ' 🟢 GSC-indexed' : (gscFile ? ' ⚪ not in GSC' : '')
    const words = p.wordCount ? `~${Math.round(p.wordCount/5)}w` : 'no content'
    const img = p.hasImage ? '🖼' : '  '
    const tag = p === canonical ? ' ← KEEP' : ' ← REDIRECT/REMOVE'
    console.log(`   ${img} ${p.fullPath.padEnd(70)} ${words.padStart(7)}${indexed}${tag}`)
  }
  console.log()
}

if (exportFile) {
  writeFileSync(exportFile, JSON.stringify(results, null, 2))
  console.log(`\n💾 Full results saved to ${exportFile}`)
}

// ─── Next steps guidance ──────────────────────────────────────────────────────
console.log(`\n─────────────────────────────────────────────────────────────────`)
console.log(`Next steps:`)
console.log()
if (!gscFile) {
  console.log(`1. Export indexed URLs from Google Search Console:`)
  console.log(`     Search Console → Search results → Pages tab → Export CSV`)
  console.log(`   Then re-run with: node scripts/find-duplicates.mjs --gsc=your-export.csv`)
  console.log(`   This will show which duplicates Google has actually indexed.`)
  console.log()
}
console.log(`${gscFile ? '1' : '2'}. To refresh a duplicate group with new AI content + redirect:`)
console.log(`     node scripts/refresh-post.mjs \\`)
console.log(`       "--from=/old/path1,/old/path2" \\`)
console.log(`       "--topic=Better Title Here" \\`)
console.log(`       "--category=lifestyle"`)
console.log(`   (Do NOT use --delete — keep redirect stubs in Sanity)`)
console.log(`─────────────────────────────────────────────────────────────────`)
