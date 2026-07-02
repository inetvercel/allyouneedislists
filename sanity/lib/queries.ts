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
  *[_type == "post"] | order(date desc) [$start...$end] {
    ${POST_CARD_FIELDS}
  }
`

export const getLatestPostsCountQuery = groq`
  count(*[_type == "post"])
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
    }
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
  *[_type == "post" && references(*[_type == "category" && slug.current == $slug]._id)] | order(date desc) [$start...$end] {
    ${POST_CARD_FIELDS}
  }
`

export const getPostsByCategoryCountQuery = groq`
  count(*[_type == "post" && references(*[_type == "category" && slug.current == $slug]._id)])
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
  *[_type == "post" && defined(fullPath)] | order(date desc) [$start...$end] {
    fullPath,
    date
  }
`

export const getSitemapPostsCountQuery = groq`
  count(*[_type == "post" && defined(fullPath)])
`

export const getRssFeedPostsQuery = groq`
  *[_type == "post"] | order(date desc) [0...50] {
    title,
    fullPath,
    date,
    excerpt,
    "category": categories[0]-> { name }
  }
`
