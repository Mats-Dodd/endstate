import { Color } from '@tiptap/extension-color'
import ListItem from '@tiptap/extension-list-item'
import TextStyle from '@tiptap/extension-text-style'
import StarterKit from '@tiptap/starter-kit'
import { AIServiceConfig } from '../services/ai/types'

export const EDITOR_EXTENSIONS = [
  Color,
  TextStyle,
  ListItem,
  StarterKit.configure({
    bulletList: {
      keepMarks: true,
      keepAttributes: false,
    },
    orderedList: {
      keepMarks: true,
      keepAttributes: false,
    },
  }),
]

export const INITIAL_CONTENT = `
<p>
  What will you write?
</p>
`

export const AI_CONFIG: AIServiceConfig = {
  model: 'mistral-nemo',
  options: {
    model: 'mistral-nemo',
    temperature: 0.3,
    top_k: 40,
    num_predict: 50,
    stop: ['\n'],
  }
} 