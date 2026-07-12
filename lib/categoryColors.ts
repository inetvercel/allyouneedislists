/**
 * Centralized category color system.
 * Every category gets its own consistent, distinct color across the whole site —
 * explicit picks for the main categories, deterministic hash-based fallback for the rest.
 * This avoids most categories collapsing to the brand red (#E63946), which is
 * reserved for CTAs / accents, not category tagging.
 */

export const CAT_COLORS: Record<string, string> = {
  ai: '#8B5CF6',            // purple
  business: '#F59E0B',      // gold
  finance: '#10B981',       // emerald
  marketing: '#06B6D4',     // cyan
  seo: '#F97316',           // orange
  technology: '#3B82F6',    // blue
  software: '#3B82F6',
  hardware: '#3B82F6',
  internet: '#3B82F6',
  programming: '#3B82F6',
  gaming: '#6366F1',        // indigo
  'social-media': '#EC4899', // pink
  entertainment: '#EF4444', // red
  movies: '#EF4444',
  tv: '#EF4444',
  music: '#EF4444',
  travel: '#0EA5E9',        // sky blue
  lifestyle: '#F43F5E',     // rose
  'food-drink': '#FBBF24',  // amber
  food: '#FBBF24',
  home: '#A16207',          // brown
  health: '#22C55E',        // green
  statistics: '#64748B',    // slate
  education: '#7C3AED',     // violet
  sports: '#84CC16',        // lime
  science: '#14B8A6',       // teal
  automotive: '#71717A',    // zinc grey
  careers: '#1D4ED8',       // navy
  startups: '#1D4ED8',
  directories: '#374151',   // charcoal
}

// Extended palette used as a deterministic fallback for any category slug
// not explicitly listed above (subcategories, tags, etc). Chosen to be vivid,
// readable on dark cards, and distinct from each other and from brand red.
const FALLBACK_PALETTE = [
  '#38bdf8', // sky
  '#fbbf24', // amber
  '#f472b6', // pink
  '#4ade80', // green
  '#a78bfa', // violet
  '#2dd4bf', // teal
  '#fb923c', // orange
  '#60a5fa', // blue
  '#facc15', // yellow
  '#e879f9', // fuchsia
  '#34d399', // emerald
  '#fca5a5', // rose
  '#818cf8', // indigo
  '#f97316', // deep orange
  '#22d3ee', // cyan
  '#c084fc', // purple
]

function hashSlug(slug: string): number {
  let hash = 0
  for (let i = 0; i < slug.length; i++) {
    hash = (hash << 5) - hash + slug.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

/** Returns a consistent color for any category slug — explicit map first, then hash-based fallback. */
export function catColor(slug?: string): string {
  if (!slug) return '#E63946'
  if (CAT_COLORS[slug]) return CAT_COLORS[slug]
  return FALLBACK_PALETTE[hashSlug(slug) % FALLBACK_PALETTE.length]
}
