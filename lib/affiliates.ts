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

const TAG = process.env.AMAZON_ASSOCIATE_ID || 'allyouneedislists-20'

function a(query: string): string {
  return `https://www.amazon.com/s?k=${encodeURIComponent(query)}&tag=${TAG}`
}

function dp(asin: string): string {
  return `https://www.amazon.com/dp/${asin}?tag=${TAG}`
}

/**
 * Map of brand/product names → Amazon affiliate URLs.
 * Keys matched case-insensitively as whole words in post content.
 * Only the FIRST match per page is linked to avoid over-linking.
 *
 * To add new entries: a('search terms') for search pages, dp('ASIN') for direct product links.
 */
export const AFFILIATE_MAP: Record<string, string> = {
  // ── E-readers & Audio ─────────────────────────────────────────────────────
  'Kindle':                 dp('B09SWRYPG2'),
  'Kindle Paperwhite':      dp('B08KTZ8249'),
  'Audible':                a('audible subscription'),

  // ── Smart Home ────────────────────────────────────────────────────────────
  'Ring Doorbell':          a('ring video doorbell'),
  'Ring Video Doorbell':    a('ring video doorbell'),
  'Echo Dot':               a('echo dot'),
  'Amazon Echo':            a('amazon echo'),
  'Fire TV Stick':          dp('B08C1W5N87'),
  'Fire TV':                a('fire tv stick'),
  'Nest Thermostat':        a('nest thermostat'),
  'Philips Hue':            a('philips hue smart bulbs'),

  // ── Kitchen ───────────────────────────────────────────────────────────────
  'Instant Pot':            a('instant pot'),
  'Air Fryer':              a('air fryer'),
  'Ninja Air Fryer':        a('ninja air fryer'),
  'KitchenAid':             a('kitchenaid stand mixer'),
  'Nespresso':              a('nespresso machine'),
  'Keurig':                 a('keurig coffee maker'),

  // ── Tech & Gadgets ────────────────────────────────────────────────────────
  'AirPods':                a('apple airpods'),
  'AirPods Pro':            a('airpods pro'),
  'Apple Watch':            a('apple watch'),
  'Galaxy Watch':           a('samsung galaxy watch'),
  'iPad':                   a('apple ipad'),
  'MacBook':                a('apple macbook'),
  'Nintendo Switch':        a('nintendo switch'),
  'PlayStation 5':          a('playstation 5 console'),
  'PS5':                    a('ps5 console'),
  'Xbox Series X':          a('xbox series x'),
  'Raspberry Pi':           a('raspberry pi'),

  // ── Fitness & Health ──────────────────────────────────────────────────────
  'Fitbit':                 a('fitbit fitness tracker'),
  'Garmin':                 a('garmin fitness watch'),
  'Yoga Mat':               a('yoga mat'),
  'Resistance Bands':       a('resistance bands'),
  'Foam Roller':            a('foam roller'),

  // ── Books & Learning ──────────────────────────────────────────────────────
  'Audible Premium':        a('audible premium plus'),
  'Kindle Unlimited':       a('kindle unlimited'),

  // ── Travel ────────────────────────────────────────────────────────────────
  'Travel Pillow':          a('travel neck pillow'),
  'Packing Cubes':          a('packing cubes luggage'),
  'Luggage':                a('carry on luggage'),
  'Noise Cancelling Headphones': a('noise cancelling headphones'),
  'Sony WH-1000XM5':        a('sony wh-1000xm5'),
  'Bose QuietComfort':      a('bose quietcomfort headphones'),

  // ── Productivity & Office ─────────────────────────────────────────────────
  'Standing Desk':          a('standing desk'),
  'Monitor':                a('monitor 4k'),
  'Mechanical Keyboard':    a('mechanical keyboard'),
  'Webcam':                 a('webcam 1080p'),
  'Ring Light':             a('ring light'),
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
