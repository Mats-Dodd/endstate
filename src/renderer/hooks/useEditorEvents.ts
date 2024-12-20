import { useCallback } from 'react'
import { EditorView } from 'prosemirror-view'
import { Editor as TiptapEditor } from '@tiptap/core'
import { createEditorHelpers } from '../services/editor/editorHelpers'

export const useEditorEvents = (
  prediction: string,
  setPrediction: (pred: string) => void,
  editorRef: React.RefObject<TiptapEditor>
) => {
  const { getActiveSentenceAndTypedText } = createEditorHelpers()

  const handleKeyDown = useCallback(
    (view: EditorView, event: KeyboardEvent) => {
      if (event.key === 'Tab' && prediction && editorRef.current) {
        event.preventDefault()
        const editor = editorRef.current
        
        const { typedInSentence, activeSentence } = getActiveSentenceAndTypedText(editor)
        
        let typed = typedInSentence.replace(/\s+/g, ' ')
        let predicted = prediction.replace(/\s+/g, ' ')

        const activeSentenceLastWord = activeSentence.split(' ').pop()
        const predictedFirstWord = predicted.split(' ')[0]

        if (activeSentenceLastWord && predictedFirstWord && 
            activeSentenceLastWord.toLowerCase() === predictedFirstWord.toLowerCase().slice(0, activeSentenceLastWord.length)) {
          const newRemainder = predicted.slice(activeSentenceLastWord.length)
          const remainder = newRemainder.trimStart()
        
          editor.commands.command(({ tr }) => {
            tr.insertText(remainder, tr.selection.from)
            return true
          })
        
          setPrediction('')
          ;(window as any).currentPrediction = ''
          return true
        }

        const typedEndsWithSpace = typed.endsWith(' ')
        const predictedStartsWithSpace = predicted.startsWith(' ')

        const typedWords = typed.trim().split(/\s+/)
        const lastTypedWord = typedWords[typedWords.length - 1] || ''
        const predictedWords = predicted.trim().split(/\s+/)
        const firstPredictedWord = predictedWords[0] || ''

        const typedEndsWithLetter = /[a-zA-Z]$/.test(lastTypedWord)
        const predictedStartsWithLetter = /^[a-zA-Z]/.test(firstPredictedWord)

        if (typedEndsWithLetter && predictedStartsWithLetter) {
          predicted = predictedWords.slice(1).join(' ')
          predicted = firstPredictedWord + (predicted ? ' ' + predicted : '')
        } else if (typedEndsWithSpace && predictedStartsWithSpace) {
          predicted = predicted.replace(/^ +/, '')
        } else if (!typedEndsWithSpace && !predictedStartsWithSpace) {
          predicted = ' ' + predicted
        }

        editor.commands.command(({ tr }) => {
          tr.insertText(predicted, tr.selection.from)
          return true
        })

        setPrediction('')
        ;(window as any).currentPrediction = ''
        return true
      }
      return false
    },
    [prediction, setPrediction, editorRef]
  )

  return { handleKeyDown }
} 