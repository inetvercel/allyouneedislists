import { groq } from 'next-sanity'

export const POST_CARD_FIELDS = groq`
  _id,
  title,
  "slug": slug.current,
  fullPath,
  date,
  excerpt,
  "featuredImage": featuredImage {
    asset,
    alt,
    caption
  },
  "categories": categories[]-> {
    _id,
    name,
    "slug": slug.current,
    "parent": parent-> { name, "slug": slug.current }
  }
`

export const getLatestPostsQuery = groq`
  *[_type == "post" && !defined(redirectTo)] | order(date desc) [$start...$end] {
    ${POST_CARD_FIELDS}
  }
`

export const getLatestPostsCountQuery = groq`
  count(*[_type == "post" && !defined(redirectTo)])
`

export const getPostByPathQuery = groq`
  *[_type == "post" && fullPath == $path][0] {
    _id,
    title,
    "slug": slug.current,
    fullPath,
    date,
    excerpt,
    content,
    seoTitle,
    seoDescription,
    "featuredImage": featuredImage {
      asset,
      alt,
      caption
    },
    "categories": categories[]-> {
      _id,
      name,
      "slug": slug.current,
      "parent": parent-> { name, "slug": slug.current }
    },
    "tags": tags[]-> {
      _id,
      name,
      "slug": slug.current
    },
    updatedAt,
    aiGenerated,
    redirectTo,
    originalTitle,
    originalPath
  }
`

export const getCategoryBySlugQuery = groq`
  *[_type == "category" && slug.current == $slug][0] {
    _id,
    name,
    "slug": slug.current,
    description,
    "parent": parent-> { name, "slug": slug.current }
  }
`

export const getPostsByCategoryQuery = groq`
  *[_type == "post" && !defined(redirectTo) && references(*[_type == "category" && slug.current == $slug]._id)] | order(date desc) [$start...$end] {
    ${POST_CARD_FIELDS}
  }
`

export const getPostsByCategoryCountQuery = groq`
  count(*[_type == "post" && !defined(redirectTo) && references(*[_type == "category" && slug.current == $slug]._id)])
`

export const getTopCategoriesQuery = groq`
  *[_type == "category" && !defined(parent)] | order(name asc) {
    _id,
    name,
    "slug": slug.current,
    "count": count(*[_type == "post" && references(^._id)])
  }
`

export const getNavCategoriesQuery = groq`
  *[_type == "category" && !defined(parent) && count(*[_type == "post" && references(^._id)]) > 0] | order(name asc) [0...8] {
    _id,
    name,
    "slug": slug.current
  }
`

export const getRelatedPostsQuery = groq`
  *[
    _type == "post"
    && !defined(redirectTo)
    && _id != $currentId
    && count((categories[]._ref)[@ in $categoryIds]) > 0
  ] | order(date desc) [0...4] {
    ${POST_CARD_FIELDS}
  }
`

export const getAllPostPathsQuery = groq`
  *[_type == "post" && defined(fullPath)] {
    fullPath
  }
`

export const getAllCategorySlugPathsQuery = groq`
  *[_type == "category" && defined(slug)] {
    "slug": slug.current
  }
`

export const getSitemapPostsQuery = groq`
  *[
    _type == "post"
    && defined(fullPath)
    && !defined(redirectTo)
    && !(fullPath match "*attachment*")
    && !(fullPath match "*/[0-9]")
    && !(fullPath match "*/[0-9][0-9]")
    && !(fullPath match "*/[0-9][0-9][0-9]")
  ] | order(date desc) [$start...$end] {
    fullPath,
    date,
    updatedAt
  }
`

export const getSitemapPostsCountQuery = groq`
  count(*[
    _type == "post"
    && defined(fullPath)
    && !defined(redirectTo)
    && !(fullPath match "*attachment*")
    && !(fullPath match "*/[0-9]")
    && !(fullPath match "*/[0-9][0-9]")
    && !(fullPath match "*/[0-9][0-9][0-9]")
  ])
`

export const getRssFeedPostsQuery = groq`
  *[_type == "post" && !defined(redirectTo)] | order(date desc) [0...50] {
    title,
    fullPath,
    date,
    excerpt,
    "category": categories[0]-> { name }
  }
`

export const getTagBySlugQuery = groq`
  *[_type == "tag" && slug.current == $slug][0] {
    _id,
    name,
    "slug": slug.current,
    "count": count(*[_type == "post" && references(^._id)])
  }
`

export const getPostsByTagQuery = groq`
  *[_type == "post" && !defined(redirectTo) && references(*[_type == "tag" && slug.current == $slug]._id)] | order(date desc) [$start...$end] {
    ${POST_CARD_FIELDS}
  }
`

export const getPostsByTagCountQuery = groq`
  count(*[_type == "post" && !defined(redirectTo) && references(*[_type == "tag" && slug.current == $slug]._id)])
`

export const getAllTagSlugPathsQuery = groq`
  *[_type == "tag" && defined(slug) && count(*[_type == "post" && references(^._id)]) > 0][0...500] {
    "slug": slug.current
  }
`

export const searchPostsQuery = groq`
  *[_type == "post" && !defined(redirectTo) && (title match $q || excerpt match $q)] | order(date desc) [0...24] {
    ${POST_CARD_FIELDS}
  }
`

export const getHomepageSectionsQuery = groq`
  {
    "ai": *[_type == "post" && !defined(redirectTo) && references(*[_type == "category" && slug.current in ["ai","ai-tools","ai-models","chatgpt","productivity"]]._id)] | order(date desc) [0...4] { ${POST_CARD_FIELDS} },
    "technology": *[_type == "post" && !defined(redirectTo) && references(*[_type == "category" && slug.current in ["technology","software","hardware","programming","internet"]]._id)] | order(date desc) [0...4] { ${POST_CARD_FIELDS} },
    "business": *[_type == "post" && !defined(redirectTo) && references(*[_type == "category" && slug.current in ["business","marketing","seo","finance","startups"]]._id)] | order(date desc) [0...4] { ${POST_CARD_FIELDS} },
    "entertainment": *[_type == "post" && !defined(redirectTo) && references(*[_type == "category" && slug.current in ["entertainment","movies","tv","gaming","music"]]._id)] | order(date desc) [0...4] { ${POST_CARD_FIELDS} },
    "lifestyle": *[_type == "post" && !defined(redirectTo) && references(*[_type == "category" && slug.current == "lifestyle"]._id)] | order(date desc) [0...4] { ${POST_CARD_FIELDS} },
    "travel": *[_type == "post" && !defined(redirectTo) && references(*[_type == "category" && slug.current == "travel"]._id)] | order(date desc) [0...4] { ${POST_CARD_FIELDS} }
  }
`
