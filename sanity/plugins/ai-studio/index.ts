import { definePlugin } from 'sanity'
import { RobotIcon } from '@sanity/icons'
import { AIStudioTool } from './AIStudioTool'

export const aiStudioPlugin = definePlugin({
  name: 'ai-studio',
  tools: [
    {
      name: 'ai-generator',
      title: 'AI Generator',
      icon: RobotIcon,
      component: AIStudioTool,
    },
  ],
})
