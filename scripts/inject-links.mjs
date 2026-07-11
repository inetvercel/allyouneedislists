#!/usr/bin/env node
/**
 * inject-links.mjs — Inject contextual internal links into existing posts.
 *
 * Sends the post content + list of current AI posts to GPT, which finds
 * 2-4 natural places in the prose to insert a contextual <a> link.
 * Only links to aiGenerated posts (stable URLs).
 *
 * Usage:
 *   node scripts/inject-links.mjs --path="/entertainment/james-bond-villains"
 *   node scripts/inject-links.mjs --all --min-words=800 --limit=20
 *   node scripts/inject-links.mjs --path="..." --dry-run
 */

import OpenAI from 'openai'
import { createClient } from '@sanity/client'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// ─── Load .env.local ──────────────────────────────────────────────────────────
const envPath = resolve(process.cwd(), '.env.local')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf-8').replace(/^\uFEFF/, '').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) { const k=m[1].trim(),v=m[2].trim().replace(/^["']|["']$/g,''); if(!process.env[k]) process.env[k]=v }
  }
}

// ─── Args ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const getArg = (n) => { const a=args.find(a=>a.startsWith(`--${n}=`)); return a?a.split('=').slice(1).join('='):null }
const hasFlag = (n) => args.includes(`--${n}`)

const targetPath = getArg('path')
const runAll    = hasFlag('all')
const minWords  = parseInt(getArg('min-words') || '600', 10)
const limit     = parseInt(getArg('limit') || '10', 10)
const dryRun    = hasFlag('dry-run')

if (!targetPath && !runAll) {
  console.error('Usage: node scripts/inject-links.mjs --path="/some/post" [--dry-run]')
  console.error('       node scripts/inject-links.mjs --all [--min-words=600] [--limit=20]')
  process.exit(1)
}

// ─── Clients ──────────────────────────────────────────────────────────────────
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const sanity  = createClient({ projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID, dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production', token: process.env.SANITY_WRITE_TOKEN, apiVersion: '2024-01-01', useCdn: false })

// ─── Fetch AI posts as link candidates ────────────────────────────────────────
async function fetchAIPosts() {
  return sanity.fetch(
    `*[_type=="post" && aiGenerated==true && !defined(redirectTo)] | order(date desc) { title, fullPath }`,
  ).catch(() => [])
}

// ─── Inject links into one post's HTML via GPT ────────────────────────────────
async function injectLinks(post, aiPosts) {
  if (!aiPosts.length) {
    console.log('  ⚠️  No AI posts available as link candidates — skipping')
    return null
  }

  const candidateList = aiPosts
    .map(p => `- "${p.title}" → https://allyouneedislists.com${p.fullPath}`)
    .join('\n')

  // Truncate content for GPT if very long (keep first 8000 chars to avoid token limits)
  const contentForGPT = post.content.length > 12000
    ? post.content.slice(0, 12000) + '\n<!-- [content truncated for brevity] -->'
    : post.content

  const response = await openai.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [
      {
        role: 'system',
        content: `You are an SEO editor. Your ONLY task is to find 2-4 natural places in an HTML article to insert contextual internal links.

RULES:
- Only link to articles from the provided candidates list — do not invent URLs
- Links must use format: <a href="/path/to-post">descriptive anchor text</a>
  (path only, no domain, no target or rel attributes)
- Insert links within EXISTING sentences — do not add new sentences
- Anchor text should be a natural phrase already in the text, or a slight natural rewording
- Never add more than 1 link per paragraph
- Do not add links in headings, the quick-picks box, faq-section, or related-lists sections
- Return the COMPLETE modified HTML — no commentary, no explanation, no markdown fences`,
      },
      {
        role: 'user',
        content: `ARTICLE HTML:\n${contentForGPT}\n\n---\nCANDIDATE INTERNAL LINKS (choose 2-4 that fit naturally):\n${candidateList}\n\nReturn the complete HTML with links inserted.`,
      },
    ],
    temperature: 0.3,
  })

  const updated = response.choices[0].message.content?.trim()
  if (!updated || updated.length < 100) return null

  // If content was truncated, only patch the first portion
  if (post.content.length > 12000) {
    return updated + post.content.slice(12000)
  }
  return updated
}

// ─── Process one post ─────────────────────────────────────────────────────────
async function processPost(post, aiPosts) {
  console.log(`\n🔗 "${post.title}"`)
  console.log(`   ${post.fullPath}`)

  const updated = await injectLinks(post, aiPosts)
  if (!updated) return false

  // Count how many links were added
  const before = (post.content.match(/<a\s[^>]*href="\/[^"]*"/g) || []).length
  const after  = (updated.match(/<a\s[^>]*href="\/[^"]*"/g) || []).length
  const added  = after - before

  if (added <= 0) {
    console.log(`  ℹ️  No new links added (GPT found no natural fit)`)
    return false
  }

  console.log(`  ✅ ${added} contextual link(s) added`)

  if (dryRun) {
    console.log(`  🔍 DRY RUN — not saving`)
    return true
  }

  await sanity.patch(post._id).set({ content: updated }).commit()
  console.log(`  💾 Saved to Sanity`)
  return true
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🔗 inject-links.mjs  [${dryRun ? 'DRY RUN' : 'LIVE'}]`)

  const aiPosts = await fetchAIPosts()
  console.log(`   ${aiPosts.length} AI posts available as link candidates`)
  if (aiPosts.length === 0) {
    console.error('❌ No AI posts found. Generate some posts first.')
    process.exit(1)
  }

  let posts = []

  if (targetPath) {
    const p = await sanity.fetch(
      `*[_type=="post" && fullPath==$path][0] { _id, title, fullPath, content }`,
      { path: targetPath }
    )
    if (!p) { console.error(`❌ Post not found: ${targetPath}`); process.exit(1) }
    posts = [p]
  } else {
    // --all mode: WP posts above word threshold, not already AI, no redirect
    posts = await sanity.fetch(
      `*[_type=="post" && aiGenerated!=true && !defined(redirectTo) && length(content) > ${minWords * 5}] | order(length(content) desc) [0...${limit}] { _id, title, fullPath, content }`
    )
    console.log(`   Found ${posts.length} posts to process\n`)
  }

  let updated = 0
  for (const post of posts) {
    const ok = await processPost(post, aiPosts)
    if (ok) updated++
    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 800))
  }

  console.log(`\n✅ Done — ${updated}/${posts.length} posts updated with contextual links`)
}

main().catch(err => { console.error(err); process.exit(1) })
