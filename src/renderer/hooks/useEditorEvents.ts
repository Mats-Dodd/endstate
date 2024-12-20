import { useCallback } from 'react'
import { EditorView } from 'prosemirror-view'
import { Editor as TiptapEditor } from '@tiptap/core'
import { handleTabKey } from '../services/editor/tabHandlers'

export const useEditorEvents = (
  prediction: string,
  setPrediction: (pred: string) => void,
  editorRef: React.RefObject<TiptapEditor>
) => {
  const handleKeyDown = useCallback(
    (view: EditorView, event: KeyboardEvent) => {
      if (event.key === 'Tab' && prediction && editorRef.current) {
        event.preventDefault()
        return handleTabKey(editorRef.current, prediction, setPrediction)
      }
      return false
    },
    [prediction, setPrediction, editorRef]
  )

  return { handleKeyDown }
} 