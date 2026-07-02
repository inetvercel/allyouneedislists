# All You Need Is Lists

Next.js 15 + Sanity v3 listicles site, migrated from WordPress.

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Create a Sanity project

Go to [sanity.io](https://sanity.io) and create a free account, then:

```bash
npx sanity@latest login
npx sanity@latest projects create
```

Note down your **Project ID**.

### 3. Configure environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```
NEXT_PUBLIC_SANITY_PROJECT_ID=your_project_id
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_WRITE_TOKEN=your_write_token
```

To get a write token:
- Go to [sanity.io/manage](https://sanity.io/manage) → your project
- API → Tokens → Add API Token
- Give it **Editor** role
- Copy the token into `.env.local` as `SANITY_WRITE_TOKEN`

### 4. Run the WordPress import

This imports all **1,486 posts** from allyouneedislists.com including images:

```bash
node scripts/import-from-wordpress.mjs
```

Options:
```bash
# Skip image uploads (much faster, ~5 min vs ~60 min)
node scripts/import-from-wordpress.mjs --skip-images

# Resume from a specific page if interrupted
node scripts/import-from-wordpress.mjs --start-page=8
```

The script is **resumable** — it skips any posts already in Sanity.

### 5. Start the dev server

```bash
npm run dev
```

- **Site:** http://localhost:3000
- **Sanity Studio:** http://localhost:3000/studio

## URL Structure

All original WordPress URLs are preserved exactly:
- Posts: `/{parent-category}/{child-category}/{post-slug}`
- Example: `/lifestyle/travel-leisure/top-5-honeymoon-hotels-in-europe`

Category browsing uses:
- `/category/{slug}` — e.g. `/category/lifestyle`

## Project Structure

```
├── app/
│   ├── layout.tsx           # Root layout with Header/Footer
│   ├── page.tsx             # Homepage (latest posts grid)
│   ├── [...slug]/page.tsx   # Post pages + WP-style category fallback
│   ├── category/[slug]/     # Category listing pages
│   └── studio/[[...index]]/ # Sanity Studio (embedded)
├── components/
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── PostCard.tsx         # Card component (normal + featured)
│   └── Pagination.tsx
├── sanity/
│   ├── sanity.config.ts
│   ├── schemaTypes/         # post, category, tag schemas
│   └── lib/                 # client, image helpers, GROQ queries
├── scripts/
│   └── import-from-wordpress.mjs
└── types/index.ts
```

## Deploy

```bash
npm run build
```

Deploy to Vercel, Netlify, or any Node.js host.
