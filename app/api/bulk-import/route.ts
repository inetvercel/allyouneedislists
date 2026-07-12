import { spawn } from 'child_process'
import { writeFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { tmpdir } from 'os'

export const maxDuration = 180
export const runtime = 'nodejs'

export async function POST(request: Request) {
  const body = await request.json()
  const { title, category = '', rawContent = '', links = [], model = 'gpt', imageMode = 'auto' } = body

  if (!title?.trim()) {
    return new Response(JSON.stringify({ error: 'title is required' }), { status: 400 })
  }

  // Write input to a temp file
  const tmpFile = resolve(tmpdir(), `bulk-${Date.now()}-${Math.random().toString(36).slice(2)}.json`)
  writeFileSync(tmpFile, JSON.stringify({ title: title.trim(), category, rawContent, links, useGrok: model === 'grok', imageMode }), 'utf-8')

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: object) => {
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)) }
        catch { /* closed */ }
      }

      const scriptPath = existsSync(resolve(process.cwd(), 'scripts/bulk-import-post.mjs'))
        ? resolve(process.cwd(), 'scripts/bulk-import-post.mjs')
        : resolve(process.cwd(), 'scripts/bulk-import-post.mjs')

      const child = spawn('node', [scriptPath, `--input=${tmpFile}`, ...(model === 'grok' ? ['--grok'] : []), ...(imageMode && imageMode !== 'auto' ? [`--image=${imageMode}`] : [])], {
        cwd: resolve(process.cwd()),
        env: process.env as NodeJS.ProcessEnv,
      })

      let output = ''

      child.stdout.on('data', (data: Buffer) => {
        const msg = data.toString()
        output += msg
        send({ type: 'log', message: msg })
      })

      child.stderr.on('data', (data: Buffer) => {
        send({ type: 'log', message: data.toString() })
      })

      child.on('close', (code: number | null) => {
        const urlMatch = output.match(/URL:\s+(https?:\/\/\S+)/)
        send({ type: 'done', success: code === 0, url: urlMatch?.[1] ?? null })
        controller.close()
      })

      child.on('error', (err: Error) => {
        send({ type: 'done', success: false, error: err.message })
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
