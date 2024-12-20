import { useCallback } from 'react'
import ollama from 'ollama'
import { createPrompt } from '../services/ai/promptBuilder'
import { longestCommonOverlap } from '../utils/overlap'
import { EditorHelpers } from '../services/editor/types'

export const useAIPrediction = (
  setPrediction: (pred: string) => void,
  setError: (err: string | null) => void,
  editorHelpers: EditorHelpers
) => {
  const getPrediction = useCallback(async (contextText: string, editor: any) => {
    const model = 'mistral-nemo'
    if (!editor) return
    
    const { typedInSentence, activeSentence } = editorHelpers.getActiveSentenceAndTypedText(editor)
    
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

    const previousSentence = editorHelpers.getPreviousSentence(editor, sentenceStart)

    try {
      setError(null)
      const prompt = createPrompt(contextText)
    //   console.log('PROMPT', prompt)
      const response = await ollama.generate({
        model: model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.3,
          top_k: 40,
          num_predict: 50,
          stop: ['\n'],
        }
      })

      if (response.response) {
        const newPrediction = response.response.trim().replace(/^"|"$/g, '')
        // console.log('NEW_PREDICTION', newPrediction)
        if (newPrediction.toLowerCase() === activeSentence.toLowerCase() ||
            newPrediction.toLowerCase() === previousSentence.toLowerCase()) {
          setPrediction('')
          ;(window as any).currentPrediction = ''
          return
        }
        
        const remainder = longestCommonOverlap(activeSentence, newPrediction)
        // console.log('REMAINDER', remainder)

        if (remainder.length > 0) {
          setPrediction(remainder)
          ;(window as any).currentPrediction = remainder
        } else {
          setPrediction(newPrediction)
          ;(window as any).currentPrediction = newPrediction
        }
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(`Error: ${err.message}. Make sure Ollama is running and a model is installed.`)
      } else {
        setError('An unknown error occurred')
      }
      setPrediction('')
      ;(window as any).currentPrediction = ''
    }
  }, [setPrediction, setError, editorHelpers])

  return getPrediction
} 