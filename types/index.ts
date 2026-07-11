export interface SanityImageAsset {
  _ref: string
  _type: 'reference'
}

export interface SanityImage {
  asset: SanityImageAsset
  alt?: string
  caption?: string
}

export interface CategoryRef {
  _id: string
  name: string
  slug: string
  parent?: {
    name: string
    slug: string
  }
}

export interface TagRef {
  _id: string
  name: string
  slug: string
}

export interface PostCard {
  _id: string
  title: string
  slug: string
  fullPath: string
  date: string
  excerpt?: string
  featuredImage?: SanityImage
  categories?: CategoryRef[]
}

export interface PostFull extends PostCard {
  content: string
  seoTitle?: string
  seoDescription?: string
  tags?: TagRef[]
  updatedAt?: string
  aiGenerated?: boolean
  redirectTo?: string
  originalTitle?: string
  originalPath?: string
}

export interface Category {
  _id: string
  name: string
  slug: string
  description?: string
  parent?: {
    name: string
    slug: string
  }
}
