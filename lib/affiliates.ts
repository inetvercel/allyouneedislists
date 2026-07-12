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

const TAG_US = process.env.AMAZON_ASSOCIATE_ID    || 'allyouneedislists-20'
const TAG_UK = process.env.AMAZON_ASSOCIATE_ID_UK || 'allyouneedislists-21'

function us(query: string): string {
  return `https://www.amazon.com/s?k=${encodeURIComponent(query)}&tag=${TAG_US}`
}
function usdp(asin: string): string {
  return `https://www.amazon.com/dp/${asin}?tag=${TAG_US}`
}
function uk(query: string): string {
  return `https://www.amazon.co.uk/s?k=${encodeURIComponent(query)}&tag=${TAG_UK}`
}
function ukdp(asin: string): string {
  return `https://www.amazon.co.uk/dp/${asin}?tag=${TAG_UK}`
}

/**
 * UK countries — these get amazon.co.uk links.
 * Everyone else gets amazon.com links.
 */
const UK_COUNTRIES = new Set(['GB', 'IE', 'IM', 'JE', 'GG'])

type AffiliateEntry = { us: string; uk: string }

/**
 * Dual-region product map. Each entry has both a US and UK affiliate URL.
 * Keys matched case-insensitively as whole words in post content.
 * Only the FIRST match per page is linked.
 *
 * Add entries using: us/uk for search, usdp/ukdp for direct ASIN links.
 */
