import { useState, useRef } from 'react'
import { Editor as TiptapEditor } from '@tiptap/core'

export const useEditorState = () => {
  const [prediction, setPrediction] = useState('')
  const [error, setError] = useState<string | null>(null)
  const editorRef = useRef<TiptapEditor | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout>()

  return {
    prediction,
    setPrediction,
    error,
    setError,
    editorRef,
    timeoutRef
  }
} 