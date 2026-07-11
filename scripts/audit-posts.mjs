/**
 * audit-posts.mjs — Categorise every post as KEEP / REFRESH / DELETE
 * and output a prioritised plan with time + cost estimates.
 *
 * Usage: node scripts/audit-posts.mjs [--csv]
 */
import { createClient } from '@sanity/client'
import { readFileSync, existsSync, writeFileSync } from 'fs'
import { resolve } from 'path'

const envPath = resolve(process.cwd(), '.env.local')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf-8').replace(/^\uFEFF/, '').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) { const k=m[1].trim(),v=m[2].trim().replace(/^["']|["']$/g,''); if(!process.env[k]) process.env[k]=v }
  }
}

const toCsv = process.argv.includes('--csv')

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  token: process.env.SANITY_WRITE_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
})

// ─── Scoring heuristics ───────────────────────────────────────────────────────

// Patterns that indicate a post is already AI-generated or high quality
const KEEP_PATTERNS = [
  /^list of all/i,
  /complete list/i,
  /all .{3,30} (movies|films|episodes|seasons|games|songs|albums|flavou?rs|characters|villains)/i,
  /every .{3,30} (movie|film|game|song|album)/i,
  /in (chronological|release) order/i,
]

// Patterns that indicate stale/junk content
const DELETE_PATTERNS = [
  /\b(q[1-4] 20(0[5-9]|1[0-5]))\b/i,          // Q3 2010 etc
  /\b20(0[5-9]|1[0-4])\b.*\b(release|launch|announce|keynote)\b/i,
  /\b(release|launch|games?).*(q[1-4] 20|20(0[5-9]|1[0-4]))/i,
  /\battachment\b/i,
  /\/\d+$/,                                     // pagination stub
]

const STALE_YEAR = /\b(20(0[5-9]|1[0-6]))\b/   // mentions 2005–2016

