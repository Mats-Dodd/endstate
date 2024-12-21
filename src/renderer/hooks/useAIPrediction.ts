import { useCallback } from 'react'
import ollama from 'ollama'
import { createPrompt } from '../services/ai/promptBuilder'
import { EditorHelpers } from '../services/editor/types'
import { AUTO_COMPLETION_MODEL } from '../constants/editor'
import { handlePredictionResponse, handlePredictionError } from '../services/ai/predictionHandlers'

export const useAIPrediction = (
  setPrediction: (pred: string) => void,
  setError: (err: string | null) => void,
  editorHelpers: EditorHelpers
) => {
  const getPrediction = useCallback(async (contextText: string, editor: any) => {
    if (!editor) return
    
    const activeSentence = editorHelpers.getActiveSentance(editor)
    const previousSentence = editorHelpers.getPreviousSentence(editor)

    try {
      setError(null)
      const prompt = createPrompt(contextText)
      // console.log('PROMPT', prompt)
      
      const response = await ollama.generate({
        model: AUTO_COMPLETION_MODEL.model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.3,
          top_k: 30,
          num_predict: 10,
          stop: ['.', '!', '?', '\n'],
        }
      })

      if (response.response) {
        handlePredictionResponse(response, activeSentence, previousSentence, setPrediction)
      }
    } catch (err) {
      handlePredictionError(err, setPrediction, setError)
    }
  }, [setPrediction, setError, editorHelpers])

  return getPrediction
} 