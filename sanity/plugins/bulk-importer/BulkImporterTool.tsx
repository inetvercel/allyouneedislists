import { useState, useCallback, useId } from 'react'
import type { FormEvent } from 'react'
import {
  Box, Button, Card, Flex, Select, Spinner,
  Stack, Text, Badge, Heading, TextInput, TextArea,
} from '@sanity/ui'
import {
  AddIcon, TrashIcon, SparklesIcon,
  CheckmarkCircleIcon, ErrorOutlineIcon, LaunchIcon, UploadIcon,
} from '@sanity/icons'

const CATEGORIES = [
  { value: 'ai', label: 'AI' },
  { value: 'technology', label: 'Technology' },
  { value: 'business', label: 'Business' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'travel', label: 'Travel' },
  { value: 'lifestyle', label: 'Lifestyle' },
  { value: 'statistics', label: 'Statistics' },
  { value: 'directories', label: 'Directories' },
]

const CAT_TONE: Record<string, 'primary' | 'positive' | 'caution' | 'critical' | 'default'> = {
  ai: 'primary', technology: 'primary', business: 'caution',
  entertainment: 'positive', travel: 'positive', lifestyle: 'default',
  statistics: 'default', directories: 'default',
}

type RowStatus = 'idle' | 'generating' | 'done' | 'error'

interface Row {
  id: string
  title: string
  category: string
  rawContent: string
  links: string
  status: RowStatus
  log: string
  url?: string
  expanded: boolean
}

