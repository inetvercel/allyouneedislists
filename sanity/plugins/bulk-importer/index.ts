import { definePlugin } from 'sanity'
import { UploadIcon } from '@sanity/icons'
import { BulkImporterTool } from './BulkImporterTool'

export const bulkImporterPlugin = definePlugin({
  name: 'bulk-importer',
  tools: [
    {
      name: 'bulk-importer',
      title: 'Bulk Importer',
      icon: UploadIcon,
      component: BulkImporterTool,
    },
  ],
})