function score(post) {
  const title   = post.title || ''
  const path    = post.fullPath || ''
  const chars   = post.chars || 0
  const words   = Math.round(chars / 5)
  const isAI    = !!post.aiGenerated
  const hasRedir= !!post.redirectTo

  // Already handled
  if (isAI)     return { action: 'SKIP', reason: 'Already AI-generated', words }
  if (hasRedir) return { action: 'SKIP', reason: 'Already a redirect stub', words }

  // Junk / delete
  if (chars < 500)                              return { action: 'DELETE', reason: 'Thin (<100w)', words }
  if (DELETE_PATTERNS.some(r => r.test(title))) return { action: 'DELETE', reason: 'Dated event content', words }
  if (DELETE_PATTERNS.some(r => r.test(path)))  return { action: 'DELETE', reason: 'Junk URL pattern', words }

  // High-value — worth keeping as-is (inject links later)
  if (words >= 3000 && KEEP_PATTERNS.some(r => r.test(title))) {
    return { action: 'KEEP', reason: `Comprehensive reference (${words.toLocaleString()}w)`, words }
  }
  if (words >= 5000) {
    return { action: 'KEEP', reason: `Very long — review manually (${words.toLocaleString()}w)`, words }
  }

  // Stale year in title but decent length → refresh
  if (STALE_YEAR.test(title) && words < 3000) {
    return { action: 'REFRESH', reason: 'Stale year in title', words }
  }

  // Default — refresh
  const reason = words < 500 ? 'Very thin' : words < 1500 ? 'Short content' : 'Standard WP post'
  return { action: 'REFRESH', reason, words }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
console.log('\n📊 Fetching all posts from Sanity...')
const posts = await sanity.fetch(
  `*[_type=="post"] { _id, title, fullPath, "chars": length(content), aiGenerated, redirectTo, date }`
)
console.log(`   ${posts.length} posts found\n`)

const results = posts.map(p => ({ ...p, ...score(p) }))

const buckets = {
  SKIP:    results.filter(r => r.action === 'SKIP'),
  KEEP:    results.filter(r => r.action === 'KEEP'),
  REFRESH: results.filter(r => r.action === 'REFRESH').sort((a,b) => b.words - a.words),
  DELETE:  results.filter(r => r.action === 'DELETE'),
}

// ─── Summary table ────────────────────────────────────────────────────────────
const pad = (s, n) => String(s).padEnd(n)
const lpad = (s, n) => String(s).padStart(n)

console.log('═'.repeat(72))
console.log(' AUDIT SUMMARY')
console.log('═'.repeat(72))
console.log(pad('Action', 10) + lpad('Count', 8) + '   Notes')
console.log('─'.repeat(72))
console.log(pad('SKIP',    10) + lpad(buckets.SKIP.length,    8) + '   Already AI or redirected')
console.log(pad('KEEP',    10) + lpad(buckets.KEEP.length,    8) + '   Long/comprehensive — inject links only')
console.log(pad('REFRESH', 10) + lpad(buckets.REFRESH.length, 8) + '   Replace with AI content')
console.log(pad('DELETE',  10) + lpad(buckets.DELETE.length,  8) + '   Junk / thin / dated events')
console.log('─'.repeat(72))
console.log(pad('TOTAL',   10) + lpad(posts.length,           8))
console.log()

// ─── Time & cost estimate ─────────────────────────────────────────────────────
const toRefresh = buckets.REFRESH.length
const secPerPost = 50        // content gen + 3 images
const costPerPost = 0.20     // USD — GPT content + 3 images
const parallelism = 1        // sequential (1 at a time) to be safe
const totalSec = toRefresh * secPerPost / parallelism
const hours = Math.floor(totalSec / 3600)
const mins  = Math.floor((totalSec % 3600) / 60)

console.log('⏱  TIME & COST ESTIMATE (refresh queue)')
console.log('─'.repeat(72))
console.log(`   Posts to refresh:    ${toRefresh}`)
console.log(`   ~50 sec per post:    ${hours}h ${mins}m total (sequential)`)
console.log(`   API cost estimate:   ~$${(toRefresh * costPerPost).toFixed(0)} USD`)
console.log()

// ─── KEEP list ────────────────────────────────────────────────────────────────
console.log('✅ KEEP — high-value posts (run inject-links on these instead)')
console.log('─'.repeat(72))
for (const p of buckets.KEEP.sort((a,b) => b.words - a.words)) {
  console.log(`  ${lpad(p.words.toLocaleString(), 7)}w  ${p.fullPath}`)
  console.log(`           "${p.title}"`)
}
console.log()

// ─── DELETE list (top 20) ─────────────────────────────────────────────────────
console.log(`🗑  DELETE — ${buckets.DELETE.length} junk posts (top 20 shown)`)
console.log('─'.repeat(72))
for (const p of buckets.DELETE.slice(0, 20)) {
  console.log(`  ${pad(p.reason, 28)}  ${p.fullPath}`)
}
if (buckets.DELETE.length > 20) console.log(`  ... and ${buckets.DELETE.length - 20} more`)
console.log()

// ─── Top REFRESH candidates ───────────────────────────────────────────────────
console.log(`🔄 REFRESH — top 20 by word count (${buckets.REFRESH.length} total)`)
console.log('─'.repeat(72))
for (const p of buckets.REFRESH.slice(0, 20)) {
  console.log(`  ${lpad(p.words.toLocaleString(), 7)}w  ${p.fullPath}`)
  console.log(`           "${p.title}"`)
}
if (buckets.REFRESH.length > 20) console.log(`  ... and ${buckets.REFRESH.length - 20} more`)
console.log()

// ─── Optional CSV export ──────────────────────────────────────────────────────
if (toCsv) {
  const rows = ['action,words,path,title,reason']
  for (const r of results) {
    const safe = (s) => `"${String(s||'').replace(/"/g,'""')}"`
    rows.push([r.action, r.words, safe(r.fullPath), safe(r.title), safe(r.reason)].join(','))
  }
  writeFileSync('audit-results.csv', rows.join('\n'))
  console.log('📄 Full results written to audit-results.csv')
}
