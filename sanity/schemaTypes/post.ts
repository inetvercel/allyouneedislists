import { defineField, defineType } from 'sanity'

export const post = defineType({
  name: 'post',
  title: 'Post',
  type: 'document',
  orderings: [
    {
      title: 'Oldest First (default)',
      name: 'dateAsc',
      by: [{ field: 'date', direction: 'asc' }],
    },
    {
      title: 'Newest First',
      name: 'dateDesc',
      by: [{ field: 'date', direction: 'desc' }],
    },
    {
      title: 'Title A–Z',
      name: 'titleAsc',
      by: [{ field: 'title', direction: 'asc' }],
    },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title' },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'fullPath',
      title: 'Full URL Path',
      description: 'Exact WordPress URL path e.g. /lifestyle/travel-leisure/top-5-hotels/',
      type: 'string',
    }),
    defineField({
      name: 'date',
      title: 'Published Date',
      type: 'datetime',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'featuredImage',
      title: 'Featured Image',
      type: 'image',
      options: { hotspot: true },
      fields: [
        defineField({ name: 'alt', title: 'Alt Text', type: 'string' }),
        defineField({ name: 'caption', title: 'Caption', type: 'string' }),
      ],
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'content',
      title: 'Content (HTML)',
      type: 'text',
      rows: 20,
    }),
    defineField({
      name: 'categories',
      title: 'Categories',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'category' }] }],
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'tag' }] }],
    }),
    defineField({
      name: 'seoTitle',
      title: 'SEO Title',
      type: 'string',
    }),
    defineField({
      name: 'seoDescription',
      title: 'SEO Description',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'updatedAt',
      title: 'Last Updated',
      description: 'Set this when you refresh/update the post content. Shown as a freshness badge and used for SEO dateModified.',
      type: 'datetime',
    }),
    defineField({
      name: 'redirectTo',
      title: 'Redirect To',
      description: 'If set, this post is a redirect stub. Visitors will be sent here with a 301.',
      type: 'string',
    }),
    defineField({
      name: 'aiGenerated',
      title: 'AI Generated',
      type: 'boolean',
      initialValue: false,
      description: 'Mark if this post was generated via the AI pipeline.',
    }),
    defineField({
      name: 'originalTitle',
      title: 'Original Title (before refresh)',
      type: 'string',
      readOnly: true,
      description: 'The old WP post title this article replaced.',
    }),
    defineField({
      name: 'originalPath',
      title: 'Original Path (before refresh)',
      type: 'string',
      readOnly: true,
      description: 'The old WP URL path this article replaced.',
    }),
    defineField({
      name: 'wpId',
      title: 'WordPress ID',
      type: 'number',
      readOnly: true,
    }),
    defineField({
      name: 'wpFeaturedMediaId',
      title: 'WordPress Featured Media ID',
      type: 'number',
      readOnly: true,
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'date',
      media: 'featuredImage',
    },
    prepare({ title, subtitle, media }) {
      return {
        title,
        subtitle: subtitle ? new Date(subtitle).toLocaleDateString() : '',
        media,
      }
    },
  },
})
