import Link from 'next/link'
import { Search, ArrowRight } from 'lucide-react'

const POPULAR_CATEGORIES = [
  { label: 'AI', href: '/category/ai' },
  { label: 'Technology', href: '/category/technology' },
  { label: 'Business', href: '/category/business' },
  { label: 'Entertainment', href: '/category/entertainment' },
  { label: 'Travel', href: '/category/travel' },
  { label: 'Lifestyle', href: '/category/lifestyle' },
  { label: 'Statistics', href: '/category/statistics' },
  { label: 'Directories', href: '/category/directories' },
]

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-20">
      <div className="max-w-2xl w-full text-center">

        {/* 404 badge */}
        <div className="inline-flex items-center gap-2 bg-brand-red/10 text-brand-red text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-8">
          404 — Page not found
        </div>

        {/* Heading */}
        <h1 className="text-5xl md:text-7xl font-black text-gray-900 mb-4 leading-none">
          Lost in the<br />
          <span className="text-brand-red">#</span> list-iverse
        </h1>

        <p className="text-gray-500 text-lg mb-10 max-w-md mx-auto">
          That page doesn&apos;t exist — maybe it moved, or maybe it never existed. Either way, there&apos;s plenty more to explore.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-14">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand-dark text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-colors"
          >
            Back to Home <ArrowRight size={15} />
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:border-brand-red hover:text-brand-red transition-colors"
          >
            <Search size={15} />
            Search lists
          </Link>
        </div>

        {/* Category shortcuts */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Browse popular categories</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {POPULAR_CATEGORIES.map((cat) => (
              <Link
                key={cat.href}
                href={cat.href}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-full hover:bg-brand-red hover:text-white transition-colors"
              >
                {cat.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
