import { Editor as TiptapEditor } from '@tiptap/core'
import { EditorHelpers } from './types'

export const createEditorHelpers = (): EditorHelpers => ({

  getDocText: (editor: TiptapEditor) => {
    return editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n', ' ')
  },

  getActiveSentance: (editor: TiptapEditor) => {
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

    const activeSentence = docText.slice(sentenceStart, sentenceEnd)

    return activeSentence
  },

  getPreviousSentence: (editor: TiptapEditor): string => {

    const { from } = editor.state.selection
    let sentenceStart = from
    const docText = editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n', ' ')
    const sentenceEndings = /[.!?]/

    while (sentenceStart > 0) {
        if (sentenceEndings.test(docText[sentenceStart - 1])) {
          sentenceStart++
          break
        }
        sentenceStart--
      }
    while (sentenceStart > 0) {
      sentenceStart--
      if (sentenceEndings.test(docText[sentenceStart])) {
        break
      }
    }
    if (sentenceStart <= 0) {
      return ''
    }
    let previousSentenceStart = sentenceStart
    while (previousSentenceStart > 0) {
      previousSentenceStart--
      if (sentenceEndings.test(docText[previousSentenceStart])) {
        previousSentenceStart++
        break
      }
    }
    return docText.slice(previousSentenceStart, sentenceStart + 1).trim()
  }
}) 
