import { spawn } from 'child_process'
import { resolve } from 'path'

export const maxDuration = 120
export const runtime = 'nodejs'

export async function POST(request: Request) {
  const { topic, category, model, imageMode } = await request.json()

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {
          // controller already closed
        }
      }

      const safeTopic = String(topic).replace(/"/g, "'").slice(0, 200)
      const args = ['scripts/generate-post.mjs', safeTopic]
      if (category) args.push(`--category=${category}`)
      if (model === 'grok') args.push('--grok')
      if (imageMode && imageMode !== 'auto') args.push(`--image=${imageMode}`)

      const child = spawn('node', args, {
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
