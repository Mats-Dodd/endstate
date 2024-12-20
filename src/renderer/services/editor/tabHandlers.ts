import { Editor as TiptapEditor } from '@tiptap/core'
import { createEditorHelpers } from './editorHelpers'

interface TabHandlerParams {
  editor: TiptapEditor
  prediction: string
  setPrediction: (pred: string) => void
}


interface SpacingAdjustmentParams {
  activeSentanceLastWord: string
  predictedFirstWord: string
  predicted: string
  predictedWords: string[]
  activeSentanceEndsWithSpace: boolean
  predictedStartsWithSpace: boolean
}


const predictionHandler = {
  insertTextAndClear: (
    editor: TiptapEditor,
    text: string,
    setPrediction: (pred: string) => void
  ): boolean => {

    editor.commands.command(({ tr }) => {
      tr.insertText(text, tr.selection.from)
      return true
    })
    setPrediction('')
    ;(window as any).currentPrediction = ''
    return true
  },

  deleteText: (editor: TiptapEditor, text: string): boolean => {
    editor.commands.command(({ tr }) => {
      tr.delete(tr.selection.from, tr.selection.to)
      return true
    })
    return true
  },


  adjustSpacing: ({
    activeSentanceLastWord,
    predictedFirstWord,
    predicted,
    predictedWords,
    activeSentanceEndsWithSpace,
    predictedStartsWithSpace
  }: SpacingAdjustmentParams): string => {

    const typedEndsWithLetter = /[a-zA-Z]$/.test(activeSentanceLastWord)
    const predictedStartsWithLetter = /^[a-zA-Z]/.test(predictedFirstWord)

    if (typedEndsWithLetter && predictedStartsWithLetter) {
      predicted = predictedWords.slice(1).join(' ')
      predicted = predictedFirstWord + (predicted ? ' ' + predicted : '')
    } else if (activeSentanceEndsWithSpace && predictedStartsWithSpace) {
      predicted = predicted.replace(/^ +/, '')
    } else if (!activeSentanceEndsWithSpace && !predictedStartsWithSpace) {
      predicted = ' ' + predicted
    }

    return predicted
  },

  handleSpacingAndInsertion: ({
    editor,
    prediction,
    setPrediction
  }: TabHandlerParams): boolean => {
    const { getActiveSentance } = createEditorHelpers()
    const activeSentence = getActiveSentance(editor).replace(/\s+/g, ' ')
    let predicted = prediction.replace(/\s+/g, ' ')

    const activeSentanceEndsWithSpace = activeSentence.endsWith(' ')
    const predictedStartsWithSpace = predicted.startsWith(' ')

    const typedWords = activeSentence.trim().split(/\s+/)
    const lastTypedWord = typedWords[typedWords.length - 1] || ''
    const predictedWords = predicted.trim().split(/\s+/)
    const firstPredictedWord = predictedWords[0] || ''

    predicted = predictionHandler.adjustSpacing({
      activeSentanceLastWord: lastTypedWord,
      predictedFirstWord: firstPredictedWord,
      predicted,
      predictedWords,
      activeSentanceEndsWithSpace,
      predictedStartsWithSpace
    })

    return predictionHandler.insertTextAndClear(editor, predicted, setPrediction)
  },
  

  handleAutocompleteAdjustment: ({
    editor,
    prediction,
    setPrediction
  }: TabHandlerParams): boolean => { 

    return predictionHandler.handleSpacingAndInsertion({ editor, prediction: prediction, setPrediction })
  }
}



export const handleTabKey = (
  editor: TiptapEditor,
  prediction: string,
  setPrediction: (pred: string) => void
): boolean => {
  return predictionHandler.handleAutocompleteAdjustment({ editor, prediction, setPrediction })
}