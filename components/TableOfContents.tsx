'use client'

import { useState } from 'react'

interface TocItem {
  id: string
  text: string
}

interface Props {
  items: TocItem[]
  variant: 'sidebar' | 'mobile'
}

export default function TableOfContents({ items, variant }: Props) {
  const [open, setOpen] = useState(false)

  if (!items.length) return null

  if (variant === 'sidebar') {
    return (
      <nav className="toc-sidebar-nav" aria-label="Table of contents">
        <p className="toc-sidebar-heading">📋 In This Article</p>
        <ol>
          {items.map((item) => (
            <li key={item.id}>
              <a href={`#${item.id}`}>{item.text}</a>
            </li>
          ))}
        </ol>
      </nav>
    )
  }

  return (
    <nav className="toc-box" aria-label="Table of contents">
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
  )
}