const DUAL_MAP: Record<string, AffiliateEntry> = {
  // ── E-readers & Audio ──────────────────────────────────────────────────────
  'Kindle':                 { us: usdp('B09SWRYPG2'),         uk: ukdp('B09TN2T8HF') },
  'Kindle Paperwhite':      { us: usdp('B08KTZ8249'),         uk: ukdp('B08N3J4TNN') },
  'Audible':                { us: us('audible subscription'),  uk: uk('audible subscription') },
  'Audible Premium':        { us: us('audible premium plus'),  uk: uk('audible premium plus') },
  'Kindle Unlimited':       { us: us('kindle unlimited'),      uk: uk('kindle unlimited') },

  // ── Smart Home ─────────────────────────────────────────────────────────────
  'Ring Doorbell':          { us: us('ring video doorbell'),   uk: uk('ring video doorbell') },
  'Ring Video Doorbell':    { us: us('ring video doorbell'),   uk: uk('ring video doorbell') },
  'Echo Dot':               { us: us('echo dot'),              uk: uk('echo dot') },
  'Amazon Echo':            { us: us('amazon echo'),           uk: uk('amazon echo') },
  'Fire TV Stick':          { us: usdp('B08C1W5N87'),          uk: uk('fire tv stick 4k') },
  'Fire TV':                { us: us('fire tv stick'),         uk: uk('fire tv stick') },
  'Nest Thermostat':        { us: us('nest thermostat'),       uk: uk('nest thermostat') },
  'Philips Hue':            { us: us('philips hue smart bulbs'), uk: uk('philips hue smart bulbs') },

  // ── Kitchen ────────────────────────────────────────────────────────────────
  'Instant Pot':            { us: us('instant pot'),           uk: uk('instant pot') },
  'Air Fryer':              { us: us('air fryer'),             uk: uk('air fryer') },
  'Ninja Air Fryer':        { us: us('ninja air fryer'),       uk: uk('ninja air fryer') },
  'KitchenAid':             { us: us('kitchenaid stand mixer'), uk: uk('kitchenaid stand mixer') },
  'Nespresso':              { us: us('nespresso machine'),     uk: uk('nespresso machine') },
  'Keurig':                 { us: us('keurig coffee maker'),   uk: uk('keurig coffee maker') },

  // ── Tech & Gadgets ─────────────────────────────────────────────────────────
  'AirPods':                { us: us('apple airpods'),         uk: uk('apple airpods') },
  'AirPods Pro':            { us: us('airpods pro'),           uk: uk('airpods pro') },
  'Apple Watch':            { us: us('apple watch'),           uk: uk('apple watch') },
  'Galaxy Watch':           { us: us('samsung galaxy watch'),  uk: uk('samsung galaxy watch') },
  'iPad':                   { us: us('apple ipad'),            uk: uk('apple ipad') },
  'MacBook':                { us: us('apple macbook'),         uk: uk('apple macbook') },
  'Nintendo Switch':        { us: us('nintendo switch'),       uk: uk('nintendo switch') },
  'PlayStation 5':          { us: us('playstation 5 console'), uk: uk('playstation 5 console') },
  'PS5':                    { us: us('ps5 console'),           uk: uk('ps5 console') },
  'Xbox Series X':          { us: us('xbox series x'),         uk: uk('xbox series x') },
  'Raspberry Pi':           { us: us('raspberry pi'),          uk: uk('raspberry pi') },

  // ── Fitness & Health ───────────────────────────────────────────────────────
  'Fitbit':                 { us: us('fitbit fitness tracker'), uk: uk('fitbit fitness tracker') },
  'Garmin':                 { us: us('garmin fitness watch'),  uk: uk('garmin fitness watch') },
  'Yoga Mat':               { us: us('yoga mat'),              uk: uk('yoga mat') },
  'Resistance Bands':       { us: us('resistance bands'),      uk: uk('resistance bands') },
  'Foam Roller':            { us: us('foam roller'),           uk: uk('foam roller') },

  // ── Travel ─────────────────────────────────────────────────────────────────
  'Travel Pillow':          { us: us('travel neck pillow'),    uk: uk('travel neck pillow') },
  'Packing Cubes':          { us: us('packing cubes luggage'), uk: uk('packing cubes luggage') },
  'Luggage':                { us: us('carry on luggage'),      uk: uk('cabin luggage') },
  'Noise Cancelling Headphones': { us: us('noise cancelling headphones'), uk: uk('noise cancelling headphones') },
  'Sony WH-1000XM5':        { us: us('sony wh-1000xm5'),       uk: uk('sony wh-1000xm5') },
  'Bose QuietComfort':      { us: us('bose quietcomfort headphones'), uk: uk('bose quietcomfort headphones') },

  // ── Productivity & Office ──────────────────────────────────────────────────
  'Standing Desk':          { us: us('standing desk'),         uk: uk('standing desk') },
  'Monitor':                { us: us('monitor 4k'),            uk: uk('monitor 4k') },
  'Mechanical Keyboard':    { us: us('mechanical keyboard'),   uk: uk('mechanical keyboard') },
  'Webcam':                 { us: us('webcam 1080p'),          uk: uk('webcam 1080p') },
  'Ring Light':             { us: us('ring light'),            uk: uk('ring light') },
}

/**
 * Injects affiliate links into HTML content.
 * Picks amazon.co.uk for GB/IE visitors, amazon.com for everyone else.
 * Only wraps the FIRST occurrence of each keyword per document.
 *
 * @param html     The post HTML content
 * @param country  ISO 3166-1 alpha-2 country code (e.g. 'GB', 'US'). Pass '' to default to US.
 */
export function injectAffiliateLinks(html: string, country = ''): string {
  if (Object.keys(DUAL_MAP).length === 0) return html
  const isUK = UK_COUNTRIES.has(country.toUpperCase())

  let result = html
  for (const [keyword, entry] of Object.entries(DUAL_MAP)) {
    const url = isUK ? entry.uk : entry.us
    if (!url) continue

    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // Match whole word NOT already inside an <a> tag
    const re = new RegExp(`(?<!href="[^"]{0,200})(?<!<a[^>]{0,200}>)\\b(${escaped})\\b`, 'i')
    result = result.replace(re, (match) =>
      `<a href="${url}" target="_blank" rel="noopener noreferrer sponsored">${match}</a>`
    )
  }
  return result
}
