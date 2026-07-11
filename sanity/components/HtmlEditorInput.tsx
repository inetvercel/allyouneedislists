'use client'

import { useCallback } from 'react'
import { set, unset } from 'sanity'
import type { StringInputProps } from 'sanity'

const SNIPPETS: { label: string; snippet: string }[] = [
  {
    label: '📊 Table',
    snippet: `<table>
  <thead>
    <tr>
      <th>Column 1</th>
      <th>Column 2</th>
      <th>Column 3</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Row 1, Cell 1</td>
      <td>Row 1, Cell 2</td>
      <td>Row 1, Cell 3</td>
    </tr>
    <tr>
      <td>Row 2, Cell 1</td>
      <td>Row 2, Cell 2</td>
      <td>Row 2, Cell 3</td>
    </tr>
  </tbody>
</table>`,
  },
  {
    label: '📦 Info Box',
    snippet: `<div class="info-box">
  <strong>💡 Did you know?</strong>
  <p>Your info here.</p>
</div>`,
  },
  {
    label: '⚠️ Warning Box',
    snippet: `<div class="warning-box">
  <strong>⚠️ Watch out</strong>
  <p>Your warning here.</p>
</div>`,
  },
  {
    label: '✅ Pros/Cons',
    snippet: `<div class="pros-cons">
  <div class="pros">
    <h4>✅ Pros</h4>
    <ul>
      <li>Pro 1</li>
      <li>Pro 2</li>
    </ul>
  </div>
  <div class="cons">
    <h4>❌ Cons</h4>
    <ul>
      <li>Con 1</li>
      <li>Con 2</li>
    </ul>
  </div>
</div>`,
  },
  {
    label: '⚡ Quick Picks',
    snippet: `<div class="quick-picks"><strong>⚡ Quick Picks</strong><ul>
<li>🥇 <strong>Best Overall:</strong> [Item] — [reason]</li>
<li>💰 <strong>Best Value:</strong> [Item] — [reason]</li>
<li>🚀 <strong>Best for Beginners:</strong> [Item] — [reason]</li>
</ul></div>`,
  },
  {
    label: '❓ FAQ',
    snippet: `<div class="faq-section"><h2>Frequently Asked Questions</h2>
<div class="faq-item"><h3>Question here?</h3><p>Answer here in 2-3 sentences.</p></div>
<div class="faq-item"><h3>Another question?</h3><p>Another answer here.</p></div>
</div>`,
  },
  {
    label: '🖼️ Section Image',
    snippet: `<!-- IMAGE: [describe the scene for AI image generation here, 20-30 words] -->`,
  },
  {
    label: '🔗 Related Lists',
    snippet: `<div class="related-lists"><h3>📋 Related Lists You'll Love</h3><ul>
<li><a href="/category/slug">Related List Title</a></li>
<li><a href="/category/slug">Another Related List</a></li>
</ul></div>`,
  },
  {
    label: '<h2>',
    snippet: `<h2>Section Heading</h2>`,
  },
  {
    label: '<h3>',
    snippet: `<h3>Sub-heading</h3>`,
  },
  {
    label: '<ul> list',
    snippet: `<ul>
  <li>Item one</li>
  <li>Item two</li>
  <li>Item three</li>
</ul>`,
  },
  {
    label: '<ol> list',
    snippet: `<ol>
  <li>First item</li>
  <li>Second item</li>
  <li>Third item</li>
</ol>`,
  },
  {
    label: '<blockquote>',
    snippet: `<blockquote><p>"Quote text here."</p><cite>— Source Name</cite></blockquote>`,
  },
]

export function HtmlEditorInput(props: StringInputProps) {
  const { value = '', onChange, elementProps } = props

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const next = e.currentTarget.value
      onChange(next ? set(next) : unset())
    },
    [onChange],
  )

  const insertSnippet = useCallback(
    (snippet: string) => {
      const el = document.getElementById('html-editor-textarea') as HTMLTextAreaElement | null
      if (!el) {
        onChange(set((value || '') + '\n\n' + snippet))
        return
      }
      const start = el.selectionStart ?? (value || '').length
      const end = el.selectionEnd ?? start
      const current = value || ''
      const next = current.slice(0, start) + '\n\n' + snippet + '\n\n' + current.slice(end)
      onChange(set(next))
      setTimeout(() => {
        const pos = start + snippet.length + 4
        el.focus()
        el.setSelectionRange(pos, pos)
      }, 50)
    },
    [value, onChange],
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          padding: '8px',
          background: '#1a1a1a',
          borderRadius: 6,
          border: '1px solid #333',
        }}
      >
        {SNIPPETS.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => insertSnippet(s.snippet)}
            style={{
              padding: '4px 10px',
              fontSize: 12,
              fontWeight: 600,
              background: '#2a2a2a',
              color: '#ddd',
              border: '1px solid #444',
              borderRadius: 4,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.background = '#e53e3e'
              ;(e.currentTarget as HTMLButtonElement).style.color = '#fff'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.background = '#2a2a2a'
              ;(e.currentTarget as HTMLButtonElement).style.color = '#ddd'
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Editor */}
      <textarea
        {...elementProps}
        id="html-editor-textarea"
        value={value}
        onChange={handleChange}
        rows={30}
        spellCheck={false}
        style={{
          width: '100%',
          fontFamily: '"Fira Code", "Cascadia Code", "Consolas", monospace',
          fontSize: 13,
          lineHeight: 1.6,
          padding: 12,
          background: '#0d0d0d',
          color: '#e2e8f0',
          border: '1px solid #333',
          borderRadius: 6,
          resize: 'vertical',
          outline: 'none',
          tabSize: 2,
        }}
      />

      <div style={{ fontSize: 11, color: '#666', textAlign: 'right' }}>
        {(value || '').length.toLocaleString()} chars · ~{Math.round((value || '').length / 5).toLocaleString()} words
      </div>
    </div>
  )
}
