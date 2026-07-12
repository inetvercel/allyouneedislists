/**
 * Affiliate link injection
 *
 * 1. Set AMAZON_ASSOCIATE_ID in .env.local once you have your Amazon tag
 * 2. Add entries to AFFILIATE_MAP: 'Brand or Product Name' → Amazon ASIN or search URL
 * 3. injectAffiliateLinks() is called during post rendering on matched brand/product names
 *
 * Map format options:
 *   Direct ASIN:  'https://www.amazon.com/dp/BXXXXXXXX?tag=YOUR-TAG'
 *   Search:       'https://www.amazon.com/s?k=search+terms&tag=YOUR-TAG'
 *
 * The function wraps the FIRST occurrence of each keyword per page (not every instance)
 * to avoid over-linking, which hurts UX and SEO.
 */

const TAG = process.env.AMAZON_ASSOCIATE_ID || ''

function amazonSearch(query: string): string {
  return `https://www.amazon.com/s?k=${encodeURIComponent(query)}&tag=${TAG}`
}

/**
 * Map of exact brand/product names → affiliate URLs.
 * Keys are matched case-insensitively as whole words within anchor text or paragraph text.
 * Add your entries here once you have your Amazon Associate ID.
 */
export const AFFILIATE_MAP: Record<string, string> = {
  // Examples (uncomment and replace once you have your Associate ID):
  // 'Kindle':          'https://www.amazon.com/dp/B09SWRYPG2?tag=' + TAG,
  // 'Audible':         'https://www.amazon.com/dp/B00NB86OYE?tag=' + TAG,
  // 'Ring Doorbell':   amazonSearch('ring video doorbell'),
  // 'Instant Pot':     amazonSearch('instant pot'),
}

/**
 * Injects affiliate links into HTML content.
 * Only wraps the first occurrence of each keyword per document.
 * Skips text already inside an <a> tag.
 *
 * @param html  The post HTML content
 * @returns     HTML with affiliate links injected
 */
export function injectAffiliateLinks(html: string): string {
  if (!TAG || Object.keys(AFFILIATE_MAP).length === 0) return html

  let result = html
  for (const [keyword, url] of Object.entries(AFFILIATE_MAP)) {
    if (!url || url.includes('YOUR-TAG')) continue

    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // Match keyword only when NOT already inside an href
    const re = new RegExp(
      `(?<!href="[^"]{0,200})(?<!<a[^>]{0,200}>)\\b(${escaped})\\b`,
      'i'
    )
    result = result.replace(re, (match) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer sponsored">${match}</a>`
    })
  }
  return result
}
