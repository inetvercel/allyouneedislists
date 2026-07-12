import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'
import { client } from '@/sanity/lib/client'
import { getAboutStatsQuery } from '@/sanity/lib/queries'
import { catColor } from '@/components/DarkCard'
import { LogoMark } from '@/components/Logo'

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Our mission is to organise the world\'s information into the internet\'s most useful lists.',
}

const W = 'max-w-[1380px]'

const listTypes = [
  'Rankings', 'Comparisons', 'Best-of guides', 'Statistics',
  'Resources', 'Directories', 'Timelines', 'Checklists',
  'Collections', 'Ultimate lists',
]

interface AboutStats {
  totalPosts: number
  totalCategories: number
  categories: { name: string; slug: string; count: number }[]
}

export default async function AboutPage() {
  const stats = await client
    .fetch<AboutStats>(getAboutStatsQuery, {}, { next: { revalidate: 300 } })
    .catch(() => ({ totalPosts: 0, totalCategories: 0, categories: [] }))

  return (
    <div className={`${W} mx-auto px-4 py-2`}>

      {/* Floating dark hero */}
      <div className="relative overflow-hidden rounded-3xl bg-[#151515] border border-white/[0.06] shadow-2xl shadow-black/30 px-6 md:px-10 py-12 md:py-16 mb-8 text-center">
        <div className="absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full opacity-[0.15] blur-3xl pointer-events-none bg-[#E63946]" />
        <div className="absolute -bottom-24 -right-24 w-[420px] h-[420px] rounded-full opacity-[0.1] blur-3xl pointer-events-none bg-[#38bdf8]" />
        <div className="relative max-w-2xl mx-auto">
          <div className="flex justify-center mb-6">
            <LogoMark size={48} />
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white leading-tight mb-4">
            About All You Need Is Lists
          </h1>
          <p className="text-lg md:text-xl font-medium text-gray-400 leading-snug mb-8">
            Organising the world&apos;s information,<br className="hidden md:block" /> one list at a time.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <span className="px-4 py-2 rounded-full bg-white/[0.06] text-white text-sm font-bold">
              {stats.totalPosts.toLocaleString()}+ curated lists
            </span>
            <span className="px-4 py-2 rounded-full bg-white/[0.06] text-white text-sm font-bold">
              {stats.totalCategories} live categories
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto pb-16">

        {/* Intro */}
        <div className="mb-12">
          <p className="text-lg text-gray-600 leading-relaxed mb-4">
            The internet contains more information than ever before—but finding the <em>best</em> answers isn&apos;t always easy.
          </p>
          <p className="text-lg text-gray-600 leading-relaxed mb-6">
            At All You Need Is Lists, our mission is simple:
          </p>
          <blockquote className="border-l-4 border-[#E63946] pl-6 py-1 my-8">
            <p className="text-xl font-bold text-gray-900 leading-snug">
              To organise the world&apos;s information into the internet&apos;s most useful lists.
            </p>
          </blockquote>
          <p className="text-lg text-gray-600 leading-relaxed">
            Whether you&apos;re looking for the best AI tools, travel destinations, business resources, statistics, software, or just curious about a topic — we aim to save you time by bringing everything together in one place.
          </p>
        </div>

        {/* What makes a great list */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.05)] p-8 mb-12">
          <h2 className="text-xl font-black text-gray-900 mb-5">We believe a great list should do more than rank things.</h2>
          <div className="space-y-3">
            {['It should explain.', 'It should compare.', 'It should help people make better decisions.'].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#E63946] to-[#ff8a5c] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check size={12} className="text-white" strokeWidth={3} />
                </div>
                <p className="text-gray-700 font-medium">{item}</p>
              </div>
            ))}
          </div>
          <p className="text-gray-600 mt-5">
            That&apos;s why every list is designed to be <strong>clear</strong>, <strong>accurate</strong>, <strong>regularly updated</strong>, and <strong>genuinely useful</strong>.
          </p>
        </div>

        {/* Vision */}
        <div className="mb-12">
          <h2 className="text-2xl font-black text-gray-900 mb-5">Our Vision</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            We want to build the world&apos;s largest collection of curated lists.
          </p>
          <p className="text-gray-600 leading-relaxed mb-4">
            Not by publishing thousands of low-quality articles, but by creating a growing library of trusted resources that people return to whenever they want the best information on a topic.
          </p>
          <p className="text-lg font-bold text-gray-900 mt-6">
            If it&apos;s worth listing — you&apos;ll find it here.
          </p>
        </div>

        {/* What you'll find */}
        <div className="mb-12">
          <h2 className="text-2xl font-black text-gray-900 mb-6">What You&apos;ll Find</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
            {listTypes.map((type) => (
              <div
                key={type}
                className="bg-white border border-gray-100 shadow-sm rounded-2xl px-4 py-3 text-sm font-semibold text-gray-700 text-center hover:border-[#E63946]/40 hover:text-[#E63946] hover:shadow-md transition-all"
              >
                {type}
              </div>
            ))}
          </div>

          {stats.categories.length > 0 && (
            <>
              <p className="text-gray-600 mb-4 font-medium">Across {stats.totalCategories} live categories, including:</p>
              <div className="flex flex-wrap gap-2">
                {stats.categories.map((cat) => (
                  <Link
                    key={cat.slug}
                    href={`/category/${cat.slug}`}
                    className="flex items-center gap-1.5 text-white text-xs font-bold px-3.5 py-2 rounded-full hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: catColor(cat.slug) }}
                  >
                    {cat.name}
                    <span className="opacity-70 font-semibold">{cat.count}</span>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Built for humans */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.05)] p-8 mb-12">
          <h2 className="text-2xl font-black text-gray-900 mb-5">Built for Humans First</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            Every list starts with one question:
          </p>
          <p className="text-xl font-bold text-[#E63946] mb-6">
            &ldquo;Would this genuinely help someone?&rdquo;
          </p>
          <p className="text-gray-600 leading-relaxed mb-3">
            Our goal isn&apos;t simply to publish more content. It&apos;s to publish <em>better</em> content.
          </p>
          <p className="text-gray-600 leading-relaxed">
            We continuously improve our articles, add new discoveries, update rankings, and expand existing collections to keep information as useful as possible.
          </p>
        </div>

        {/* Looking ahead */}
        <div className="mb-16">
          <h2 className="text-2xl font-black text-gray-900 mb-5">Looking Ahead</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            We&apos;re building more than a website — a searchable knowledge library where anyone can quickly discover curated information on almost any topic.
          </p>
          <p className="text-gray-600 leading-relaxed mb-6">
            As the collection grows, so does our mission:
          </p>
          <p className="text-xl font-black text-gray-900">
            To become the internet&apos;s home for lists.
          </p>
        </div>

        {/* CTA */}
        <div className="relative overflow-hidden rounded-3xl bg-[#151515] p-10 text-center text-white">
          <div className="absolute -bottom-16 -right-16 w-64 h-64 rounded-full opacity-[0.15] blur-3xl pointer-events-none bg-[#E63946]" />
          <p className="relative text-2xl font-black mb-1">Everything worth knowing.</p>
          <p className="relative text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#E63946] to-[#ff8a5c] mb-7">One list at a time.</p>
          <Link
            href="/"
            className="relative inline-flex items-center gap-2 bg-gradient-to-r from-[#E63946] to-[#ff8a5c] hover:shadow-[0_6px_20px_rgba(230,57,70,0.5)] text-white font-bold px-8 py-3.5 rounded-full transition-shadow"
          >
            Explore the Lists <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  )
}
