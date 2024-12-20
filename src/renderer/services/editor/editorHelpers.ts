import { Editor as TiptapEditor } from '@tiptap/core'
import { EditorHelpers } from './types'

export const createEditorHelpers = (): EditorHelpers => ({

    
  getActiveSentenceAndTypedText: (editor: TiptapEditor) => {
    const { from } = editor.state.selection
    const docText = editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n', ' ')

    const sentenceEndings = /[.!?]/
    let sentenceStart = from
    let sentenceEnd = from

    while (sentenceStart > 0) {
      if (sentenceEndings.test(docText[sentenceStart - 1])) {
        sentenceStart++
        break
      }
      sentenceStart--
    }

    while (sentenceEnd < docText.length) {
      if (sentenceEndings.test(docText[sentenceEnd])) {
        sentenceEnd++
        break
      }
      sentenceEnd++
    }

    const activeSentence = docText.slice(sentenceStart, sentenceEnd).trim()
    const typedInSentence = docText.slice(sentenceStart, from).replace(/\s+/g, ' ')

    return { activeSentence, typedInSentence }
  },

  getPreviousSentence: (editor: TiptapEditor, currentSentenceStart: number): string => {
    const docText = editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n', ' ')
    const sentenceEndings = /[.!?]/
    let previousSentenceEnd = currentSentenceStart

    while (previousSentenceEnd > 0) {
      previousSentenceEnd--
      if (sentenceEndings.test(docText[previousSentenceEnd])) {
        break
      }
    }
    if (previousSentenceEnd <= 0) {
      return ''
    }
    let previousSentenceStart = previousSentenceEnd
    while (previousSentenceStart > 0) {
      previousSentenceStart--
      if (sentenceEndings.test(docText[previousSentenceStart])) {
        previousSentenceStart++
        break
      }
    }

    return docText.slice(previousSentenceStart, previousSentenceEnd + 1).trim()
  }
}) 