import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  basePath: string
}

export default function Pagination({ currentPage, totalPages, basePath }: PaginationProps) {
  if (totalPages <= 1) return null

  const pages = []
  const delta = 2

  for (let i = Math.max(1, currentPage - delta); i <= Math.min(totalPages, currentPage + delta); i++) {
    pages.push(i)
  }

  const getHref = (page: number) =>
    page === 1 ? basePath : `${basePath}?page=${page}`

  return (
    <nav className="flex items-center justify-center gap-1.5 mt-10" aria-label="Pagination">
      {currentPage > 1 && (
        <Link
          href={getHref(currentPage - 1)}
          className="flex items-center gap-1 px-3.5 py-2 rounded-full text-sm font-semibold text-gray-600 bg-white border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all"
        >
          <ChevronLeft size={16} />
          Prev
        </Link>
      )}

      {pages[0] > 1 && (
        <>
          <Link href={getHref(1)} className="w-9 h-9 flex items-center justify-center rounded-full text-sm font-semibold text-gray-600 bg-white border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all">
            1
          </Link>
          {pages[0] > 2 && <span className="px-1 text-gray-400">…</span>}
        </>
      )}

      {pages.map((page) => (
        <Link
          key={page}
          href={getHref(page)}
          className={`w-9 h-9 flex items-center justify-center rounded-full text-sm font-bold transition-all ${
            page === currentPage
              ? 'bg-gradient-to-r from-[#E63946] to-[#ff8a5c] text-white shadow-[0_3px_12px_rgba(230,57,70,0.4)]'
              : 'text-gray-600 bg-white border border-gray-200 hover:border-gray-300 hover:shadow-md'
          }`}
          aria-current={page === currentPage ? 'page' : undefined}
        >
          {page}
        </Link>
      ))}

      {pages[pages.length - 1] < totalPages && (
        <>
          {pages[pages.length - 1] < totalPages - 1 && <span className="px-1 text-gray-400">…</span>}
          <Link href={getHref(totalPages)} className="w-9 h-9 flex items-center justify-center rounded-full text-sm font-semibold text-gray-600 bg-white border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all">
            {totalPages}
          </Link>
        </>
      )}

      {currentPage < totalPages && (
        <Link
          href={getHref(currentPage + 1)}
          className="flex items-center gap-1 px-3.5 py-2 rounded-full text-sm font-semibold text-gray-600 bg-white border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all"
        >
          Next
          <ChevronRight size={16} />
        </Link>
      )}
    </nav>
  )
}