function makeRow(overrides: Partial<Row> = {}): Row {
  return {
    id: `row-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
    title: '', category: 'technology', rawContent: '', links: '',
    status: 'idle', log: '', expanded: true,
    ...overrides,
  }
}

export function BulkImporterTool() {
  const [rows, setRows] = useState<Row[]>([makeRow()])
  const [pasteMode, setPasteMode] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [pasteError, setPasteError] = useState('')
  const uid = useId()

  const updateRow = useCallback((id: string, patch: Partial<Row>) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
  }, [])

  const addRow = () => setRows(prev => [...prev, makeRow()])
  const removeRow = (id: string) => setRows(prev => prev.filter(r => r.id !== id))
  const toggleRow = (id: string) => setRows(prev => prev.map(r => r.id === id ? { ...r, expanded: !r.expanded } : r))

  // Parse pasted CSV / plain list
  const parsePaste = () => {
    setPasteError('')
    const lines = pasteText.trim().split('\n').filter(l => l.trim())
    if (!lines.length) { setPasteError('Nothing to parse'); return }

    const newRows: Row[] = []
    for (const line of lines) {
      // Support: "title | category" or "title,category" or just "title"
      const parts = line.split(/\s*[|,]\s*/)
      const title = parts[0]?.trim()
      if (!title) continue
      const category = parts[1]?.trim().toLowerCase() || 'technology'
      const notes = parts.slice(2).join(' ').trim()
      newRows.push(makeRow({ title, category, rawContent: notes }))
    }

    if (!newRows.length) { setPasteError('No valid rows found'); return }
    setRows(newRows)
    setPasteMode(false)
    setPasteText('')
  }

  const idleRows = rows.filter(r => r.status === 'idle' && r.title.trim())
  const generating = rows.some(r => r.status === 'generating')
  const doneCount = rows.filter(r => r.status === 'done').length
  const errorCount = rows.filter(r => r.status === 'error').length

  const generateAll = async () => {
    const queue = rows.filter(r => r.status === 'idle' && r.title.trim())
    for (const row of queue) {
      updateRow(row.id, { status: 'generating', log: '⏳ Starting...' })

      const linkArr = row.links.split('\n').map(l => l.trim()).filter(Boolean)

      try {
        const res = await fetch('/api/bulk-import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: row.title,
            category: row.category,
            rawContent: row.rawContent,
            links: linkArr,
          }),
        })

        if (!res.body) throw new Error('No response stream')
        const reader = res.body.getReader()
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value)
          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data: ')) continue
            try {
              const evt = JSON.parse(line.slice(6))
              if (evt.type === 'log') {
                updateRow(row.id, { log: evt.message })
              }
              if (evt.type === 'done') {
                updateRow(row.id, {
                  status: evt.success ? 'done' : 'error',
                  url: evt.url,
                  log: evt.success ? '✅ Published!' : evt.error ?? 'Failed',
                })
              }
            } catch { /* ignore */ }
          }
        }
      } catch (err: unknown) {
        updateRow(row.id, {
          status: 'error',
          log: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }
  }

  return (
    <Box padding={4} style={{ maxWidth: 960, margin: '0 auto' }}>
      <Stack space={5}>

        {/* Header */}
        <Flex align="center" gap={3}>
          <UploadIcon style={{ fontSize: 28, color: '#E63946' }} />
          <Stack space={1}>
            <Heading size={3}>Bulk Post Importer</Heading>
            <Text muted size={1}>
              Paste your lists with content, links & notes — AI formats everything, generates images, publishes automatically
            </Text>
          </Stack>
        </Flex>

        {/* Toolbar */}
        <Flex align="center" justify="space-between" gap={2} style={{ flexWrap: 'wrap' }}>
          <Flex gap={2} align="center">
            <Text size={1} muted>{rows.length} post{rows.length !== 1 ? 's' : ''} queued</Text>
            {doneCount > 0 && <Badge tone="positive">{doneCount} published</Badge>}
            {errorCount > 0 && <Badge tone="critical">{errorCount} failed</Badge>}
          </Flex>
          <Flex gap={2}>
            <Button
              icon={SparklesIcon}
              text={pasteMode ? 'Cancel paste' : '📋 Paste list'}
              mode="ghost"
              fontSize={1}
              padding={2}
              onClick={() => { setPasteMode(!pasteMode); setPasteError('') }}
            />
            <Button icon={AddIcon} text="Add row" mode="ghost" fontSize={1} padding={2} onClick={addRow} disabled={generating} />
            <Button
              icon={SparklesIcon}
              text={generating ? 'Generating…' : `Generate all (${idleRows.length})`}
              tone="positive"
              disabled={idleRows.length === 0 || generating}
              onClick={generateAll}
            />
          </Flex>
        </Flex>

        {/* Paste mode */}
        {pasteMode && (
          <Card padding={4} radius={3} shadow={1}>
            <Stack space={3}>
              <Text size={2} weight="semibold">Paste your list</Text>
              <Text size={1} muted>
                One post per line. Format: <code>Title | category | optional notes</code><br />
                Example: <code>Best React Frameworks | technology | Include Next.js Remix Astro</code>
              </Text>
              <TextArea
                value={pasteText}
                onChange={(e: FormEvent<HTMLTextAreaElement>) => setPasteText((e.currentTarget as HTMLTextAreaElement).value)}
                rows={8}
                placeholder={`Best JavaScript Frameworks | technology | Include React, Vue, Angular, Svelte\nTop Travel Destinations Europe | travel | Focus on budget travel\nBest AI Writing Tools 2024 | ai | GPT-4 Claude Gemini compared`}
                style={{ fontFamily: 'monospace', fontSize: 13 }}
              />
              {pasteError && <Text size={1} style={{ color: '#e05c4b' }}>{pasteError}</Text>}
              <Flex gap={2}>
                <Button text="Import rows" tone="primary" onClick={parsePaste} disabled={!pasteText.trim()} />
                <Button text="Cancel" mode="ghost" onClick={() => { setPasteMode(false); setPasteError('') }} />
              </Flex>
            </Stack>
          </Card>
        )}

        {/* Rows */}
        <Stack space={3}>
          {rows.map((row, index) => (
            <RowCard
              key={row.id}
              row={row}
              index={index}
              uid={uid}
              onUpdate={(patch) => updateRow(row.id, patch)}
              onRemove={() => removeRow(row.id)}
              onToggle={() => toggleRow(row.id)}
              generating={generating}
            />
          ))}
        </Stack>

        {/* Help */}
        <Card padding={4} radius={3} tone="transparent" border>
          <Stack space={2}>
            <Text size={1} weight="semibold">💡 Tips for best results</Text>
            <Text size={1} muted>
              <strong>Title:</strong> Be specific — "10 Best React Frameworks for 2024" beats "React"<br />
              <strong>Content/Notes:</strong> Paste bullet points, rough notes, or even a rough draft — AI will expand and format<br />
              <strong>Links:</strong> One URL per line — these get woven in as external references<br />
              <strong>Category:</strong> Determines the URL path and navigation placement
            </Text>
          </Stack>
        </Card>

      </Stack>
    </Box>
  )
}

function RowCard({
  row, index, uid, onUpdate, onRemove, onToggle, generating,
}: {
  row: Row
  index: number
  uid: string
  onUpdate: (patch: Partial<Row>) => void
  onRemove: () => void
  onToggle: () => void
  generating: boolean
}) {
  const isDone = row.status === 'done'
  const isError = row.status === 'error'
  const isGenerating = row.status === 'generating'
  const isIdle = row.status === 'idle'

  return (
    <Card
      padding={0}
      radius={3}
      shadow={1}
      tone={isDone ? 'positive' : isError ? 'critical' : isGenerating ? 'primary' : 'default'}
      style={{ overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {/* Row header */}
      <Flex
        align="center"
        gap={3}
        padding={3}
        style={{
          cursor: 'pointer',
          borderBottom: row.expanded && isIdle ? '1px solid rgba(255,255,255,0.06)' : 'none',
          background: isGenerating ? 'rgba(35,97,236,0.08)' : isDone ? 'rgba(67,214,117,0.06)' : isError ? 'rgba(224,92,75,0.08)' : 'transparent',
        }}
        onClick={isIdle ? onToggle : undefined}
      >
        {/* Status icon */}
        <Box style={{ flexShrink: 0, width: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isIdle && <Text size={1} muted style={{ fontVariantNumeric: 'tabular-nums' }}>{String(index + 1).padStart(2, '0')}</Text>}
          {isGenerating && <Spinner style={{ color: '#2276fc' }} />}
          {isDone && <CheckmarkCircleIcon style={{ color: '#43d675', fontSize: 18 }} />}
          {isError && <ErrorOutlineIcon style={{ color: '#e05c4b', fontSize: 18 }} />}
        </Box>

        {/* Title */}
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Flex align="center" gap={2} style={{ flexWrap: 'wrap' }}>
            <Text size={2} weight="semibold" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
              {row.title || <span style={{ opacity: 0.4 }}>Untitled post {index + 1}</span>}
            </Text>
            <Badge tone={CAT_TONE[row.category] ?? 'default'} fontSize={0} padding={1}>{row.category}</Badge>
            {row.rawContent.trim() && <Badge tone="default" fontSize={0} padding={1} mode="outline">+ notes</Badge>}
            {row.links.trim() && <Badge tone="default" fontSize={0} padding={1} mode="outline">+ links</Badge>}
          </Flex>
          {(isGenerating || isError) && row.log && (
            <Text size={0} muted style={{ fontFamily: 'monospace', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {row.log.trim().split('\n').pop()}
            </Text>
          )}
        </Box>

        {/* Actions */}
        <Flex gap={2} align="center" style={{ flexShrink: 0 }}>
          {isDone && row.url && (
            <a href={row.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
              style={{ color: '#2276fc', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
              <Text size={1} style={{ color: 'inherit' }}>View</Text>
              <LaunchIcon style={{ fontSize: 14 }} />
            </a>
          )}
          {isIdle && !generating && (
            <Button icon={TrashIcon} mode="bleed" tone="critical" fontSize={1} padding={2}
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); onRemove() }} />
          )}
        </Flex>
      </Flex>

      {/* Expanded form */}
      {row.expanded && isIdle && (
        <Box padding={3}>
          <Stack space={3}>
            <Flex gap={3} style={{ flexWrap: 'wrap' }}>
              {/* Title */}
              <Stack space={2} style={{ flex: 2, minWidth: 220 }}>
                <Text size={1} weight="semibold">Title *</Text>
                <TextInput
                  id={`${uid}-title-${row.id}`}
                  value={row.title}
                  onChange={(e: FormEvent<HTMLInputElement>) => onUpdate({ title: (e.currentTarget as HTMLInputElement).value })}
                  placeholder="Best JavaScript Frameworks for 2024"
                />
              </Stack>
              {/* Category */}
              <Stack space={2} style={{ flex: 1, minWidth: 140 }}>
                <Text size={1} weight="semibold">Category</Text>
                <Select
                  id={`${uid}-cat-${row.id}`}
                  value={row.category}
                  onChange={(e: FormEvent<HTMLSelectElement>) => onUpdate({ category: (e.currentTarget as HTMLSelectElement).value })}
                >
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </Select>
              </Stack>
            </Flex>

            {/* Raw content */}
            <Stack space={2}>
              <Text size={1} weight="semibold">Your content / research notes <Text size={1} muted as="span">(optional but recommended)</Text></Text>
              <TextArea
                id={`${uid}-content-${row.id}`}
                value={row.rawContent}
                onChange={(e: FormEvent<HTMLTextAreaElement>) => onUpdate({ rawContent: (e.currentTarget as HTMLTextAreaElement).value })}
                rows={6}
                placeholder={`Paste your research, bullet points, or rough draft here.\n\nExamples:\n• React – most popular, 200k GitHub stars, used by Meta/Netflix\n• Vue.js – progressive framework, great DX, Evan You creator\n• Angular – enterprise-grade, TypeScript-first, Google-backed\n• Svelte – compiles to vanilla JS, no runtime overhead`}
                style={{ fontFamily: 'inherit', fontSize: 13 }}
              />
            </Stack>

            {/* Links */}
            <Stack space={2}>
              <Text size={1} weight="semibold">External links to include <Text size={1} muted as="span">(one per line)</Text></Text>
              <TextArea
                id={`${uid}-links-${row.id}`}
                value={row.links}
                onChange={(e: FormEvent<HTMLTextAreaElement>) => onUpdate({ links: (e.currentTarget as HTMLTextAreaElement).value })}
                rows={3}
                placeholder={`https://react.dev\nhttps://vuejs.org\nhttps://angular.io`}
                style={{ fontFamily: 'monospace', fontSize: 12 }}
              />
            </Stack>
          </Stack>
        </Box>
      )}
    </Card>
  )
}
