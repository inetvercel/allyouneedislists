export const maxDuration = 60
export const runtime = 'nodejs'

interface ParsedDoc {
  title: string
  rawContent: string
  links: string[]
  filename: string
}

function extractFromText(text: string, filename: string): ParsedDoc {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  // Title: first markdown heading, or first substantial line, or filename
  let title = ''
  for (const line of lines) {
    const clean = line.replace(/^#{1,3}\s+/, '').replace(/^\*+|\*+$/g, '').trim()
    if (clean.length >= 8 && clean.length <= 120 && !/^https?:\/\//.test(clean)) {
      title = clean
      break
    }
  }
  if (!title) {
    title = filename.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim()
  }

  // Extract all URLs
  const urlRegex = /https?:\/\/[^\s\)>\]"',]+/g
  const links = [...new Set(text.match(urlRegex) ?? [])].slice(0, 30)

  // Clean content (remove title line if it matches, trim)
  const content = text
    .replace(/^#{1,3}\s+.*$/m, '')
    .replace(/\r\n/g, '\n')
    .trim()
    .slice(0, 12000)

  return { title, rawContent: content, links, filename }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    const buffer = Buffer.from(await file.arrayBuffer())

    if (ext === 'txt' || ext === 'md' || ext === 'markdown' || ext === 'html') {
      const text = buffer.toString('utf-8')
      return Response.json(extractFromText(text, file.name))
    }

    if (ext === 'docx') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mammoth = require('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      return Response.json(extractFromText(result.value, file.name))
    }

    if (ext === 'pdf') {
      // pdf-parse has a known issue with test files in Next.js — use direct import path
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse/lib/pdf-parse')
      const data = await pdfParse(buffer)
      return Response.json(extractFromText(data.text, file.name))
    }

    if (ext === 'csv') {
      const text = buffer.toString('utf-8')
      // Each CSV row: title, category, notes
      const rows = text
        .split('\n')
        .slice(1) // skip header
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => {
          const parts = line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(p => p.replace(/^"|"$/g, '').trim())
          return {
            title: parts[0] ?? '',
            category: parts[1] ?? '',
            rawContent: parts[2] ?? '',
            links: [],
            filename: file.name,
          }
        })
        .filter(r => r.title)
      return Response.json({ type: 'csv', rows })
    }

    return Response.json({ error: `Unsupported file type: .${ext}` }, { status: 400 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return Response.json({ error: msg }, { status: 500 })
  }
}
