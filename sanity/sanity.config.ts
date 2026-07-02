import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { schemaTypes } from './schemaTypes'

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET!

export default defineConfig({
  basePath: '/studio',
  projectId,
  dataset,
  title: 'All You Need Is Lists',
  schema: {
    types: schemaTypes,
  },
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Content')
          .items([
            S.listItem()
              .title('Posts')
              .child(
                S.documentList()
                  .title('Posts')
                  .filter('_type == "post"')
                  .defaultOrdering([{ field: 'date', direction: 'desc' }]),
              ),
            S.listItem()
              .title('Categories')
              .child(S.documentList().title('Categories').filter('_type == "category"')),
            S.listItem()
              .title('Tags')
              .child(S.documentList().title('Tags').filter('_type == "tag"')),
          ]),
    }),
    visionTool(),
  ],
})
