/**
 * delete-junk.mjs — Identify and optionally delete worthless WP posts.
 *
 * Safe rules:
 *  - Never deletes AI-generated posts
 *  - Never deletes redirect stubs (posts with redirectTo set) — those handle 301s
 *  - Requires --confirm to actually delete anything
 *
 * Usage:
 *   node scripts/delete-junk.mjs            # Preview only
 *   node scripts/delete-junk.mjs --confirm  # Actually delete
 */
import { createClient } from '@sanity/client'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const envPath = resolve(process.cwd(), '.env.local')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf-8').replace(/^\uFEFF/, '').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) { const k=m[1].trim(),v=m[2].trim().replace(/^["']|["']$/g,''); if(!process.env[k]) process.env[k]=v }
  }
}

const confirm = process.argv.includes('--confirm')

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  token: process.env.SANITY_WRITE_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
})

// ─── Junk detection rules ─────────────────────────────────────────────────────
const JUNK_RULES = [
  {
    label: 'Empty / stub page',
    test: p => (p.chars || 0) < 200 && !p.aiGenerated && !p.redirectTo,
  },
  {
    label: 'Pagination / archive stub',
    test: p => /^\/(20\d\d(-\d+)?|page\/\d+)\/?$/.test(p.fullPath || '') && !p.redirectTo,
  },
  {
    label: 'Product listing page',
    test: p => (p.fullPath || '').startsWith('/product/') && !p.redirectTo,
  },
  {
    label: 'Wallpaper gallery',
    test: p => (p.fullPath || '').includes('wallpaper') && !p.aiGenerated && !p.redirectTo,
  },
  {
    label: 'iPad wallpaper / image dump',
    test: p => /ipad.wallpaper|desktop.wallpaper|hd.wallpaper/i.test(p.title || '') && !p.aiGenerated && !p.redirectTo,
  },
  {
    label: 'Dead tech (Flash / Arras / Blog Engage / Usenet)',
    test: p => /flash game|arras theme|blog engage|usenet|newsgroup/i.test(p.title || '') && !p.aiGenerated && !p.redirectTo,
  },
  {
    label: 'Dated event (Q1-Q4 year, specific month)',
    test: p => /\b(q[1-4] 20(0[5-9]|1[0-6]))\b|\b(january|february|march|april|may|june|july|august|september|october|november|december) 20(0[5-9]|1[0-5])\b/i.test(p.title || '') && !p.aiGenerated && !p.redirectTo,
  },
  {
    label: 'WordPress-specific (themes of month/year)',
    test: p => /wordpress (theme|plugin).*(of |20(0[5-9]|1[0-6]))/i.test(p.title || '') && !p.aiGenerated && !p.redirectTo,
  },
  {
    label: 'Subscription/admin page',
    test: p => /^\/(subscri|admin|login|register|suggest-a-list|contact-old)/i.test(p.fullPath || '') && !p.redirectTo,
  },
  {
    label: 'Duplicate "list of all" stub (< 300 chars, superseded)',
    test: p => (p.chars || 0) < 300 && /list of all/i.test(p.title || '') && !p.aiGenerated && !p.redirectTo,
  },
  {
    label: 'Broken /n/a path',
    test: p => (p.fullPath || '').includes('/n/a') && !p.redirectTo,
  },
]

// ─── Main ─────────────────────────────────────────────────────────────────────
console.log('\n🔍 Fetching all posts...')
const all = await sanity.fetch(
  `*[_type=="post"] { _id, title, fullPath, "chars": length(content), aiGenerated, redirectTo }`
)
console.log(`   ${all.length} total posts\n`)

// Group by rule
const groups = JUNK_RULES.map(rule => ({
  ...rule,
  posts: all.filter(rule.test),
})).filter(g => g.posts.length > 0)

const allJunk = [...new Map(groups.flatMap(g => g.posts).map(p => [p._id, p])).values()]

// ─── Report ───────────────────────────────────────────────────────────────────
let total = 0
for (const group of groups) {
  console.log(`🗑  ${group.label} — ${group.posts.length} post(s)`)
  console.log('   ' + '─'.repeat(68))
  for (const p of group.posts) {
    const words = Math.round((p.chars || 0) / 5)
    console.log(`   ${String(words).padStart(5)}w  ${p.fullPath}`)
    if (p.title) console.log(`          "${p.title.slice(0, 70)}"`)
  }
  console.log()
  total += group.posts.length
}

console.log(`═`.repeat(72))
console.log(`  Total to delete: ${allJunk.length} posts`)
console.log(`  (${all.filter(p => p.aiGenerated).length} AI posts + ${all.filter(p => p.redirectTo).length} redirect stubs are protected)`)
console.log()

if (!confirm) {
  console.log(`👆 Preview only. Run with --confirm to permanently delete these posts.`)
  console.log(`   node scripts/delete-junk.mjs --confirm\n`)
  process.exit(0)
}

// ─── Delete ───────────────────────────────────────────────────────────────────
console.log(`\n⚠️  Deleting ${allJunk.length} posts in 5 seconds — Ctrl+C to cancel...\n`)
await new Promise(r => setTimeout(r, 5000))

let deleted = 0, failed = 0
for (const post of allJunk) {
  try {
    await sanity.delete(post._id)
    console.log(`  ✅ Deleted: ${post.fullPath}`)
    deleted++
  } catch (err) {
    console.error(`  ❌ Failed:  ${post.fullPath} — ${err.message}`)
    failed++
  }
}

console.log(`\n✅ Done — ${deleted} deleted, ${failed} failed`)
