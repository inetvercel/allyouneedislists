import { useState, useCallback } from 'react'
import type { FormEvent, MouseEvent } from 'react'
import {
  Box, Button, Card, Flex, Select, Spinner,
  Stack, Text, Badge, Heading, Grid,
} from '@sanity/ui'
import { SparklesIcon, SearchIcon, CheckmarkCircleIcon, ErrorOutlineIcon, LaunchIcon } from '@sanity/icons'

const CATEGORIES = [
  { value: '', label: 'All categories' },
  { value: 'ai', label: 'AI' },
  { value: 'technology', label: 'Technology' },
  { value: 'business', label: 'Business' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'travel', label: 'Travel' },
  { value: 'lifestyle', label: 'Lifestyle' },
]

const CAT_TONE: Record<string, 'primary' | 'positive' | 'caution' | 'critical' | 'default'> = {
  ai: 'primary',
  technology: 'primary',
  business: 'caution',
  entertainment: 'positive',
  travel: 'positive',
  lifestyle: 'default',
}

interface Topic {
  title: string
  category: string
  searchIntent: string
}

type Status = 'idle' | 'generating' | 'done' | 'error'

interface TopicRow extends Topic {
  id: string
  selected: boolean
  status: Status
  url?: string
  log?: string
}

export function AIStudioTool() {
  const [category, setCategory] = useState('')
  const [count, setCount] = useState('25')
  const [topics, setTopics] = useState<TopicRow[]>([])
  const [loading, setLoading] = useState(false)
  const [runningId, setRunningId] = useState<string | null>(null)

  const updateTopic = useCallback((id: string, patch: Partial<TopicRow>) => {
    setTopics((prev: TopicRow[]) => prev.map((t: TopicRow) => t.id === id ? { ...t, ...patch } : t))
  }, [])

  const suggestTopics = async () => {
    setLoading(true)
    setTopics([])
    try {
      const params = new URLSearchParams({ count, ...(category ? { category } : {}) })
      const res = await fetch(`/api/suggest-topics?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setTopics(
        (data.topics ?? []).map((t: Topic, i: number) => ({
          ...t,
          id: `t-${i}-${Date.now()}`,
          selected: false,
          status: 'idle' as Status,
        }))
      )
    } catch (err) {
      console.error('suggest-topics failed:', err)
    }
    setLoading(false)
  }

  const toggleAll = (select: boolean) => {
    setTopics((prev: TopicRow[]) => prev.map((t: TopicRow) => t.status === 'idle' ? { ...t, selected: select } : t))
  }

  const selectedIdle = topics.filter((t: TopicRow) => t.selected && t.status === 'idle')
  const generating = topics.some((t: TopicRow) => t.status === 'generating')

  const generateSelected = async () => {
    const queue = topics.filter((t: TopicRow) => t.selected && t.status === 'idle')
    for (const topic of queue) {
      setRunningId(topic.id)
      updateTopic(topic.id, { status: 'generating', log: '' })

      try {
        const res = await fetch('/api/generate-post', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: topic.title, category: topic.category }),
        })

        if (!res.body) throw new Error('No stream body')
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
                updateTopic(topic.id, { log: evt.message })
              }
              if (evt.type === 'done') {
                updateTopic(topic.id, {
                  status: evt.success ? 'done' : 'error',
                  url: evt.url ?? undefined,
                  log: evt.success ? '✅ Published' : evt.error ?? 'Failed',
                })
              }
            } catch { /* ignore parse errors */ }
          }
        }
      } catch (err: unknown) {
        updateTopic(topic.id, {
          status: 'error',
          log: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }
    setRunningId(null)
  }

  const doneCount = topics.filter(t => t.status === 'done').length
  const errorCount = topics.filter(t => t.status === 'error').length

  return (
    <Box padding={4} style={{ maxWidth: 900, margin: '0 auto' }}>
      <Stack space={5}>
        {/* Header */}
        <Flex align="center" gap={3}>
          <SparklesIcon style={{ fontSize: 28, color: '#E63946' }} />
          <Stack space={1}>
            <Heading size={3}>AI Topic Generator</Heading>
            <Text muted size={1}>Suggest fresh topics, select them, and generate full posts automatically</Text>
          </Stack>
        </Flex>

        {/* Controls */}
        <Card padding={4} radius={3} shadow={1}>
          <Stack space={4}>
            <Grid columns={3} gap={3}>
              <Stack space={2}>
                <Text size={1} weight="semibold">Category</Text>
                <Select value={category} onChange={(e: FormEvent<HTMLSelectElement>) => setCategory((e.currentTarget as HTMLSelectElement).value)}>
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </Select>
              </Stack>
              <Stack space={2}>
                <Text size={1} weight="semibold">Number of suggestions</Text>
                <Select value={count} onChange={(e: FormEvent<HTMLSelectElement>) => setCount((e.currentTarget as HTMLSelectElement).value)}>
                  <option value="10">10 topics</option>
                  <option value="25">25 topics</option>
                  <option value="40">40 topics</option>
                </Select>
              </Stack>
              <Stack space={2}>
                <Text size={1}>&nbsp;</Text>
                <Button
                  icon={SearchIcon}
                  text={loading ? 'Thinking...' : 'Suggest Topics'}
                  tone="primary"
                  onClick={suggestTopics}
                  disabled={loading}
                  style={{ height: 37 }}
                />
              </Stack>
            </Grid>
          </Stack>
        </Card>

        {/* Loading */}
        {loading && (
          <Flex align="center" justify="center" padding={6} gap={3}>
            <Spinner muted />
            <Text muted>GPT-5.5 is finding the best topics...</Text>
          </Flex>
        )}

        {/* Topics list */}
        {topics.length > 0 && (
          <Stack space={3}>
            {/* Toolbar */}
            <Flex align="center" justify="space-between">
              <Flex gap={2} align="center">
                <Text size={1} muted>{topics.length} suggestions</Text>
                {doneCount > 0 && <Badge tone="positive">{doneCount} published</Badge>}
                {errorCount > 0 && <Badge tone="critical">{errorCount} failed</Badge>}
              </Flex>
              <Flex gap={2}>
                <Button text="Select all" mode="ghost" fontSize={1} padding={2} onClick={() => toggleAll(true)} disabled={generating} />
                <Button text="Deselect all" mode="ghost" fontSize={1} padding={2} onClick={() => toggleAll(false)} disabled={generating} />
                <Button
                  icon={SparklesIcon}
                  text={generating ? `Generating...` : `Generate selected (${selectedIdle.length})`}
                  tone="positive"
                  disabled={selectedIdle.length === 0 || generating}
                  onClick={generateSelected}
                />
              </Flex>
            </Flex>

            {/* Cards */}
            <Stack space={2}>
              {topics.map((topic: TopicRow) => (
                <TopicCard
                  key={topic.id}
                  topic={topic}
                  isRunning={runningId === topic.id}
                  onToggle={() => {
                    if (topic.status === 'idle') updateTopic(topic.id, { selected: !topic.selected })
                  }}
                />
              ))}
            </Stack>
          </Stack>
        )}

        {/* Empty state */}
        {!loading && topics.length === 0 && (
          <Card padding={6} radius={3} tone="transparent" border>
            <Stack space={3} style={{ textAlign: 'center' }}>
              <Text muted>Click "Suggest Topics" to get fresh AI-generated topic ideas</Text>
              <Text muted size={1}>GPT-5.5 will check your existing posts and suggest only topics you don't have yet</Text>
            </Stack>
          </Card>
        )}
      </Stack>
    </Box>
  )
}

function TopicCard({ topic, isRunning, onToggle }: {
  topic: TopicRow
  isRunning: boolean
  onToggle: () => void
}) {
  const isDone = topic.status === 'done'
  const isError = topic.status === 'error'
  const isGenerating = topic.status === 'generating'
  const isIdle = topic.status === 'idle'

  return (
    <Card
      padding={3}
      radius={2}
      shadow={topic.selected ? 1 : 0}
      tone={isDone ? 'positive' : isError ? 'critical' : topic.selected ? 'primary' : 'default'}
      style={{
        cursor: isIdle ? 'pointer' : 'default',
        opacity: isDone ? 0.7 : 1,
        border: topic.selected && isIdle ? '1px solid rgba(66,133,244,0.5)' : '1px solid transparent',
        transition: 'all 0.15s',
      }}
      onClick={isIdle ? () => onToggle() : undefined}
    >
      <Flex align="center" gap={3}>
        {/* Checkbox area */}
        <Box style={{ flexShrink: 0, width: 20 }}>
          {isIdle && (
            <div style={{
              width: 18, height: 18,
              borderRadius: 4,
              border: '2px solid',
              borderColor: topic.selected ? '#2276fc' : '#aaa',
              background: topic.selected ? '#2276fc' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {topic.selected && <span style={{ color: '#fff', fontSize: 11, lineHeight: 1 }}>✓</span>}
            </div>
          )}
          {isGenerating && <Spinner style={{ color: '#2276fc' }} />}
          {isDone && <CheckmarkCircleIcon style={{ color: '#43d675', fontSize: 18 }} />}
          {isError && <ErrorOutlineIcon style={{ color: '#e05c4b', fontSize: 18 }} />}
        </Box>

        {/* Content */}
        <Stack space={1} style={{ flex: 1, minWidth: 0 }}>
          <Flex align="center" gap={2} style={{ flexWrap: 'wrap' }}>
            <Text size={2} weight={topic.selected ? 'semibold' : 'regular'} style={{
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {topic.title}
            </Text>
            <Badge tone={CAT_TONE[topic.category] ?? 'default'} fontSize={0} padding={1}>
              {topic.category}
            </Badge>
            {topic.searchIntent && (
              <Badge tone="default" fontSize={0} padding={1} mode="outline">
                {topic.searchIntent}
              </Badge>
            )}
          </Flex>

          {/* Live log */}
          {(isGenerating || isError) && topic.log && (
            <Text size={0} muted style={{
              fontFamily: 'monospace',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {topic.log.trim().split('\n').pop()}
            </Text>
          )}
        </Stack>

        {/* View link */}
        {isDone && topic.url && (
          <a
            href={topic.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e: MouseEvent) => e.stopPropagation()}
            style={{ color: '#2276fc', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none', flexShrink: 0 }}
          >
            <Text size={1} style={{ color: 'inherit' }}>View</Text>
            <LaunchIcon style={{ fontSize: 14 }} />
          </a>
        )}
      </Flex>
    </Card>
  )
}
