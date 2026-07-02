import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Our mission is to organise the world\'s information into the internet\'s most useful lists.',
}

const categories = [
  'AI', 'Technology', 'Business', 'Gaming', 'Entertainment',
  'Travel', 'Lifestyle', 'Finance', 'Education', 'Health', 'Sports',
]

const listTypes = [
  'Rankings', 'Comparisons', 'Best-of guides', 'Statistics',
  'Resources', 'Directories', 'Timelines', 'Checklists',
  'Collections', 'Ultimate lists',
]

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">

      {/* Manifesto hero */}
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 mb-6">
          <div className="w-10 h-10 bg-brand-red rounded-lg flex items-center justify-center font-black text-white text-xl">
            #
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-gray-900 leading-tight mb-6">
          About All You Need Is Lists
        </h1>
        <p className="text-xl md:text-2xl font-medium text-brand-red leading-snug">
          Organising the world&apos;s information,<br className="hidden md:block" /> one list at a time.
        </p>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4 mb-12">
        <div className="h-px flex-1 bg-gray-200" />
        <div className="h-1.5 w-1.5 rounded-full bg-brand-red" />
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      {/* Intro */}
      <div className="prose-section mb-12">
        <p className="text-lg text-gray-600 leading-relaxed mb-4">
          The internet contains more information than ever before—but finding the <em>best</em> answers isn&apos;t always easy.
        </p>
        <p className="text-lg text-gray-600 leading-relaxed mb-6">
          At All You Need Is Lists, our mission is simple:
        </p>
        <blockquote className="border-l-4 border-brand-red pl-6 py-1 my-8">
          <p className="text-xl font-bold text-gray-900 leading-snug">
            To organise the world&apos;s information into the internet&apos;s most useful lists.
          </p>
        </blockquote>
        <p className="text-lg text-gray-600 leading-relaxed">
          Whether you&apos;re looking for the best AI tools, movies in chronological order, travel destinations, business resources, statistics, games, software, or just curious about a topic — we aim to save you time by bringing everything together in one place.
        </p>
      </div>

      {/* What makes a great list */}
      <div className="bg-gray-50 rounded-2xl p-8 mb-12">
        <h2 className="text-xl font-black text-gray-900 mb-5">We believe a great list should do more than rank things.</h2>
        <div className="space-y-3">
          {['It should explain.', 'It should compare.', 'It should help people make better decisions.'].map((item) => (
            <div key={item} className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-brand-red flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
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
          Not by publishing thousands of low-quality articles...
        </p>
        <p className="text-gray-600 leading-relaxed mb-4">
          ...but by creating a growing library of trusted resources that people return to whenever they want the best information on a topic.
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
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 text-center hover:border-brand-red hover:text-brand-red transition-colors"
            >
              {type}
            </div>
          ))}
        </div>

        <p className="text-gray-600 mb-4 font-medium">Across topics including:</p>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <span
              key={cat}
              className="bg-brand-dark text-white text-xs font-bold px-3 py-1.5 rounded-full"
            >
              {cat}
            </span>
          ))}
          <span className="bg-gray-100 text-gray-500 text-xs font-bold px-3 py-1.5 rounded-full">
            And much more.
          </span>
        </div>
      </div>

      {/* Built for humans */}
      <div className="border border-gray-200 rounded-2xl p-8 mb-12">
        <h2 className="text-2xl font-black text-gray-900 mb-5">Built for Humans First</h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          Every list starts with one question:
        </p>
        <p className="text-xl font-bold text-brand-red mb-6">
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
          We&apos;re building more than a website.
        </p>
        <p className="text-gray-600 leading-relaxed mb-4">
          We&apos;re building a searchable knowledge library where anyone can quickly discover curated information on almost any topic.
        </p>
        <p className="text-gray-600 leading-relaxed mb-6">
          As the collection grows, so does our mission:
        </p>
        <p className="text-xl font-black text-gray-900">
          To become the internet&apos;s home for lists.
        </p>
      </div>

      {/* CTA */}
      <div className="bg-brand-dark rounded-2xl p-8 text-center text-white">
        <p className="text-2xl font-black mb-2">Everything worth knowing.</p>
        <p className="text-2xl font-black text-brand-red mb-6">One list at a time.</p>
        <Link
          href="/"
          className="inline-block bg-brand-red hover:bg-red-700 text-white font-bold px-8 py-3 rounded-xl transition-colors"
        >
          Explore the Lists
        </Link>
      </div>
    </div>
  )
}
