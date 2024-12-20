import { Color } from '@tiptap/extension-color'
import ListItem from '@tiptap/extension-list-item'
import TextStyle from '@tiptap/extension-text-style'
import StarterKit from '@tiptap/starter-kit'
import { AutoCompletionConfig } from '../services/ai/types'

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

export const AUTO_COMPLETION_MODEL: AutoCompletionConfig = {
  model: 'phi3:3.8b'
}