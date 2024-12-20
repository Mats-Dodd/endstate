import React, { useEffect } from 'react'
import { EditorProvider } from '@tiptap/react'
import MenuBar from '../MenuBar'
import { ErrorOverlay } from './ErrorOverlay'
import { extensions } from '../../extensions'
import { INITIAL_CONTENT } from '../../constants/editor'
import { useEditorState } from '../../hooks/useEditorState'
import { useEditorEvents } from '../../hooks/useEditorEvents'
import { useAIPrediction } from '../../hooks/useAIPrediction'
import { createEditorHelpers } from '../../services/editor/editorHelpers'

export const Editor = () => {
  const {
    prediction,
    setPrediction,
    error,
    setError,
    editorRef,
    timeoutRef
  } = useEditorState()

  const editorHelpers = createEditorHelpers()
  const getPrediction = useAIPrediction(setPrediction, setError, editorHelpers)
  const { handleKeyDown } = useEditorEvents(prediction, setPrediction, editorRef)

  useEffect(() => {
    const clearPrediction = () => {
      setPrediction('')
      ;(window as any).currentPrediction = ''
    }

    window.addEventListener('clearPrediction', clearPrediction)
    return () => window.removeEventListener('clearPrediction', clearPrediction)
  }, [setPrediction])

  const handleUpdate = ({ editor }: { editor: any }) => {
    editorRef.current = editor
    const state = editor.state
    const { from } = state.selection

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    if (editor.state.tr.docChanged) {
      setPrediction('')
      ;(window as any).currentPrediction = ''
      return
    }

    const docSize = state.doc.content.size
    const startPos = Math.max(0, from - 1000)
    const endPos = Math.min(docSize, from + 1000)
    const contextText = state.doc.textBetween(startPos, endPos, '\n', ' ')
    const cursorPosition = from - startPos

    if (!contextText || contextText.length < 5) {
      setPrediction('')
      ;(window as any).currentPrediction = ''
      return
    }

    timeoutRef.current = setTimeout(() => {
      const contextWithCursor = 
        contextText.slice(0, cursorPosition) + '<CURSOR>' + contextText.slice(cursorPosition)
      getPrediction(contextWithCursor, editor)
    }, 500)
  }

  return (
    <div className="editor-wrapper">
      <EditorProvider 
        slotBefore={<MenuBar />} 
        extensions={extensions} 
        content={INITIAL_CONTENT}
        onUpdate={handleUpdate}
        editorProps={{
          handleKeyDown,
        }}
      >
        <ErrorOverlay error={error} />
      </EditorProvider>
    </div>
  )
}

export default Editor 