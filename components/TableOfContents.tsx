'use client'

import { useState } from 'react'

interface TocItem {
  id: string
  text: string
}

export default function TableOfContents({ items }: { items: TocItem[] }) {
  const [open, setOpen] = useState(false)

  if (!items.length) return null

  return (
    <>
      {/* Desktop: sticky sidebar — hidden on mobile */}
      <nav className="toc-sidebar-nav hidden lg:block" aria-label="Table of contents">
        <p className="toc-sidebar-heading">📋 In This Article</p>
        <ol>
          {items.map((item) => (
            <li key={item.id}>
              <a href={`#${item.id}`}>{item.text}</a>
            </li>
          ))}
        </ol>
      </nav>

      {/* Mobile: collapsible box — hidden on desktop */}
      <nav className="toc-box lg:hidden" aria-label="Table of contents">
        <button
          className="toc-mobile-toggle"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <strong>📋 In This Article</strong>
          <span className="toc-chevron">{open ? '▲' : '▼'}</span>
        </button>
        {open && (
          <ol className="mt-3">
            {items.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`} onClick={() => setOpen(false)}>{item.text}</a>
              </li>
            ))}
          </ol>
        )}
      </nav>
    </>
  )
}
