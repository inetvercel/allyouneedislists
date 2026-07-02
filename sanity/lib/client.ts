import { createClient } from 'next-sanity'

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'

// Validate projectId format (a-z, 0-9, dashes only) to avoid throwing at module load
const isValidProjectId = /^[a-z0-9-]+$/.test(projectId || '')

export const client = createClient({
  projectId: isValidProjectId ? projectId! : 'placeholder',
  dataset,
  apiVersion: '2024-01-01',
  useCdn: true,
})
