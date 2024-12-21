import { Editor as TiptapEditor } from '@tiptap/core'
import { createEditorHelpers } from './editorHelpers'

interface TabHandlerParams {
  editor: TiptapEditor
  prediction: string
  setPrediction: (pred: string) => void
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

  deleteText: (editor: TiptapEditor, indices: [number, number]): boolean => {
    editor.commands.command(({ tr }) => {
      
      tr.delete(indices[0], indices[1])
      return true
    })
    return true
  },

  handleSpacing: ({
    editor,
    prediction,
    setPrediction
  }: TabHandlerParams): boolean => {
    const { getActiveSentance } = createEditorHelpers()
    const activeSentence = getActiveSentance(editor)
    

    const activeSentanceEndsWithSpace = activeSentence.endsWith(' ')
    const predictedStartsWithSpace = prediction.startsWith(' ')
    console.log('ACTIVE_SENTENCE_ENDS_WITH_SPACE', activeSentanceEndsWithSpace)
    console.log('PREDICTED_STARTS_WITH_SPACE', predictedStartsWithSpace)

    if (activeSentanceEndsWithSpace && predictedStartsWithSpace) {
        prediction = prediction.replace(/^ +/, '')
    }
    

    return predictionHandler.insertTextAndClear(editor, prediction, setPrediction)
  },
  

  handleAutocompleteAdjustment: ({
    editor,
    prediction,
    setPrediction
  }: TabHandlerParams): boolean => { 
      
    return predictionHandler.handleSpacing({ editor, prediction: prediction, setPrediction })
  }
}



export const handleTabKey = (
  editor: TiptapEditor,
  prediction: string,
  setPrediction: (pred: string) => void
): boolean => {
  return predictionHandler.handleAutocompleteAdjustment({ editor, prediction, setPrediction })
}