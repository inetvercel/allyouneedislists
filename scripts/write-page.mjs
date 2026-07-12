import { readFileSync, writeFileSync } from 'fs'

const lines = readFileSync('app/page.tsx', 'utf8').split('\n')
const keep  = lines.slice(0, 121).join('\n')   // imports + fmt/strip + new components

const page = `
export default async function HomePage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams
  const page   = Math.max(1, parseInt(params.page || '1', 10))

  if (page > 1) {
    const start = (page - 1) * PER_PAGE
    const end   = start + PER_PAGE
    const [posts, total] = await Promise.all([
      client.fetch(getLatestPostsQuery, { start, end }, { next: { revalidate: 300 } }).catch(() => []),
      client.fetch(getLatestPostsCountQuery, {}, { next: { revalidate: 300 } }).catch(() => 0),
    ])
    return (
      <div className="bg-[#0d0d0d] min-h-screen">
        <div className={\`\${W} mx-auto px-4 py-10\`}>
          <div className="h-[2px] bg-[#E63946]" />
          <div className="border-b border-white/[0.08] pb-3 mb-7 pt-3">
            <h2 className="text-[11px] font-black uppercase tracking-widest text-white">All Lists — Page {page}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post: PostCardType) => <PostCard key={post._id} post={post} />)}
          </div>
          <Pagination currentPage={page} totalPages={Math.ceil(total / PER_PAGE)} basePath="/" />
        </div>
      </div>
    )
  }

  const [latest, sections, total] = await Promise.all([
    client.fetch(getLatestPostsQuery, { start: 0, end: 18 }, { next: { revalidate: 300 } }).catch(() => []),
    client.fetch(getHomepageSectionsQuery, {}, { next: { revalidate: 300 } }).catch(() => ({})),
    client.fetch(getLatestPostsCountQuery, {}, { next: { revalidate: 300 } }).catch(() => 0),
  ])

  const featured  = (latest[0] ?? null) as PostCardType | null
  const heroRows  = latest.slice(1, 6)  as PostCardType[]
  const grid3     = latest.slice(6, 9)  as PostCardType[]
  const grid4     = latest.slice(9, 13) as PostCardType[]
  const sideList  = latest.slice(13, 17) as PostCardType[]
  const S = sections as Record<string, PostCardType[]>

  return (
    <div className="bg-[#0d0d0d] min-h-screen">

      {/* HERO: compact feed left | big featured right */}
      <section className="border-b border-white/[0.08]">
        <div className={\`\${W} mx-auto px-4\`}>
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] min-h-[360px]">
            <div className="border-r border-white/[0.08] py-5 pr-5">
              <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-[#E63946] mb-3 pb-2.5 border-b border-white/[0.07]">
                <Flame size={9} /> Latest
              </div>
              {heroRows.map(p => <HeroRow key={p._id} post={p} />)}
            </div>
            <div className="py-5 pl-0 lg:pl-7">
              {featured && <DarkCard post={featured} size="lg" />}
            </div>
          </div>
        </div>
      </section>

      {/* 3-COL GRID */}
      <section className="border-b border-white/[0.08]">
        <div className={\`\${W} mx-auto px-4 py-6\`}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {grid3.map(p => <DarkCard key={p._id} post={p} />)}
          </div>
        </div>
      </section>

      {/* 2x2 CARDS + STORY SIDEBAR */}
      <section className="border-b border-white/[0.08]">
        <div className={\`\${W} mx-auto px-4 py-6\`}>
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8">
            <div className="grid grid-cols-2 gap-5">
              {grid4.map(p => <DarkCard key={p._id} post={p} size="sm" />)}
            </div>
            <div>
              <div className="h-[2px] bg-[#E63946]" />
              <div className="border-b border-white/[0.08] pt-2.5 pb-2 mb-1">
                <span className="text-[11px] font-black uppercase tracking-[0.14em] text-white">Trending</span>
              </div>
              {sideList.map(p => <HorizontalStory key={p._id} post={p} />)}
            </div>
          </div>
        </div>
      </section>

      {/* TECHNOLOGY */}
      {(S.technology?.length ?? 0) > 0 && (
        <section className="border-b border-white/[0.08]">
          <div className={\`\${W} mx-auto px-4 py-6\`}>
            <SectionHead label="Technology" href="/category/technology" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              {S.technology.map(p => <DarkCard key={p._id} post={p} size="sm" />)}
            </div>
          </div>
        </section>
      )}

      {/* ENTERTAINMENT */}
      {(S.entertainment?.length ?? 0) > 0 && (
        <section className="border-b border-white/[0.08]">
          <div className={\`\${W} mx-auto px-4 py-6\`}>
            <SectionHead label="Entertainment" href="/category/entertainment" />
            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-7">
              <DarkCard post={S.entertainment[0]} size="lg" />
              <div>
                {S.entertainment.slice(1, 4).map(p => <HorizontalStory key={p._id} post={p} />)}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* BUSINESS */}
      {(S.business?.length ?? 0) > 0 && (
        <section className="border-b border-white/[0.08]">
          <div className={\`\${W} mx-auto px-4 py-6\`}>
            <SectionHead label="Business" href="/category/business" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {S.business.slice(0, 3).map(p => <DarkCard key={p._id} post={p} size="sm" />)}
            </div>
          </div>
        </section>
      )}

      {/* AI + LIFESTYLE */}
      {((S.ai?.length ?? 0) > 0 || (S.lifestyle?.length ?? 0) > 0) && (
        <section className="border-b border-white/[0.08]">
          <div className={\`\${W} mx-auto px-4 py-6\`}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {(S.ai?.length ?? 0) > 0 && (
                <div>
                  <SectionHead label="AI Tools" href="/category/ai" />
                  {S.ai.slice(0, 4).map(p => <HorizontalStory key={p._id} post={p} />)}
                </div>
              )}
              {(S.lifestyle?.length ?? 0) > 0 && (
                <div>
                  <SectionHead label="Lifestyle" href="/category/lifestyle" />
                  {S.lifestyle.slice(0, 4).map(p => <HorizontalStory key={p._id} post={p} />)}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* TRAVEL */}
      {(S.travel?.length ?? 0) > 0 && (
        <section className="border-b border-white/[0.08]">
          <div className={\`\${W} mx-auto px-4 py-6\`}>
            <SectionHead label="Travel" href="/category/travel" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              {S.travel.map(p => <DarkCard key={p._id} post={p} size="sm" />)}
            </div>
          </div>
        </section>
      )}

      {/* BROWSE BY CATEGORY */}
      <section className="py-12 bg-[#111]">
        <div className={\`\${W} mx-auto px-4\`}>
          <SectionHead label="Browse by Category" href="/?page=2" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-white/[0.06] mb-6">
            {[
              { slug: 'technology',    name: 'Technology',    emoji: '💻' },
              { slug: 'business',      name: 'Business',      emoji: '💼' },
              { slug: 'entertainment', name: 'Entertainment', emoji: '🎬' },
              { slug: 'ai',            name: 'AI Tools',      emoji: '🤖' },
              { slug: 'lifestyle',     name: 'Lifestyle',     emoji: '🌿' },
              { slug: 'travel',        name: 'Travel',        emoji: '✈️' },
            ].map(c => (
              <Link key={c.slug} href={\`/category/\${c.slug}\`}
                className="flex flex-col items-center gap-2 py-5 px-3 bg-[#111] hover:bg-[#1a1a1a] text-center transition-colors group">
                <span className="text-2xl">{c.emoji}</span>
                <span className="text-[9px] font-black text-gray-500 group-hover:text-gray-200 uppercase tracking-wider">{c.name}</span>
              </Link>
            ))}
          </div>
          <div className="text-center">
            <Link href="/?page=2" className="inline-flex items-center gap-2 px-6 py-2.5 border border-white/[0.12] text-gray-400 hover:border-[#E63946] hover:text-[#E63946] text-xs font-bold transition-colors uppercase tracking-widest">
              Browse All Lists <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}
`

writeFileSync('app/page.tsx', keep + page + '\n')
console.log('Written', (keep + page).length, 'chars')
