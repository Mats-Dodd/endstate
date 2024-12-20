import { useCallback } from 'react'
import ollama from 'ollama'
import { createPrompt } from '../services/ai/promptBuilder'
import { longestCommonOverlap } from '../utils/overlap'
import { EditorHelpers } from '../services/editor/types'
import { AUTO_COMPLETION_MODEL } from '../constants/editor'

export const useAIPrediction = (
  setPrediction: (pred: string) => void,
  setError: (err: string | null) => void,
  editorHelpers: EditorHelpers
) => {
  const getPrediction = useCallback(async (contextText: string, editor: any) => {
    const model = AUTO_COMPLETION_MODEL.model
    if (!editor) return
    
    const activeSentence = editorHelpers.getActiveSentance(editor)

    const previousSentence = editorHelpers.getPreviousSentence(editor)

    try {
      setError(null)
      const prompt = createPrompt(contextText)
      console.log('PROMPT', prompt)
      const response = await ollama.generate({
        model: model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.3,
          top_k: 30,
          num_predict: 20,
          stop: ['.', '!', '?', '\n'],
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